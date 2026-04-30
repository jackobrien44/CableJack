using CableJack.Core.DTOs;
using CableJack.Core.Enums;
using CableJack.Core.Interfaces;
using CableJack.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CableJack.Infrastructure.Services
{
    public sealed class DashboardService(CableJackDbContext db) : IDashboardService
    {
        public async Task<DashboardStatsDto> GetStatsAsync()
        {
            var cutoff24h = DateTime.UtcNow.AddHours(-24);
            var cutoff7d = DateTime.UtcNow.AddDays(-7);

            var activeStreams = await db.Streams
                .CountAsync(s => s.Status == StreamStatus.Running || s.Status == StreamStatus.Starting);
            var totalUsers = await db.Users.CountAsync();
            var totalChannels = await db.Channels.CountAsync(c => c.IsActive);
            var streamsLast24h = await db.WatchHistory.CountAsync(w => w.StartedAt >= cutoff24h);
            var errorsLast24h = await db.Streams.CountAsync(s => s.Status == StreamStatus.Error && s.StartedAt >= cutoff24h);
            var newUsersLast7d = await db.Users.CountAsync(u => u.CreatedAt >= cutoff7d);

            return new DashboardStatsDto
            {
                ActiveStreams = activeStreams,
                TotalUsers = totalUsers,
                TotalChannels = totalChannels,
                StreamsLast24h = streamsLast24h,
                ErrorsLast24h = errorsLast24h,
                NewUsersLast7d = newUsersLast7d,
            };
        }

        public async Task<List<WatchSessionDto>> GetRecentHistoryAsync(int count = 30)
        {
            return await db.WatchHistory
                .Include(w => w.User)
                .Include(w => w.Channel)
                .OrderByDescending(w => w.StartedAt)
                .Take(count)
                .Select(w => new WatchSessionDto
                {
                    Username = w.User.Username,
                    ChannelName = w.Channel.Name,
                    StartedAt = DateTime.SpecifyKind(w.StartedAt, DateTimeKind.Utc),
                    StoppedAt = w.StoppedAt == null ? (DateTime?)null : DateTime.SpecifyKind(w.StoppedAt.Value, DateTimeKind.Utc),
                })
                .ToListAsync();
        }

        public async Task<List<TopChannelDto>> GetTopChannelsAsync(int count = 10)
        {
            var rows = await db.WatchHistory
                .Include(w => w.Channel)
                .Select(w => new { w.ChannelId, w.Channel.Name, w.StartedAt, w.StoppedAt })
                .ToListAsync();

            return rows
                .GroupBy(w => new { w.ChannelId, w.Name })
                .Select(g => new TopChannelDto
                {
                    ChannelName = g.Key.Name,
                    SessionCount = g.Count(),
                    TotalMinutes = (int)g
                        .Where(w => w.StoppedAt.HasValue)
                        .Sum(w => (w.StoppedAt!.Value - w.StartedAt).TotalMinutes),
                })
                .OrderByDescending(c => c.SessionCount)
                .Take(count)
                .ToList();
        }

        public async Task<List<StreamResponse>> GetErrorStreamsAsync()
        {
            var cutoff24h = DateTime.UtcNow.AddHours(-24);
            return await db.Streams
                .Include(s => s.Channel)
                .Include(s => s.User)
                .Where(s => s.Status == StreamStatus.Error && s.StartedAt >= cutoff24h)
                .OrderByDescending(s => s.StartedAt)
                .Select(s => new StreamResponse
                {
                    Id = s.Id,
                    Url = s.Url,
                    Status = s.Status,
                    ChannelId = s.ChannelId,
                    ChannelName = s.Channel.Name,
                    ChannelLogoUrl = s.Channel.LogoUrl,
                    UserId = s.UserId,
                    Username = s.User.Username,
                    StartedAt = DateTime.SpecifyKind(s.StartedAt, DateTimeKind.Utc),
                })
                .ToListAsync();
        }

        public async Task<List<UserStatDto>> GetUserStatsAsync()
        {
            var users = await db.Users.OrderByDescending(u => u.CreatedAt).ToListAsync();

            var activeStreams = await db.Streams
                .Where(s => s.Status == StreamStatus.Running || s.Status == StreamStatus.Starting)
                .GroupBy(s => s.UserId)
                .Select(g => new { UserId = g.Key, Count = g.Count() })
                .ToListAsync();
            var activeByUser = activeStreams.ToDictionary(x => x.UserId, x => x.Count);

            var history = await db.WatchHistory
                .Select(w => new { w.UserId, w.StartedAt, w.StoppedAt })
                .ToListAsync();
            var historyByUser = history.GroupBy(w => w.UserId).ToDictionary(g => g.Key, g => g.ToList());

            return users.Select(u =>
            {
                var sessions = historyByUser.GetValueOrDefault(u.Id) ?? [];
                var totalMinutes = (int)sessions
                    .Where(w => w.StoppedAt.HasValue)
                    .Sum(w => (w.StoppedAt!.Value - w.StartedAt).TotalMinutes);

                return new UserStatDto
                {
                    UserId = u.Id,
                    Username = u.Username,
                    IsActive = u.IsActive,
                    ActiveStreams = activeByUser.GetValueOrDefault(u.Id),
                    TotalSessions = sessions.Count,
                    TotalMinutes = totalMinutes,
                    LastLoginAt = u.LastLoginAt == null ? null : DateTime.SpecifyKind(u.LastLoginAt.Value, DateTimeKind.Utc),
                    CreatedAt = DateTime.SpecifyKind(u.CreatedAt, DateTimeKind.Utc),
                };
            }).ToList();
        }
    }
}
