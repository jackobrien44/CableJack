using CableJack.Core.DTOs;

namespace CableJack.Core.Interfaces
{
    public interface IDashboardService
    {
        Task<DashboardStatsDto> GetStatsAsync();
        Task<List<WatchSessionDto>> GetRecentHistoryAsync(int count = 30);
        Task<List<TopChannelDto>> GetTopChannelsAsync(int count = 10);
        Task<List<UserStatDto>> GetUserStatsAsync();
        Task<List<StreamResponse>> GetErrorStreamsAsync();
    }
}
