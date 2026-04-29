namespace CableJack.Core.Models
{
    /// <summary>
    /// Represents a single system setting as a key-value pair.
    /// This generalized approach allows adding new settings without schema changes.
    /// </summary>
    public class SystemSetting
    {
        public int Id { get; set; }
        public required string Key { get; set; }
        public required string Value { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime ModifiedAt { get; set; } = DateTime.UtcNow;
    }
}
