using CableJack.Core.DTOs;

namespace CableJack.Core.Interfaces
{
    public interface IStreamService
    {
        Task<List<StreamResponse>> GetUserStreamsAsync(int userId);
        Task<StreamResponse?> GetStreamByIdAsync(int id, int userId);
        Task<StreamResponse> StartStreamAsync(int channelId, int userId);
        Task<StreamResponse?> StopStreamAsync(int id, int userId);
        Task<StreamResponse?> PauseStreamAsync(int id, int userId);
        Task<StreamResponse?> ResumeStreamAsync(int id, int userId);
        Task<bool> DeleteStreamAsync(int id, int userId);
        Task<PagedResult<StreamResponse>> GetAllStreamsAsync(PaginationParams pagination);
    }
}
