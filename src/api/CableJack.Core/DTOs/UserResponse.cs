using CableJack.Core.Enums;

namespace CableJack.Core.DTOs
{
    public sealed class UserResponse
    {
        public required int Id { get; set; }
        public required string Username { get; set; }
        public required bool IsActive { get; set; }
        public required UserRole Role { get; set; }
        public required DateTime CreatedAt { get; set; }
        public DateTime? ModifiedAt { get; set; }
        public DateTime? LastLoginAt { get; set; }
    }
}
