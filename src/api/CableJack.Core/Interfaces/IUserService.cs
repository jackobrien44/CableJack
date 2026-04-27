using CableJack.Core.DTOs;

namespace CableJack.Core.Services
{
    public interface IUserService
    {
        Task<List<UserResponse>> GetUsers();
        Task<UserResponse?> GetUserById(int userId);
    }
}
