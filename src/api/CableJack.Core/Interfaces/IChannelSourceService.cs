using CableJack.Core.DTOs;

namespace CableJack.Core.Interfaces
{
    public interface IChannelSourceService
    {
        Task<List<ChannelSourceResponse>> GetByChannelAsync(int channelId);
        Task<ChannelSourceResponse?> CreateAsync(int channelId, CreateChannelSourceRequest request);
        Task<ChannelSourceResponse?> UpdatePriorityAsync(int channelId, int sourceId, int priority);
        Task<bool> DeleteAsync(int channelId, int sourceId);
    }
}
