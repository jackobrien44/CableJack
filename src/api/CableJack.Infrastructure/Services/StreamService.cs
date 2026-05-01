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
    public sealed class StreamService(CableJackDbContext db, IFFmpegService ffmpegService, ISettingsService settingsService) : IStreamService
    {
        public async Task<List<StreamResponse>> GetUserStreamsAsync(int userId)
        {
            return await db.Streams
                .Include(s => s.Channel)
                .Include(s => s.User)
                .Include(s => s.Provider)
                .Where(s => s.UserId == userId)
                .Select(s => ToResponse(s))
                .ToListAsync();
        }

        public async Task<StreamResponse?> GetStreamByIdAsync(int id, int userId)
        {
            return await db.Streams
                .Include(s => s.Channel)
                .Include(s => s.User)
                .Include(s => s.Provider)
                .Where(s => s.Id == id && s.UserId == userId)
                .Select(s => ToResponse(s))
                .FirstOrDefaultAsync();
        }

        public async Task<StreamResponse> StartStreamAsync(int channelId, int userId)
        {
            var settings = await settingsService.GetSettingsAsync();
            var activeCount = await db.Streams.CountAsync(s =>
                s.UserId == userId &&
                (s.Status == StreamStatus.Running || s.Status == StreamStatus.Starting));

            if (activeCount >= settings.MaxConcurrentStreams)
                throw new InvalidOperationException(
                    $"Stream limit reached. You may have at most {settings.MaxConcurrentStreams} active stream{(settings.MaxConcurrentStreams != 1 ? "s" : "")}.");

            var channelExists = await db.Channels.AnyAsync(c => c.Id == channelId);
            if (!channelExists)
                throw new InvalidOperationException("Channel not found.");

            // Pick the highest-priority provider source that still has capacity
            var sources = await db.ChannelSources
                .Where(cs => cs.ChannelId == channelId)
                .Include(cs => cs.Provider)
                .OrderBy(cs => cs.Priority)
                .ToListAsync();

            if (sources.Count == 0)
                throw new InvalidOperationException("Channel has no provider sources configured.");

            ChannelSource? selectedSource = null;
            foreach (var source in sources)
            {
                var providerActiveCount = await db.Streams.CountAsync(s =>
                    s.ProviderId == source.ProviderId &&
                    (s.Status == StreamStatus.Running || s.Status == StreamStatus.Starting));

                if (providerActiveCount < source.Provider.MaxConcurrentStreams)
                {
                    selectedSource = source;
                    break;
                }
            }

            if (selectedSource is null)
                throw new InvalidOperationException("All providers for this channel are at capacity. Please try again later.");

            var stream = new Stream
            {
                Id = 0,
                ChannelId = channelId,
                UserId = userId,
                ProviderId = selectedSource.ProviderId,
                Status = StreamStatus.Starting,
                Url = string.Empty,
                StartedAt = DateTime.UtcNow,
            };

            db.Streams.Add(stream);
            await db.SaveChangesAsync();

            await ffmpegService.StartAsync(stream.Id, selectedSource.SourceUrl);

            db.WatchHistory.Add(new WatchHistory
            {
                Id = 0,
                UserId = userId,
                ChannelId = channelId,
                StartedAt = DateTime.UtcNow,
            });
            await db.SaveChangesAsync();

            // Keep only the 10 most recent history rows per user
            var overflow = await db.WatchHistory
                .Where(w => w.UserId == userId)
                .OrderByDescending(w => w.StartedAt)
                .Skip(10)
                .Select(w => w.Id)
                .ToListAsync();
            if (overflow.Count > 0)
                await db.WatchHistory.Where(w => overflow.Contains(w.Id)).ExecuteDeleteAsync();

            // Reload to pick up URL and status written by FFmpegService
            await db.Entry(stream).ReloadAsync();
            await db.Entry(stream).Reference(s => s.Channel).LoadAsync();
            await db.Entry(stream).Reference(s => s.Provider).LoadAsync();

            return ToResponse(stream);
        }

        public async Task<StreamResponse?> StopStreamAsync(int id, int userId)
        {
            var stream = await db.Streams
                .Include(s => s.Channel)
                .Include(s => s.User)
                .Include(s => s.Provider)
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
                .Include(s => s.Provider)
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
                .Include(s => s.Provider)
                .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);

            if (stream is null) return null;

            // Look up the source URL for the provider this stream is using
            var source = stream.ProviderId.HasValue
                ? await db.ChannelSources.FirstOrDefaultAsync(cs =>
                    cs.ChannelId == stream.ChannelId && cs.ProviderId == stream.ProviderId.Value)
                : null;

            await ffmpegService.ResumeAsync(stream.Id, source?.SourceUrl ?? string.Empty);
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
                .Include(s => s.Provider)
                .OrderByDescending(s => s.Id)
                .Select(s => ToResponse(s))
                .ToPagedResultAsync(pagination);
        }

        public async Task<StreamResponse?> AdminStopStreamAsync(int id)
        {
            var stream = await db.Streams
                .Include(s => s.Channel)
                .Include(s => s.User)
                .Include(s => s.Provider)
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
            ProviderId = s.ProviderId,
            ProviderName = s.Provider?.Name,
            StartedAt = DateTime.SpecifyKind(s.StartedAt, DateTimeKind.Utc),
        };
    }
}
