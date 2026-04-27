using CableJack.Core.DTOs;

namespace CableJack.Core.Services
{
    public interface IUserService
    {
        Task<PagedResult<UserResponse>> GetUsers(PaginationParams pagination);
        Task<UserResponse?> GetUserById(int userId);
        Task<UserResponse?> UpdateUserAsync(int userId, UpdateUserRequest request);
        Task<bool> DeleteUserAsync(int userId);
    }
}
