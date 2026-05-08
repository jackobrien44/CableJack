namespace CableJack.Core.Models
{
    public sealed class ChatMessage
    {
        public int Id { get; set; }
        public int ChannelId { get; set; }
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Text { get; set; } = string.Empty;
        public DateTime SentAt { get; set; }

        public Channel Channel { get; set; } = null!;
        public User User { get; set; } = null!;
    }
}
