using CableJack.Core.Enums;

namespace CableJack.Core.DTOs
{
    public sealed class UpdateUserRequest
    {
        public bool? IsActive { get; set; }
        public UserRole? Role { get; set; }
    }
}
