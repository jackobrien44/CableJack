using CableJack.Core.Enums;

namespace CableJack.Core.DTOs
{
    public sealed class AuthResponse
    {
        public required string AccessToken { get; set; }
        public required string RefreshToken { get; set; }
        public required DateTime ExpiresAt { get; set; }
        public required int UserId { get; set; }
        public required string Name { get; set; }
        public required UserRole Role { get; set; }
    }
}
