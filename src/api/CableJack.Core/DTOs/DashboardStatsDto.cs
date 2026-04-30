namespace CableJack.Core.DTOs
{
    public sealed class DashboardStatsDto
    {
        public required int ActiveStreams { get; set; }
        public required int TotalUsers { get; set; }
        public required int TotalChannels { get; set; }
        public required int StreamsLast24h { get; set; }
        public required int ErrorsLast24h { get; set; }
        public required int NewUsersLast7d { get; set; }
    }

    public sealed class WatchSessionDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public required string Username { get; set; }
        public required string ChannelName { get; set; }
        public required DateTime StartedAt { get; set; }
        public DateTime? StoppedAt { get; set; }
    }

    public sealed class TopChannelDto
    {
        public required string ChannelName { get; set; }
        public required int SessionCount { get; set; }
        public required int TotalMinutes { get; set; }
    }

    public sealed class UserStatDto
    {
        public required int UserId { get; set; }
        public required string Username { get; set; }
        public required bool IsActive { get; set; }
        public required int ActiveStreams { get; set; }
        public required int TotalSessions { get; set; }
        public required int TotalMinutes { get; set; }
        public DateTime? LastLoginAt { get; set; }
        public required DateTime CreatedAt { get; set; }
    }
}
