using System.ComponentModel.DataAnnotations;

namespace CableJack.Core.DTOs
{
    public sealed class LoginRequest
    {
        [Required]
        public required string Username { get; set; }

        [Required]
        public required string Password { get; set; }
    }
}
