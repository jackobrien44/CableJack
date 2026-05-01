namespace CableJack.Core.DTOs
{
    public sealed class ChannelSourceResponse
    {
        public required int Id { get; set; }
        public required int ChannelId { get; set; }
        public required int ProviderId { get; set; }
        public required string ProviderName { get; set; }
        public required string SourceUrl { get; set; }
        public required int Priority { get; set; }
    }
}
