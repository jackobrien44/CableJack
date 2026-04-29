using CableJack.Core.DTOs;

namespace CableJack.Core.Services
{
    public interface IUserService
    {
        Task<UserResponse> CreateUserAsync(CreateUserRequest request);
        Task<PagedResult<UserResponse>> GetUsers(PaginationParams pagination);
        Task<UserResponse?> GetUserById(int userId);
        Task<UserResponse?> UpdateUserAsync(int userId, UpdateUserRequest request);
        Task<bool> DeleteUserAsync(int userId);
        Task<bool> ChangePasswordAsync(int userId, ChangePasswordRequest request);
        Task<bool> AdminResetPasswordAsync(int userId, AdminResetPasswordRequest request);
        Task<List<ChannelResponse>> GetFavoritesAsync(int userId);
        Task<bool> AddFavoriteAsync(int userId, int channelId);
        Task<bool> RemoveFavoriteAsync(int userId, int channelId);
        Task<PagedResult<WatchHistoryResponse>> GetWatchHistoryAsync(int userId, PaginationParams pagination);
    }
}
