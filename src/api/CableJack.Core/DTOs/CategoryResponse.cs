namespace CableJack.Core.DTOs
{
    public sealed class CategoryResponse
    {
        public required int Id { get; set; }
        public required string Name { get; set; }
        public required int SortOrder { get; set; }
    }
}
