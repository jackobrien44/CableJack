namespace CableJack.Core.Models
{
    public sealed class UserFavorite
    {
        public required int UserId { get; set; }
        public required int ChannelId { get; set; }
        public required DateTime CreatedAt { get; set; }

        public User User { get; set; } = null!;
        public Channel Channel { get; set; } = null!;
    }
}
