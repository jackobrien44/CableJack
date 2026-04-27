namespace CableJack.Core.DTOs
{
    public sealed class ProgrammeResponse
    {
        public required int Id { get; set; }
        public required int ChannelId { get; set; }
        public required string ChannelName { get; set; }
        public required string Title { get; set; }
        public string? Description { get; set; }
        public required DateTime StartTime { get; set; }
        public required DateTime EndTime { get; set; }
    }
}
