using CableJack.Core.Enums;

namespace CableJack.Core.Models
{
    public sealed class User
    {
        public required int Id { get; set; }
        public required string Name { get; set; }
        public required string PasswordHash { get; set; }
        public required bool IsActive { get; set; }
        public required UserRole Role { get; set; }
        public required DateTime CreatedAt { get; set; }
        public DateTime? ModifiedAt { get; set; }
    }
}
