using CableJack.Core.DTOs;

namespace CableJack.Core.Interfaces
{
    public interface IChannelService
    {
        Task<PagedResult<ChannelResponse>> GetChannelsAsync(PaginationParams pagination, int? categoryId = null, bool includeInactive = false, string? search = null);
        Task<ChannelResponse?> GetChannelByIdAsync(int id);
        Task<ChannelResponse> CreateChannelAsync(CreateChannelRequest request);
        Task<ChannelResponse?> UpdateChannelAsync(int id, UpdateChannelRequest request);
        Task<bool> DeleteChannelAsync(int id);
    }
}
