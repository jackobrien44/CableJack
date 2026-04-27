using CableJack.Core.Enums;

namespace CableJack.Core.DTOs
{
    public sealed class StreamResponse
    {
        public required int Id { get; set; }
        public required string Url { get; set; }
        public required StreamStatus Status { get; set; }
        public required int ChannelId { get; set; }
        public required string ChannelName { get; set; }
        public required int UserId { get; set; }
    }
}
