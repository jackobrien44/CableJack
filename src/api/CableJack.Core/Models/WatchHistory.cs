namespace CableJack.Core.Models
{
    public sealed class WatchHistory
    {
        public required int Id { get; set; }
        public required int UserId { get; set; }
        public required int ChannelId { get; set; }
        public required DateTime StartedAt { get; set; }
        public DateTime? StoppedAt { get; set; }

        public User User { get; set; } = null!;
        public Channel Channel { get; set; } = null!;
    }
}
