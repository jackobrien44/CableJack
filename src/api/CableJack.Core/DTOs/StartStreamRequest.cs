using System.ComponentModel.DataAnnotations;

namespace CableJack.Core.DTOs
{
    public sealed class StartStreamRequest
    {
        [Required]
        public required int ChannelId { get; set; }
    }
}
