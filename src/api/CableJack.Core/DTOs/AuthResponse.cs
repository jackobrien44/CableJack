namespace CableJack.Core.DTOs
{
    public sealed class AuthResponse
    {
        public required string AccessToken { get; set; }
        public required string RefreshToken { get; set; }
        public required DateTime ExpiresAt { get; set; }
        public required UserResponse User { get; set; }
    }
}
