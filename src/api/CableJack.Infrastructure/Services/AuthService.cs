using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using CableJack.Core.DTOs;
using CableJack.Core.Enums;
using CableJack.Core.Interfaces;
using CableJack.Core.Models;
using CableJack.Core.Settings;
using CableJack.Infrastructure.Data;
using CableJack.Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace CableJack.Infrastructure.Services
{
    public sealed class AuthService(CableJackDbContext db, IConfiguration configuration) : IAuthService
    {
        public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
        {
            var registrationMode = await db.SystemSettings
                .GetSettingAsync<RegistrationMode>(SettingKeys.RegistrationMode)
                ?? RegistrationMode.Open;

            if (registrationMode == RegistrationMode.Disabled)
                throw new InvalidOperationException("Registration is currently disabled.");

            if (await db.Users.AnyAsync(u => u.Username == request.Username))
                throw new InvalidOperationException("Username already taken.");

            var user = new User
            {
                Id = 0,
                Username = request.Username,
                PasswordHash = HashPassword(request.Password),
                IsActive = true,
                Role = UserRole.User,
                CreatedAt = DateTime.UtcNow,
            };

            db.Users.Add(user);
            await db.SaveChangesAsync();

            return await CreateTokensAsync(user);
        }

        public async Task<AuthResponse> LoginAsync(LoginRequest request, string? ipAddress = null, string? deviceInfo = null)
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Username == request.Username)
                ?? throw new UnauthorizedAccessException("Invalid credentials.");

            if (!user.IsActive)
                throw new UnauthorizedAccessException("Account is disabled.");

            if (!VerifyPassword(request.Password, user.PasswordHash))
                throw new UnauthorizedAccessException("Invalid credentials.");

            user.LastLoginAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            var resolvedDeviceInfo = request.RememberMe ? "tv" : deviceInfo;
            return await CreateTokensAsync(user, ipAddress, resolvedDeviceInfo, request.RememberMe);
        }

        public async Task<AuthResponse> RefreshTokenAsync(string refreshToken, string? ipAddress = null)
        {
            var token = await db.UserTokens
                .Include(t => t.User)
                .FirstOrDefaultAsync(t => t.RefreshToken == refreshToken)
                ?? throw new UnauthorizedAccessException("Invalid refresh token.");

            if (token.IsRevoked || token.RefreshTokenExpiresAt < DateTime.UtcNow)
                throw new UnauthorizedAccessException("Refresh token expired or revoked.");

            if (!token.User.IsActive)
                throw new UnauthorizedAccessException("Account is disabled.");

            token.IsRevoked = true;
            token.LastUsedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            return await CreateTokensAsync(token.User, ipAddress);
        }

        public async Task RevokeTokenAsync(string refreshToken)
        {
            var token = await db.UserTokens.FirstOrDefaultAsync(t => t.RefreshToken == refreshToken);
            if (token is not null)
            {
                token.IsRevoked = true;
                token.LastUsedAt = DateTime.UtcNow;
                await db.SaveChangesAsync();
            }
        }

        private async Task<AuthResponse> CreateTokensAsync(User user, string? ipAddress = null, string? deviceInfo = null, bool rememberMe = false)
        {
            var (accessToken, expiresAt) = GenerateAccessToken(user);
            var refreshToken = GenerateRefreshToken();
            var jwtSettings = configuration.GetSection("Jwt");
            var expiryDays = rememberMe
                ? double.Parse(jwtSettings["PersistentRefreshExpirationDays"] ?? "365")
                : double.Parse(jwtSettings["RefreshExpirationDays"] ?? "30");
            var refreshExpiry = DateTime.UtcNow.AddDays(expiryDays);

            db.UserTokens.Add(new UserToken
            {
                Id = 0,
                UserId = user.Id,
                RefreshToken = refreshToken,
                RefreshTokenExpiresAt = refreshExpiry,
                IsRevoked = false,
                CreatedAt = DateTime.UtcNow,
                IpAddress = ipAddress,
                DeviceInfo = deviceInfo,
            });

            await db.SaveChangesAsync();

            return new AuthResponse
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                ExpiresAt = expiresAt,
                User = new UserResponse
                {
                    Id = user.Id,
                    Username = user.Username,
                    IsActive = user.IsActive,
                    Role = user.Role,
                    IsChatEnabled = user.IsChatEnabled,
                    CreatedAt = user.CreatedAt,
                    ModifiedAt = user.ModifiedAt,
                    LastLoginAt = user.LastLoginAt,
                },
            };
        }

        private (string token, DateTime expiresAt) GenerateAccessToken(User user)
        {
            var jwtSettings = configuration.GetSection("Jwt");
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var expiresAt = DateTime.UtcNow.AddMinutes(double.Parse(jwtSettings["ExpirationMinutes"] ?? "60"));

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.UniqueName, user.Username),
                new Claim(ClaimTypes.Role, user.Role.ToString()),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            };

            var token = new JwtSecurityToken(
                issuer: jwtSettings["Issuer"],
                audience: jwtSettings["Audience"],
                claims: claims,
                expires: expiresAt,
                signingCredentials: creds
            );

            return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
        }

        private static string GenerateRefreshToken() =>
            Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

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
            return CryptographicOperations.FixedTimeEquals(expectedHash, actualHash);
        }
    }
}
