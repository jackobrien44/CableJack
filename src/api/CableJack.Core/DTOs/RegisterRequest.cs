using System.ComponentModel.DataAnnotations;

namespace CableJack.Core.DTOs
{
    public sealed class RegisterRequest
    {
        [Required]
        [MinLength(3)]
        [MaxLength(50)]
        public required string Username { get; set; }

        [Required]
        [MinLength(8)]
        [MaxLength(100)]
        public required string Password { get; set; }
    }
}
