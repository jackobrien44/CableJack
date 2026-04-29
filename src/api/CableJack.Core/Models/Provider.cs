namespace CableJack.Core.Models
{
    public sealed class Provider
    {
        public required int Id { get; set; }
        public required string Name { get; set; }
        public string? BaseUrl { get; set; }
        public string? Username { get; set; }
        public string? Password { get; set; }

        public ICollection<Channel> Channels { get; set; } = [];
    }
}
