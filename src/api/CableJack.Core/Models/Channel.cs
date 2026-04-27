namespace CableJack.Core.Models
{
    public sealed class Channel
    {
        public required int Id { get; set; }
        public required string Name { get; set; }
        public string? TvgId { get; set; }
        public string? Description { get; set; }
        public required string SourceUrl { get; set; }
        public string? LogoUrl { get; set; }
        public required int CategoryId { get; set; }
        public required bool IsActive { get; set; }
        public required int SortOrder { get; set; }

        public Category Category { get; set; } = null!;
        public ICollection<Stream> Streams { get; set; } = [];
        public ICollection<Programme> Programmes { get; set; } = [];
        public ICollection<UserFavorite> Favorites { get; set; } = [];
    }
}
