namespace CableJack.Core.Models
{
    public sealed class UserToken
    {
        public required int Id { get; set; }
        public required int UserId { get; set; }
        public required string RefreshToken { get; set; }
        public required DateTime RefreshTokenExpiresAt { get; set; }
        public required bool IsRevoked { get; set; }
        public required DateTime CreatedAt { get; set; }
        public DateTime? LastUsedAt { get; set; }
        public string? DeviceInfo { get; set; }
        public string? IpAddress { get; set; }

        public User User { get; set; } = null!;
    }
}
