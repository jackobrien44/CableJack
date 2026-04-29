using CableJack.Core.DTOs;
using CableJack.Core.Enums;
using CableJack.Core.Interfaces;
using CableJack.Core.Models;
using CableJack.Infrastructure.Data;
using CableJack.Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;
using Stream = CableJack.Core.Models.Stream;

namespace CableJack.Infrastructure.Services
{
    public sealed class StreamService(CableJackDbContext db, IFFmpegService ffmpegService) : IStreamService
    {
        public async Task<List<StreamResponse>> GetUserStreamsAsync(int userId)
        {
            return await db.Streams
                .Include(s => s.Channel)
                .Include(s => s.User)
                .Where(s => s.UserId == userId)
                .Select(s => ToResponse(s))
                .ToListAsync();
        }

        public async Task<StreamResponse?> GetStreamByIdAsync(int id, int userId)
        {
            return await db.Streams
                .Include(s => s.Channel)
                .Include(s => s.User)
                .Where(s => s.Id == id && s.UserId == userId)
                .Select(s => ToResponse(s))
                .FirstOrDefaultAsync();
        }

        public async Task<StreamResponse> StartStreamAsync(int channelId, int userId)
        {
            var channel = await db.Channels.FindAsync(channelId)
                ?? throw new InvalidOperationException("Channel not found.");

            var stream = new Stream
            {
                Id = 0,
                ChannelId = channelId,
                UserId = userId,
                Status = StreamStatus.Starting,
                Url = string.Empty,
                StartedAt = DateTime.UtcNow,
            };

            db.Streams.Add(stream);
            await db.SaveChangesAsync();

            await ffmpegService.StartAsync(stream.Id, channel.SourceUrl);

            db.WatchHistory.Add(new WatchHistory
            {
                Id = 0,
                UserId = userId,
                ChannelId = channelId,
                StartedAt = DateTime.UtcNow,
            });
            await db.SaveChangesAsync();

            // Reload to pick up URL and status written by FFmpegService
            await db.Entry(stream).ReloadAsync();
            await db.Entry(stream).Reference(s => s.Channel).LoadAsync();

            return ToResponse(stream);
        }

        public async Task<StreamResponse?> StopStreamAsync(int id, int userId)
        {
            var stream = await db.Streams
                .Include(s => s.Channel)
                .Include(s => s.User)
                .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);

            if (stream is null) return null;

            await ffmpegService.StopAsync(stream.Id);

            var openEntry = await db.WatchHistory
                .Where(w => w.UserId == userId && w.ChannelId == stream.ChannelId && w.StoppedAt == null)
                .OrderByDescending(w => w.StartedAt)
                .FirstOrDefaultAsync();
            if (openEntry is not null)
            {
                openEntry.StoppedAt = DateTime.UtcNow;
                await db.SaveChangesAsync();
            }

            // Reload to pick up status written by FFmpegService
            await db.Entry(stream).ReloadAsync();

            return ToResponse(stream);
        }

        public async Task<StreamResponse?> PauseStreamAsync(int id, int userId)
        {
            var stream = await db.Streams
                .Include(s => s.Channel)
                .Include(s => s.User)
                .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);

            if (stream is null) return null;

            await ffmpegService.PauseAsync(stream.Id);
            await db.Entry(stream).ReloadAsync();

            return ToResponse(stream);
        }

        public async Task<StreamResponse?> ResumeStreamAsync(int id, int userId)
        {
            var stream = await db.Streams
                .Include(s => s.Channel)
                .Include(s => s.User)
                .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);

            if (stream is null) return null;

            await ffmpegService.ResumeAsync(stream.Id, stream.Channel.SourceUrl);
            await db.Entry(stream).ReloadAsync();

            return ToResponse(stream);
        }

        public async Task<bool> DeleteStreamAsync(int id, int userId)
        {
            var stream = await db.Streams.FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);
            if (stream is null) return false;

            db.Streams.Remove(stream);
            await db.SaveChangesAsync();
            return true;
        }

        public async Task StopAllUserStreamsAsync(int userId)
        {
            var active = await db.Streams
                .Where(s => s.UserId == userId &&
                            (s.Status == StreamStatus.Running || s.Status == StreamStatus.Starting))
                .ToListAsync();

            await Task.WhenAll(active.Select(s => ffmpegService.StopAsync(s.Id)));
        }

        public async Task<PagedResult<StreamResponse>> GetAllStreamsAsync(PaginationParams pagination)
        {
            return await db.Streams
                .Include(s => s.Channel)
                .Include(s => s.User)
                .OrderByDescending(s => s.Id)
                .Select(s => ToResponse(s))
                .ToPagedResultAsync(pagination);
        }

        public async Task<StreamResponse?> AdminStopStreamAsync(int id)
        {
            var stream = await db.Streams
                .Include(s => s.Channel)
                .Include(s => s.User)
                .FirstOrDefaultAsync(s => s.Id == id);

            if (stream is null) return null;

            await ffmpegService.StopAsync(stream.Id);

            var openEntry = await db.WatchHistory
                .Where(w => w.UserId == stream.UserId && w.ChannelId == stream.ChannelId && w.StoppedAt == null)
                .OrderByDescending(w => w.StartedAt)
                .FirstOrDefaultAsync();
            if (openEntry is not null)
            {
                openEntry.StoppedAt = DateTime.UtcNow;
                await db.SaveChangesAsync();
            }

            await db.Entry(stream).ReloadAsync();
            return ToResponse(stream);
        }

        private static StreamResponse ToResponse(Stream s) => new()
        {
            Id = s.Id,
            Url = s.Url,
            Status = s.Status,
            ChannelId = s.ChannelId,
            ChannelName = s.Channel.Name,
            ChannelLogoUrl = s.Channel.LogoUrl,
            UserId = s.UserId,
            Username = s.User?.Username,
            StartedAt = DateTime.SpecifyKind(s.StartedAt, DateTimeKind.Utc),
        };
    }
}
