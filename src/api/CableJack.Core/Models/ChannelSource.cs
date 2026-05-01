namespace CableJack.Core.Models
{
    public sealed class ChannelSource
    {
        public required int Id { get; set; }
        public required int ChannelId { get; set; }
        public required int ProviderId { get; set; }
        public required string SourceUrl { get; set; }
        public required int Priority { get; set; }

        public Channel Channel { get; set; } = null!;
        public Provider Provider { get; set; } = null!;
    }
}
