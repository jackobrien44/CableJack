using System.ComponentModel.DataAnnotations;

namespace CableJack.Core.DTOs
{
    public sealed class CreateProviderRequest
    {
        [Required]
        public required string Name { get; set; }
        public string? BaseUrl { get; set; }
        public string? Username { get; set; }
        public string? Password { get; set; }
        public int MaxConcurrentStreams { get; set; } = 3;
    }
}
