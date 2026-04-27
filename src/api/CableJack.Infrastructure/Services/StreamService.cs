using CableJack.Core.DTOs;
using CableJack.Core.Enums;
using CableJack.Core.Interfaces;
using CableJack.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Stream = CableJack.Core.Models.Stream;

namespace CableJack.Infrastructure.Services
{
    public sealed class StreamService(CableJackDbContext db) : IStreamService
    {
        public async Task<List<StreamResponse>> GetUserStreamsAsync(int userId)
        {
            return await db.Streams
                .Include(s => s.Channel)
                .Where(s => s.UserId == userId)
                .Select(s => ToResponse(s))
                .ToListAsync();
        }

        public async Task<StreamResponse?> GetStreamByIdAsync(int id, int userId)
        {
            return await db.Streams
                .Include(s => s.Channel)
                .Where(s => s.Id == id && s.UserId == userId)
                .Select(s => ToResponse(s))
                .FirstOrDefaultAsync();
        }

        public async Task<StreamResponse> StartStreamAsync(int channelId, int userId)
        {
            var stream = new Stream
            {
                Id = 0,
                ChannelId = channelId,
                UserId = userId,
                Status = StreamStatus.Starting,
                // TODO: IFFmpegService — generate real HLS output URL and start FFmpeg process
                Url = $"/streams/{Guid.NewGuid():N}/index.m3u8",
            };

            db.Streams.Add(stream);
            await db.SaveChangesAsync();
            await db.Entry(stream).Reference(s => s.Channel).LoadAsync();

            // TODO: IFFmpegService — invoke StartAsync(stream.Id, channel.SourceUrl, stream.Url)
            // and update stream.Status to Running/Error based on result

            return ToResponse(stream);
        }

        public async Task<StreamResponse?> StopStreamAsync(int id, int userId)
        {
            var stream = await db.Streams
                .Include(s => s.Channel)
                .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);

            if (stream is null) return null;

            // TODO: IFFmpegService — invoke StopAsync(stream.Id) to terminate the FFmpeg process

            stream.Status = StreamStatus.Stopped;
            await db.SaveChangesAsync();

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

        public async Task<List<StreamResponse>> GetAllStreamsAsync()
        {
            return await db.Streams
                .Include(s => s.Channel)
                .Select(s => ToResponse(s))
                .ToListAsync();
        }

        private static StreamResponse ToResponse(Stream s) => new()
        {
            Id = s.Id,
            Url = s.Url,
            Status = s.Status,
            ChannelId = s.ChannelId,
            ChannelName = s.Channel.Name,
            UserId = s.UserId,
        };
    }
}
