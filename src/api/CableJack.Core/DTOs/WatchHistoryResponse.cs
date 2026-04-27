namespace CableJack.Core.DTOs
{
    public sealed class WatchHistoryResponse
    {
        public required int Id { get; set; }
        public required int ChannelId { get; set; }
        public required string ChannelName { get; set; }
        public required DateTime StartedAt { get; set; }
        public DateTime? StoppedAt { get; set; }
    }
}
