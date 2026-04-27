using CableJack.Core.DTOs;
using CableJack.Core.Interfaces;
using CableJack.Core.Models;
using CableJack.Infrastructure.Data;
using CableJack.Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;

namespace CableJack.Infrastructure.Services
{
    public sealed class ChannelService(CableJackDbContext db) : IChannelService
    {
        public async Task<PagedResult<ChannelResponse>> GetChannelsAsync(PaginationParams pagination, int? categoryId = null, bool includeInactive = false, string? search = null)
        {
            var query = db.Channels.Include(c => c.Category).AsQueryable();

            if (!includeInactive)
                query = query.Where(c => c.IsActive);

            if (categoryId is not null)
                query = query.Where(c => c.CategoryId == categoryId);

            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(c => c.Name.Contains(search) || (c.TvgId != null && c.TvgId.Contains(search)));

            return await query
                .OrderBy(c => c.SortOrder)
                .Select(c => ToResponse(c))
                .ToPagedResultAsync(pagination);
        }

        public async Task<ChannelResponse?> GetChannelByIdAsync(int id)
        {
            return await db.Channels
                .Include(c => c.Category)
                .Where(c => c.Id == id)
                .Select(c => ToResponse(c))
                .FirstOrDefaultAsync();
        }

        public async Task<ChannelResponse> CreateChannelAsync(CreateChannelRequest request)
        {
            var channel = new Channel
            {
                Id = 0,
                Name = request.Name,
                TvgId = request.TvgId,
                Description = request.Description,
                SourceUrl = request.SourceUrl,
                LogoUrl = request.LogoUrl,
                CategoryId = request.CategoryId,
                IsActive = request.IsActive,
                SortOrder = request.SortOrder,
            };

            db.Channels.Add(channel);
            await db.SaveChangesAsync();
            await db.Entry(channel).Reference(c => c.Category).LoadAsync();

            return ToResponse(channel);
        }

        public async Task<ChannelResponse?> UpdateChannelAsync(int id, UpdateChannelRequest request)
        {
            var channel = await db.Channels
                .Include(c => c.Category)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (channel is null) return null;

            if (request.Name is not null) channel.Name = request.Name;
            if (request.TvgId is not null) channel.TvgId = request.TvgId;
            if (request.Description is not null) channel.Description = request.Description;
            if (request.SourceUrl is not null) channel.SourceUrl = request.SourceUrl;
            if (request.LogoUrl is not null) channel.LogoUrl = request.LogoUrl;
            if (request.IsActive is not null) channel.IsActive = request.IsActive.Value;
            if (request.SortOrder is not null) channel.SortOrder = request.SortOrder.Value;

            if (request.CategoryId is not null)
            {
                channel.CategoryId = request.CategoryId.Value;
                await db.Entry(channel).Reference(c => c.Category).LoadAsync();
            }

            await db.SaveChangesAsync();

            return ToResponse(channel);
        }

        public async Task<bool> DeleteChannelAsync(int id)
        {
            var channel = await db.Channels.FindAsync(id);
            if (channel is null) return false;

            db.Channels.Remove(channel);
            await db.SaveChangesAsync();
            return true;
        }

        private static ChannelResponse ToResponse(Channel c) => new()
        {
            Id = c.Id,
            Name = c.Name,
            TvgId = c.TvgId,
            Description = c.Description,
            SourceUrl = c.SourceUrl,
            LogoUrl = c.LogoUrl,
            CategoryId = c.CategoryId,
            CategoryName = c.Category.Name,
            IsActive = c.IsActive,
            SortOrder = c.SortOrder,
        };
    }
}
