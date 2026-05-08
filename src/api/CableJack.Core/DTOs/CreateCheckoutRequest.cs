namespace CableJack.Core.DTOs
{
    public class CreateCheckoutRequest
    {
        public required string SuccessUrl { get; set; }
        public required string CancelUrl { get; set; }
    }
}
