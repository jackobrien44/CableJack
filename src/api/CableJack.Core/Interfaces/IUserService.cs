using CableJack.Core.Models;

namespace CableJack.Core.Services
{
    public interface IUserService
    {
        Task<List<User>> GetUsers();
        Task<User> GetUserById(int userId);
    }
}
