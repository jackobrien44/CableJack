using System.ComponentModel.DataAnnotations;

namespace CableJack.Core.DTOs
{
    public sealed class CreateChannelSourceRequest
    {
        [Required]
        public required int ProviderId { get; set; }
        [Required]
        public required string SourceUrl { get; set; }
        public int Priority { get; set; } = 1;
    }
}
