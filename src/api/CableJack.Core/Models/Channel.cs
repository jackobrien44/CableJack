namespace CableJack.Core.Models
{
    public sealed class Channel
    {
        public required int Id { get; set; }
        public required string Name { get; set; }
        public string? TvgId { get; set; }
        public string? Description { get; set; }
        public string? LogoUrl { get; set; }
        public required int CategoryId { get; set; }
        public required bool IsActive { get; set; }
        public required int SortOrder { get; set; }
        public required bool HasSources { get; set; }
        public required DateTime CreatedAt { get; set; }

        public Category Category { get; set; } = null!;
        public ICollection<ChannelSource> Sources { get; set; } = [];
        public ICollection<Stream> Streams { get; set; } = [];
        public ICollection<Programme> Programmes { get; set; } = [];
        public ICollection<UserFavorite> Favorites { get; set; } = [];
    }
}
