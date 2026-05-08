using CableJack.Core.Enums;

namespace CableJack.Core.DTOs
{
    public class UserBillingDto
    {
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public SubscriptionStatus Status { get; set; }
        public bool FreeAccess { get; set; }
        public string? FreeAccessReason { get; set; }
        public DateTime? TrialExpiresAt { get; set; }
        public DateTime? CurrentPeriodEnd { get; set; }
        public DateTime? CanceledAt { get; set; }
        public string? StripeCustomerId { get; set; }
        public string? StripeSubscriptionId { get; set; }
    }
}
