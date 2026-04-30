namespace CableJack.Core.DTOs
{
    public class AuditLogDto
    {
        public int Id { get; set; }
        public DateTime Timestamp { get; set; }
        public string Action { get; set; } = string.Empty;
        public int? ActorId { get; set; }
        public string? ActorUsername { get; set; }
        public string? TargetType { get; set; }
        public int? TargetId { get; set; }
        public string? Description { get; set; }
        public string? IpAddress { get; set; }
    }
}
