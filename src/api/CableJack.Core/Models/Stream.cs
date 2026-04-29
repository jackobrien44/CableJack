using CableJack.Core.Enums;

namespace CableJack.Core.Models
{
    public sealed class Stream
    {
        public required int Id { get; set; }
        public required string Url { get; set; }
        public required StreamStatus Status { get; set; }
        public required int ChannelId { get; set; }
        public required int UserId { get; set; }
        public int? ProcessId { get; set; }
        public DateTime StartedAt { get; set; }

        public Channel Channel { get; set; } = null!;
        public User User { get; set; } = null!;
    }
}
