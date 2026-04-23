namespace CableJack.Core.Models
{
    public sealed class Category
    {
        public required int Id { get; set; }
        public required string Name { get; set; }
        public required int SortOrder { get; set; }

        public ICollection<Channel> Channels { get; set; } = [];
    }
}
