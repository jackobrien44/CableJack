using CableJack.Core.DTOs;

namespace CableJack.Core.Interfaces
{
    public interface IAuthService
    {
        Task<AuthResponse> RegisterAsync(RegisterRequest request);
        Task<AuthResponse> LoginAsync(LoginRequest request, string? ipAddress = null, string? deviceInfo = null);
        Task<AuthResponse> RefreshTokenAsync(string refreshToken, string? ipAddress = null);
        Task RevokeTokenAsync(string refreshToken);
    }
}
