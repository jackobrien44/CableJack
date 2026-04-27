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

        public async Task<UserResponse?> UpdateUserAsync(int userId, UpdateUserRequest request)
        {
            var user = await db.Users.FindAsync(userId);
            if (user is null) return null;

            if (request.IsActive is not null) user.IsActive = request.IsActive.Value;
            if (request.Role is not null) user.Role = request.Role.Value;
            user.ModifiedAt = DateTime.UtcNow;

            await db.SaveChangesAsync();

            return new UserResponse
            {
                Id = user.Id,
                Username = user.Username,
                IsActive = user.IsActive,
                Role = user.Role,
                CreatedAt = user.CreatedAt,
                ModifiedAt = user.ModifiedAt,
            };
        }

        public async Task<bool> DeleteUserAsync(int userId)
        {
            var user = await db.Users.FindAsync(userId);
            if (user is null) return false;

            db.Users.Remove(user);
            await db.SaveChangesAsync();
            return true;
        }
    }
}
