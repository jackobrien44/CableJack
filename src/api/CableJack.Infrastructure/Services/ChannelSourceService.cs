using CableJack.Core.DTOs;
using CableJack.Core.Interfaces;
using CableJack.Core.Models;
using CableJack.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CableJack.Infrastructure.Services
{
    public sealed class ChannelSourceService(CableJackDbContext db) : IChannelSourceService
    {
        public async Task<List<ChannelSourceResponse>> GetByChannelAsync(int channelId)
        {
            return await db.ChannelSources
                .Include(cs => cs.Provider)
                .Where(cs => cs.ChannelId == channelId)
                .OrderBy(cs => cs.Priority)
                .Select(cs => ToResponse(cs))
                .ToListAsync();
        }

        public async Task<ChannelSourceResponse?> CreateAsync(int channelId, CreateChannelSourceRequest request)
        {
            var channelExists = await db.Channels.AnyAsync(c => c.Id == channelId);
            if (!channelExists) return null;

            var providerExists = await db.Providers.AnyAsync(p => p.Id == request.ProviderId);
            if (!providerExists) return null;

            var source = new ChannelSource
            {
                Id = 0,
                ChannelId = channelId,
                ProviderId = request.ProviderId,
                SourceUrl = request.SourceUrl,
                Priority = request.Priority,
            };

            db.ChannelSources.Add(source);
            await db.SaveChangesAsync();
            await db.Entry(source).Reference(cs => cs.Provider).LoadAsync();

            return ToResponse(source);
        }

        public async Task<ChannelSourceResponse?> UpdatePriorityAsync(int channelId, int sourceId, int priority)
        {
            var source = await db.ChannelSources
                .Include(cs => cs.Provider)
                .FirstOrDefaultAsync(cs => cs.Id == sourceId && cs.ChannelId == channelId);

            if (source is null) return null;

            source.Priority = priority;
            await db.SaveChangesAsync();

            return ToResponse(source);
        }

        public async Task<bool> DeleteAsync(int channelId, int sourceId)
        {
            var source = await db.ChannelSources
                .FirstOrDefaultAsync(cs => cs.Id == sourceId && cs.ChannelId == channelId);

            if (source is null) return false;

            db.ChannelSources.Remove(source);
            await db.SaveChangesAsync();
            return true;
        }

        private static ChannelSourceResponse ToResponse(ChannelSource cs) => new()
        {
            Id = cs.Id,
            ChannelId = cs.ChannelId,
            ProviderId = cs.ProviderId,
            ProviderName = cs.Provider.Name,
            SourceUrl = cs.SourceUrl,
            Priority = cs.Priority,
        };
    }
}
