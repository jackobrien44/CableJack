using CableJack.Core.Models;
using CableJack.Core.Services;

namespace CableJack.Infrastructure.Services
{
    public sealed class UserService : IUserService
    {
        public UserService() { }

        public Task<User> GetUserById(int userId)
        {
            throw new NotImplementedException();
        }

        public Task<List<User>> GetUsers()
        {
            throw new NotImplementedException();
        }
    }
}
