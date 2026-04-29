using System.Xml.Linq;
using CableJack.Core.DTOs;
using CableJack.Core.Interfaces;
using CableJack.Core.Models;
using CableJack.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CableJack.Infrastructure.Services
{
    public sealed class EpgService(CableJackDbContext db) : IEpgService
    {
        public async Task<List<ProgrammeResponse>> GetProgrammesAsync(int channelId, DateTime? from = null, DateTime? to = null)
        {
            var now = DateTime.UtcNow;
            from ??= now;
            to ??= now.AddHours(24);

            return await db.Programmes
                .Include(p => p.Channel)
                .Where(p => p.ChannelId == channelId && p.EndTime > from && p.StartTime < to)
                .OrderBy(p => p.StartTime)
                .Select(p => ToResponse(p))
                .ToListAsync();
        }

        public async Task<ProgrammeResponse?> GetNowPlayingAsync(int channelId)
        {
            var now = DateTime.UtcNow;
            return await db.Programmes
                .Include(p => p.Channel)
                .Where(p => p.ChannelId == channelId && p.StartTime <= now && p.EndTime > now)
                .Select(p => ToResponse(p))
                .FirstOrDefaultAsync();
        }

        public async Task<List<ProgrammeResponse>> GetAllNowPlayingAsync()
        {
            var now = DateTime.UtcNow;
            return await db.Programmes
                .Include(p => p.Channel)
                .Where(p => p.StartTime <= now && p.EndTime > now)
                .OrderBy(p => p.Channel.SortOrder)
                .Select(p => ToResponse(p))
                .ToListAsync();
        }

        public async Task<ImportResult> ImportXmltvAsync(System.IO.Stream stream)
        {
            var result = new ImportResult
            {
                ChannelsCreated = 0,
                ChannelsUpdated = 0,
                ChannelsSkipped = 0,
                CategoriesCreated = 0,
                Errors = [],
            };

            XDocument doc;
            try
            {
                doc = await XDocument.LoadAsync(stream, LoadOptions.None, CancellationToken.None);
            }
            catch (Exception ex)
            {
                result.Errors.Add($"Failed to parse XMLTV: {ex.Message}");
                return result;
            }

            var channels = await db.Channels.ToListAsync();
            // Primary lookup by tvg-id, fallback to name — keep first match on duplicates
            var channelMapByTvgId = channels
                .Where(c => !string.IsNullOrEmpty(c.TvgId))
                .GroupBy(c => c.TvgId!, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);
            var channelMapByName = channels
                .GroupBy(c => c.Name, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

            var programmesToAdd = new List<Programme>();

            foreach (var element in doc.Descendants("programme"))
            {
                var channelAttr = element.Attribute("channel")?.Value;
                var startAttr = element.Attribute("start")?.Value;
                var stopAttr = element.Attribute("stop")?.Value;
                var title = element.Element("title")?.Value;

                if (channelAttr is null || startAttr is null || stopAttr is null || title is null)
                {
                    result.Errors.Add("Skipped programme entry with missing required attributes.");
                    continue;
                }

                if (!channelMapByTvgId.TryGetValue(channelAttr, out var channel) &&
                    !channelMapByName.TryGetValue(channelAttr, out channel))
                {
                    result.Errors.Add($"No channel found matching '{channelAttr}' — skipped.");
                    continue;
                }

                if (!TryParseXmltvDateTime(startAttr, out var startTime) ||
                    !TryParseXmltvDateTime(stopAttr, out var endTime))
                {
                    result.Errors.Add($"Could not parse times for '{title}' — skipped.");
                    continue;
                }

                programmesToAdd.Add(new Programme
                {
                    Id = 0,
                    ChannelId = channel.Id,
                    Title = title,
                    Description = element.Element("desc")?.Value,
                    StartTime = startTime,
                    EndTime = endTime,
                });
            }

            if (programmesToAdd.Count > 0)
            {
                // Replace existing programmes in the time window covered by this import
                var minStart = programmesToAdd.Min(p => p.StartTime);
                var maxEnd = programmesToAdd.Max(p => p.EndTime);
                var affectedChannelIds = programmesToAdd.Select(p => p.ChannelId).Distinct().ToHashSet();

                await db.Programmes
                    .Where(p => affectedChannelIds.Contains(p.ChannelId) &&
                                p.StartTime >= minStart && p.EndTime <= maxEnd)
                    .ExecuteDeleteAsync();

                db.Programmes.AddRange(programmesToAdd);
                await db.SaveChangesAsync();
            }

            result.ChannelsUpdated = programmesToAdd.Select(p => p.ChannelId).Distinct().Count();
            return result;
        }

        public async Task<int> DeleteAllAsync()
        {
            return await db.Programmes.ExecuteDeleteAsync();
        }

        private static bool TryParseXmltvDateTime(string value, out DateTime result)
        {
            result = default;
            var parts = value.Trim().Split(' ');

            if (!DateTime.TryParseExact(parts[0], "yyyyMMddHHmmss",
                System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None,
                out var dt))
                return false;

            // Parse timezone offset (+0500, -0500) and subtract to get UTC
            var offset = TimeSpan.Zero;
            if (parts.Length > 1 && parts[1].Length >= 5 &&
                int.TryParse(parts[1][1..3], out var hours) &&
                int.TryParse(parts[1][3..5], out var minutes))
            {
                var sign = parts[1][0] == '-' ? -1 : 1;
                offset = new TimeSpan(sign * hours, sign * minutes, 0);
            }

            result = DateTime.SpecifyKind(dt - offset, DateTimeKind.Utc);
            return true;
        }

        private static ProgrammeResponse ToResponse(Programme p) => new()
        {
            Id = p.Id,
            ChannelId = p.ChannelId,
            ChannelName = p.Channel.Name,
            Title = p.Title,
            Description = p.Description,
            StartTime = p.StartTime,
            EndTime = p.EndTime,
        };
    }
}
