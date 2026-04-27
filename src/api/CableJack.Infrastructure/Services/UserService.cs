using CableJack.Core.DTOs;
using CableJack.Core.Services;
using CableJack.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CableJack.Infrastructure.Services
{
    public sealed class UserService(CableJackDbContext db) : IUserService
    {
        public async Task<List<UserResponse>> GetUsers()
        {
            return await db.Users
                .Select(u => new UserResponse
                {
                    Id = u.Id,
                    Username = u.Username,
                    IsActive = u.IsActive,
                    Role = u.Role,
                    CreatedAt = u.CreatedAt,
                    ModifiedAt = u.ModifiedAt,
                })
                .ToListAsync();
        }

        public async Task<UserResponse?> GetUserById(int userId)
        {
            return await db.Users
                .Where(u => u.Id == userId)
                .Select(u => new UserResponse
                {
                    Id = u.Id,
                    Username = u.Username,
                    IsActive = u.IsActive,
                    Role = u.Role,
                    CreatedAt = u.CreatedAt,
                    ModifiedAt = u.ModifiedAt,
                })
                .FirstOrDefaultAsync();
        }
    }
}
