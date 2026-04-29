using System.Security.Cryptography;
using CableJack.Core.DTOs;
using CableJack.Core.Services;
using CableJack.Infrastructure.Data;
using CableJack.Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;

namespace CableJack.Infrastructure.Services
{
    public sealed class UserService(CableJackDbContext db) : IUserService
    {
        public async Task<UserResponse> CreateUserAsync(CreateUserRequest request)
        {
            if (await db.Users.AnyAsync(u => u.Username == request.Username))
                throw new InvalidOperationException("Username already taken.");

            var user = new Core.Models.User
            {
                Id = 0,
                Username = request.Username,
                PasswordHash = HashPassword(request.Password),
                IsActive = request.IsActive,
                Role = request.Role,
                CreatedAt = DateTime.UtcNow,
            };

            db.Users.Add(user);
            await db.SaveChangesAsync();

            return new UserResponse
            {
                Id = user.Id,
                Username = user.Username,
                IsActive = user.IsActive,
                Role = user.Role,
                CreatedAt = user.CreatedAt,
                ModifiedAt = user.ModifiedAt,
                LastLoginAt = user.LastLoginAt,
            };
        }

        public async Task<PagedResult<UserResponse>> GetUsers(PaginationParams pagination)
        {
            return await db.Users
                .OrderBy(u => u.Id)
                .Select(u => new UserResponse
                {
                    Id = u.Id,
                    Username = u.Username,
                    IsActive = u.IsActive,
                    Role = u.Role,
                    CreatedAt = u.CreatedAt,
                    ModifiedAt = u.ModifiedAt,
                    LastLoginAt = u.LastLoginAt,
                })
                .ToPagedResultAsync(pagination);
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
                    LastLoginAt = u.LastLoginAt,
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
                LastLoginAt = user.LastLoginAt,
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

        public async Task<bool> ChangePasswordAsync(int userId, ChangePasswordRequest request)
        {
            var user = await db.Users.FindAsync(userId);
            if (user is null) return false;

            if (!VerifyPassword(request.CurrentPassword, user.PasswordHash))
                throw new UnauthorizedAccessException("Current password is incorrect.");

            user.PasswordHash = HashPassword(request.NewPassword);
            user.ModifiedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> AdminResetPasswordAsync(int userId, AdminResetPasswordRequest request)
        {
            var user = await db.Users.FindAsync(userId);
            if (user is null) return false;

            user.PasswordHash = HashPassword(request.NewPassword);
            user.ModifiedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return true;
        }

        public async Task<List<ChannelResponse>> GetFavoritesAsync(int userId)
        {
            return await db.UserFavorites
                .Where(f => f.UserId == userId)
                .Include(f => f.Channel).ThenInclude(c => c.Category)
                .OrderBy(f => f.Channel.SortOrder)
                .Select(f => new ChannelResponse
                {
                    Id = f.Channel.Id,
                    Name = f.Channel.Name,
                    TvgId = f.Channel.TvgId,
                    Description = f.Channel.Description,
                    SourceUrl = f.Channel.SourceUrl,
                    LogoUrl = f.Channel.LogoUrl,
                    CategoryId = f.Channel.CategoryId,
                    CategoryName = f.Channel.Category.Name,
                    IsActive = f.Channel.IsActive,
                    SortOrder = f.Channel.SortOrder,
                })
                .ToListAsync();
        }

        public async Task<bool> AddFavoriteAsync(int userId, int channelId)
        {
            var exists = await db.UserFavorites.AnyAsync(f => f.UserId == userId && f.ChannelId == channelId);
            if (exists) return false;

            var channelExists = await db.Channels.AnyAsync(c => c.Id == channelId);
            if (!channelExists) throw new KeyNotFoundException($"Channel {channelId} not found.");

            db.UserFavorites.Add(new Core.Models.UserFavorite
            {
                UserId = userId,
                ChannelId = channelId,
                CreatedAt = DateTime.UtcNow,
            });
            await db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RemoveFavoriteAsync(int userId, int channelId)
        {
            var favorite = await db.UserFavorites.FindAsync(userId, channelId);
            if (favorite is null) return false;

            db.UserFavorites.Remove(favorite);
            await db.SaveChangesAsync();
            return true;
        }

        public async Task<PagedResult<WatchHistoryResponse>> GetWatchHistoryAsync(int userId, PaginationParams pagination)
        {
            return await db.WatchHistory
                .Include(w => w.Channel)
                .Where(w => w.UserId == userId)
                .OrderByDescending(w => w.StartedAt)
                .Select(w => new WatchHistoryResponse
                {
                    Id = w.Id,
                    ChannelId = w.ChannelId,
                    ChannelName = w.Channel.Name,
                    StartedAt = w.StartedAt,
                    StoppedAt = w.StoppedAt,
                })
                .ToPagedResultAsync(pagination);
        }

        private static string HashPassword(string password)
        {
            byte[] salt = RandomNumberGenerator.GetBytes(16);
            byte[] hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, 100_000, HashAlgorithmName.SHA256, 32);
            return $"{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
        }

        private static bool VerifyPassword(string password, string hashedPassword)
        {
            var parts = hashedPassword.Split('.');
            if (parts.Length != 2) return false;
            byte[] salt = Convert.FromBase64String(parts[0]);
            byte[] expectedHash = Convert.FromBase64String(parts[1]);
            byte[] actualHash = Rfc2898DeriveBytes.Pbkdf2(password, salt, 100_000, HashAlgorithmName.SHA256, 32);
            return CryptographicOperations.FixedTimeEquals(actualHash, expectedHash);
        }
    }
}
