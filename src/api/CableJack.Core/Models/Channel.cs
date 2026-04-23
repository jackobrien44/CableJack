namespace CableJack.Core.Models
{
    public sealed class Channel
    {
        public required int Id { get; set; }
        public required string Name { get; set; }
        public string? Description { get; set; }
        public required string SourceUrl { get; set; }
        public string? LogoUrl { get; set; }
        public required int CategoryId { get; set; }
        public required bool IsActive { get; set; }
        public required int SortOrder { get; set; }
    }
}
