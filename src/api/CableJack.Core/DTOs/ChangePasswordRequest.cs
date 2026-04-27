using System.ComponentModel.DataAnnotations;

namespace CableJack.Core.DTOs
{
    public sealed class ChangePasswordRequest
    {
        [Required]
        public required string CurrentPassword { get; set; }

        [Required]
        [MinLength(8)]
        public required string NewPassword { get; set; }
    }
}
