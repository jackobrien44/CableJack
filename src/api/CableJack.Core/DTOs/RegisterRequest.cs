namespace CableJack.Core.DTOs
{
    public sealed class RegisterRequest
    {
        public required string Username { get; set; }
        public required string Password { get; set; }
    }
}
