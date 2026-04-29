namespace CableJack.Core.Models
{
    public class SystemSetting
    {
        public int Id { get; set; }
        public required string Key { get; set; }
        public required string Value { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime ModifiedAt { get; set; } = DateTime.UtcNow;
    }
}
