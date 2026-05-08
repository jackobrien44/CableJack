namespace CableJack.Core.DTOs
{
    public class BillingStatusResponse
    {
        public bool HasAccess { get; set; }
        public bool IsOnTrial { get; set; }
        public bool IsFreeAccess { get; set; }
        public bool IsSubscribed { get; set; }
        public bool EnforcementActive { get; set; }
        public DateTime? TrialExpiresAt { get; set; }
        public DateTime? CurrentPeriodEnd { get; set; }
        public bool HasStripeCustomer { get; set; }
    }
}
