namespace CableJack.Core.DTOs
{
    public sealed class ImportResult
    {
        public required int ChannelsCreated { get; set; }
        public required int ChannelsUpdated { get; set; }
        public required int ChannelsSkipped { get; set; }
        public required int CategoriesCreated { get; set; }
        public required List<string> Errors { get; set; }
    }
}
