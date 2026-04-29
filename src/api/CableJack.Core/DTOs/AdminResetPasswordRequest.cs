using System.ComponentModel.DataAnnotations;

namespace CableJack.Core.DTOs
{
    public class AdminResetPasswordRequest
    {
        [Required]
        [StringLength(100, MinimumLength = 8)]
        public required string NewPassword { get; set; }
    }
}
