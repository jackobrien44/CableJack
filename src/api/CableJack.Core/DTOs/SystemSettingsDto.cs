using CableJack.Core.Enums;

namespace CableJack.Core.DTOs
{
    public class SystemSettingsDto
    {
        public RegistrationMode RegistrationMode { get; set; } = RegistrationMode.Open;
        public int MaxConcurrentStreams { get; set; } = 2;
        public bool PaymentsEnabled { get; set; } = false;
        public bool PaymentsEnforced { get; set; } = false;
        public string? StripePublishableKey { get; set; }
        public string? StripePriceId { get; set; }
    }
}
