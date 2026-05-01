using System.Text.RegularExpressions;
using CableJack.Core.DTOs;
using CableJack.Core.Interfaces;
using CableJack.Core.Models;
using CableJack.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Stream = System.IO.Stream;

namespace CableJack.Infrastructure.Services
{
    public sealed partial class ImportService(CableJackDbContext db) : IImportService
    {
        public async Task<ImportResult> ImportM3UAsync(Stream stream, int? providerId = null, bool skipExisting = false)
        {
            var lines = await ReadLinesAsync(stream);
            var result = new ImportResult
            {
                ChannelsCreated = 0,
                ChannelsUpdated = 0,
                ChannelsSkipped = 0,
                SourcesLinked = 0,
                CategoriesCreated = 0,
                Errors = [],
            };

            var categories = await db.Categories.ToDictionaryAsync(c => c.Name, StringComparer.OrdinalIgnoreCase);

            // Build channel lookup dictionaries — TryAdd handles any pre-existing duplicates
            var channelsByTvgId = new Dictionary<string, Channel>(StringComparer.OrdinalIgnoreCase);
            var channelsByName = new Dictionary<string, Channel>(StringComparer.OrdinalIgnoreCase);
            foreach (var ch in await db.Channels.ToListAsync())
            {
                if (ch.TvgId is { Length: > 0 })
                    channelsByTvgId.TryAdd(ch.TvgId, ch);
                channelsByName.TryAdd(ch.Name.Trim(), ch);
            }

            var existingSourceUrls = providerId.HasValue
                ? await db.ChannelSources
                    .Where(cs => cs.ProviderId == providerId.Value)
                    .Select(cs => cs.SourceUrl)
                    .ToHashSetAsync()
                : [];

            for (var i = 0; i < lines.Count - 1; i++)
            {
                var line = lines[i].Trim();
                if (!line.StartsWith("#EXTINF")) continue;

                var url = lines[i + 1].Trim();
                if (string.IsNullOrEmpty(url) || url.StartsWith('#'))
                {
                    result.Errors.Add($"Line {i + 1}: missing URL after EXTINF entry.");
                    continue;
                }

                var name = ParseName(line);
                var groupTitle = ParseAttribute(line, "group-title") ?? "Uncategorized";
                var tvgId = ParseAttribute(line, "tvg-id");
                var logoUrl = ParseAttribute(line, "tvg-logo");
                var description = ParseAttribute(line, "tvg-description");

                if (string.IsNullOrWhiteSpace(name))
                {
                    result.Errors.Add($"Line {i + 1}: could not parse channel name.");
                    continue;
                }

                // Resolve or create category — use nav prop so no intermediate save needed
                if (!categories.TryGetValue(groupTitle, out var category))
                {
                    category = new Category
                    {
                        Id = 0,
                        Name = groupTitle,
                        SortOrder = categories.Count,
                    };
                    db.Categories.Add(category);
                    categories[groupTitle] = category;
                    result.CategoriesCreated++;
                }

                // Match existing channel: name first, then fall back to TvgId only when names also agree.
                // TvgId alone is not a unique channel key — multiple distinct channels (e.g. "ABC" and
                // "CA: ABC EAST") can share the same tvg-id because they carry the same broadcast source
                // but represent different offerings. Requiring a name match prevents them from collapsing.
                Channel? channel = null;
                channelsByName.TryGetValue(name.Trim(), out channel);
                if (channel is null && tvgId is { Length: > 0 } && channelsByTvgId.TryGetValue(tvgId, out var tvgMatch))
                {
                    if (string.Equals(tvgMatch.Name.Trim(), name.Trim(), StringComparison.OrdinalIgnoreCase))
                        channel = tvgMatch;
                }

                if (channel is not null)
                {
                    if (logoUrl is { Length: > 0 }) channel.LogoUrl = logoUrl;
                    if (description is { Length: > 0 } && string.IsNullOrEmpty(channel.Description))
                        channel.Description = description;
                    // Note: Do NOT update Name or Category for existing channels — they should be set once and preserved
                    // Only set TvgId if this is a new match (channel didn't have one before)
                    if (tvgId is { Length: > 0 } && string.IsNullOrEmpty(channel.TvgId))
                    {
                        channel.TvgId = tvgId;
                    }

                    // If importing with a provider and channel doesn't have sources yet, mark it as having sources
                    if (providerId.HasValue && !channel.HasSources)
                        channel.HasSources = true;

                    result.ChannelsUpdated++;
                }
                else
                {
                    // New channel — use nav prop for Category so EF handles save ordering
                    channel = new Channel
                    {
                        Id = 0,
                        Name = name,
                        TvgId = tvgId,
                        Description = description,
                        LogoUrl = logoUrl,
                        Category = category,
                        CategoryId = 0,
                        IsActive = true,
                        SortOrder = channelsByName.Count,
                        HasSources = providerId.HasValue, // Set true if importing with a provider
                    };
                    db.Channels.Add(channel);

                    if (tvgId is { Length: > 0 }) channelsByTvgId.TryAdd(tvgId, channel);
                    channelsByName.TryAdd(name.Trim(), channel);
                    result.ChannelsCreated++;
                }

                if (providerId.HasValue)
                {
                    if (existingSourceUrls.Contains(url))
                    {
                        if (skipExisting)
                        {
                            result.ChannelsSkipped++;
                            // Still mark channel as having sources since it exists
                            if (!channel.HasSources)
                                channel.HasSources = true;
                            continue;
                        }

                        // Re-link the existing source to the matched channel
                        var existing = await db.ChannelSources
                            .FirstOrDefaultAsync(cs => cs.ProviderId == providerId.Value && cs.SourceUrl == url);
                        if (existing is not null)
                            existing.Channel = channel;

                        result.SourcesLinked++;
                    }
                    else
                    {
                        // Use Channel nav prop so EF inserts Channel before ChannelSource
                        db.ChannelSources.Add(new ChannelSource
                        {
                            Id = 0,
                            Channel = channel,
                            ChannelId = channel.Id,
                            ProviderId = providerId.Value,
                            SourceUrl = url,
                            Priority = 1,
                        });
                        existingSourceUrls.Add(url);
                        result.SourcesLinked++;
                    }

                    if (!channel.HasSources)
                        channel.HasSources = true;
                }
            }

            await db.SaveChangesAsync();
            return result;
        }

        private static async Task<List<string>> ReadLinesAsync(Stream stream)
        {
            var lines = new List<string>();
            using var reader = new StreamReader(stream);
            while (await reader.ReadLineAsync() is { } line)
                lines.Add(line);
            return lines;
        }

        private static string? ParseAttribute(string extinf, string attribute)
        {
            var match = Regex.Match(extinf, $@"{attribute}=""([^""]*)""");
            return match.Success ? match.Groups[1].Value : null;
        }

        private static string ParseName(string extinf)
        {
            var comma = extinf.LastIndexOf(',');
            return comma >= 0 ? extinf[(comma + 1)..].Trim() : string.Empty;
        }
    }
}
