namespace CableJack.Core.Models
{
    public sealed class UserToken
    {
        public required int Id { get; set; }
        public required int UserId { get; set; }
        public required string Token { get; set; }
        public required DateTime ExpiresAt { get; set; }
    }
}
