namespace CableJack.Core.DTOs
{
    public sealed class DashboardStatsDto
    {
        public required int ActiveStreams { get; set; }
        public required int TotalUsers { get; set; }
        public required int TotalChannels { get; set; }
    }
}
