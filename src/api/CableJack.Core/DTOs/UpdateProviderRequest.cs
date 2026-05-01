namespace CableJack.Core.DTOs
{
    public sealed class UpdateProviderRequest
    {
        public string? Name { get; set; }
        public string? BaseUrl { get; set; }
        public string? Username { get; set; }
        public string? Password { get; set; }
        public int? MaxConcurrentStreams { get; set; }
        public DateOnly? ExpiresAt { get; set; }
    }
}
