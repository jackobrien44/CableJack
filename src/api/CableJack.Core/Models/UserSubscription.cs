using CableJack.Core.Enums;

namespace CableJack.Core.Models
{
    public class UserSubscription
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public User User { get; set; } = null!;

        public string? StripeCustomerId { get; set; }
        public string? StripeSubscriptionId { get; set; }

        public SubscriptionStatus Status { get; set; } = SubscriptionStatus.None;
        public DateTime? CurrentPeriodEnd { get; set; }
        public DateTime? CanceledAt { get; set; }

        // Admin-set grace period date — CableJack-local, not a Stripe trial
        public DateTime? TrialExpiresAt { get; set; }

        public bool FreeAccess { get; set; } = false;
        public string? FreeAccessReason { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime ModifiedAt { get; set; } = DateTime.UtcNow;
    }
}
