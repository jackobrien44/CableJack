namespace CableJack.Core.DTOs
{
    public sealed class ChannelResponse
    {
        public required int Id { get; set; }
        public required string Name { get; set; }
        public string? TvgId { get; set; }
        public string? Description { get; set; }
        public string? LogoUrl { get; set; }
        public required int CategoryId { get; set; }
        public required string CategoryName { get; set; }
        public required bool IsActive { get; set; }
        public required int SortOrder { get; set; }
        public required List<ChannelSourceResponse> Sources { get; set; }
    }
}
