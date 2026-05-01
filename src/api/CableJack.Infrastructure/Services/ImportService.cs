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

            // Cache existing data for the duration of the import
            var categories = await db.Categories.ToDictionaryAsync(c => c.Name, StringComparer.OrdinalIgnoreCase);
            var channelsByTvgId = await db.Channels
                .Where(c => c.TvgId != null && c.TvgId != string.Empty)
                .ToDictionaryAsync(c => c.TvgId!, StringComparer.OrdinalIgnoreCase);
            var channelsByName = await db.Channels
                .ToDictionaryAsync(c => NormalizeName(c.Name), StringComparer.OrdinalIgnoreCase);

            // Track existing ChannelSource URLs for this provider to detect duplicates
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

                if (string.IsNullOrWhiteSpace(name))
                {
                    result.Errors.Add($"Line {i + 1}: could not parse channel name.");
                    continue;
                }

                // Resolve or create category
                if (!categories.TryGetValue(groupTitle, out var category))
                {
                    category = new Category
                    {
                        Id = 0,
                        Name = groupTitle,
                        SortOrder = categories.Count,
                    };
                    db.Categories.Add(category);
                    await db.SaveChangesAsync();
                    categories[groupTitle] = category;
                    result.CategoriesCreated++;
                }

                // Match existing channel: TvgId first, then normalized name
                Channel? channel = null;
                var matchedByTvgId = tvgId is not null && channelsByTvgId.TryGetValue(tvgId, out channel);
                if (!matchedByTvgId)
                    channelsByName.TryGetValue(NormalizeName(name), out channel);

                if (channel is not null)
                {
                    // Update channel metadata from the import
                    channel.Name = name;
                    channel.LogoUrl = logoUrl;
                    channel.CategoryId = category.Id;
                    if (tvgId is not null) channel.TvgId = tvgId;
                    result.ChannelsUpdated++;
                }
                else
                {
                    // New channel — create the logical channel record
                    channel = new Channel
                    {
                        Id = 0,
                        Name = name,
                        TvgId = tvgId,
                        LogoUrl = logoUrl,
                        CategoryId = category.Id,
                        IsActive = true,
                        SortOrder = channelsByName.Count,
                        HasSources = false,
                    };
                    db.Channels.Add(channel);
                    await db.SaveChangesAsync();

                    if (tvgId is not null && tvgId.Length > 0) channelsByTvgId[tvgId] = channel;
                    channelsByName[NormalizeName(name)] = channel;
                    result.ChannelsCreated++;
                }

                // Mark the channel as having sources once a source is linked
                if (providerId.HasValue && !channel.HasSources)
                    channel.HasSources = true;

                // Link the provider source URL to this channel
                if (providerId.HasValue)
                {
                    if (existingSourceUrls.Contains(url))
                    {
                        if (skipExisting)
                        {
                            result.ChannelsSkipped++;
                            continue;
                        }

                        // Re-link the existing source to the matched channel (handles channel merges)
                        var existing = await db.ChannelSources
                            .FirstOrDefaultAsync(cs => cs.ProviderId == providerId.Value && cs.SourceUrl == url);
                        if (existing is not null)
                            existing.ChannelId = channel.Id;

                        result.SourcesLinked++;
                    }
                    else
                    {
                        db.ChannelSources.Add(new ChannelSource
                        {
                            Id = 0,
                            ChannelId = channel.Id,
                            ProviderId = providerId.Value,
                            SourceUrl = url,
                            Priority = 1,
                        });
                        existingSourceUrls.Add(url);
                        result.SourcesLinked++;
                    }
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

        private static string NormalizeName(string name)
        {
            // Strip common quality suffixes so "BBC ONE HD" matches "BBC One"
            var normalized = Regex.Replace(name, @"\s+(HD|FHD|4K|SD|UHD|FHD)\s*$", string.Empty, RegexOptions.IgnoreCase);
            return normalized.Trim().ToLowerInvariant();
        }
    }
}
