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
        public async Task<ImportResult> ImportM3UAsync(Stream stream, int? providerId = null)
        {
            var lines = await ReadLinesAsync(stream);
            var result = new ImportResult
            {
                ChannelsCreated = 0,
                ChannelsUpdated = 0,
                CategoriesCreated = 0,
                Errors = [],
            };

            // Cache existing categories and channels for the duration of the import
            var categories = await db.Categories.ToDictionaryAsync(c => c.Name, StringComparer.OrdinalIgnoreCase);
            var channels = await db.Channels.ToDictionaryAsync(c => c.SourceUrl);

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

                // Create or update channel matched by SourceUrl
                if (channels.TryGetValue(url, out var existing))
                {
                    existing.Name = name;
                    existing.TvgId = tvgId;
                    existing.LogoUrl = logoUrl;
                    existing.CategoryId = category.Id;
                    existing.ProviderId = providerId;
                    result.ChannelsUpdated++;
                }
                else
                {
                    var channel = new Channel
                    {
                        Id = 0,
                        Name = name,
                        TvgId = tvgId,
                        SourceUrl = url,
                        LogoUrl = logoUrl,
                        CategoryId = category.Id,
                        ProviderId = providerId,
                        IsActive = true,
                        SortOrder = channels.Count,
                    };
                    db.Channels.Add(channel);
                    channels[url] = channel;
                    result.ChannelsCreated++;
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
