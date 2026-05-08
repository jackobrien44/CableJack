using CableJack.Core.DTOs;
using CableJack.Core.Enums;
using CableJack.Core.Interfaces;
using CableJack.Core.Models;
using CableJack.Core.Settings;
using CableJack.Infrastructure.Data;
using CableJack.Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Stripe;

namespace CableJack.Infrastructure.Services
{
    public sealed class BillingService(
        CableJackDbContext db,
        IConfiguration configuration,
        IAuditService auditService,
        ILogger<BillingService> logger) : IBillingService
    {
        private string WebhookSecret => configuration["Stripe:WebhookSecret"]
            ?? throw new InvalidOperationException("Stripe:WebhookSecret is not configured.");

        private string PriceId => configuration["Stripe:PriceId"]
            ?? throw new InvalidOperationException("Stripe:PriceId is not configured.");

        public async Task<AccessCheckResult> CheckAccessAsync(int userId)
        {
            var sub = await db.UserSubscriptions
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.UserId == userId);

            if (sub?.FreeAccess == true)
                return new AccessCheckResult { HasAccess = true, IsFreeAccess = true };

            var enforcedStr = await db.SystemSettings.GetSettingAsync(SettingKeys.PaymentsEnforced);
            var enforced = enforcedStr == "true";

            if (!enforced)
                return new AccessCheckResult { HasAccess = true, EnforcementActive = false };

            if (sub?.Status == SubscriptionStatus.Active && sub.CurrentPeriodEnd > DateTime.UtcNow)
                return new AccessCheckResult
                {
                    HasAccess = true,
                    IsSubscribed = true,
                    EnforcementActive = true,
                    CurrentPeriodEnd = sub.CurrentPeriodEnd,
                };

            if (sub?.TrialExpiresAt != null && sub.TrialExpiresAt > DateTime.UtcNow)
                return new AccessCheckResult
                {
                    HasAccess = true,
                    IsOnTrial = true,
                    EnforcementActive = true,
                    TrialExpiresAt = sub.TrialExpiresAt,
                };

            return new AccessCheckResult { HasAccess = false, EnforcementActive = true };
        }

        public async Task<BillingStatusResponse> GetBillingStatusAsync(int userId)
        {
            var access = await CheckAccessAsync(userId);
            var sub = await db.UserSubscriptions
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.UserId == userId);

            return new BillingStatusResponse
            {
                HasAccess = access.HasAccess,
                IsOnTrial = access.IsOnTrial,
                IsFreeAccess = access.IsFreeAccess,
                IsSubscribed = access.IsSubscribed,
                EnforcementActive = access.EnforcementActive,
                TrialExpiresAt = access.TrialExpiresAt ?? sub?.TrialExpiresAt,
                CurrentPeriodEnd = access.CurrentPeriodEnd ?? sub?.CurrentPeriodEnd,
                HasStripeCustomer = sub?.StripeCustomerId != null,
            };
        }

        public async Task<string> CreateCheckoutSessionAsync(int userId, string successUrl, string cancelUrl)
        {
            var sub = await GetOrCreateSubscriptionAsync(userId);

            if (sub.StripeCustomerId is null)
            {
                var user = await db.Users.FindAsync(userId)
                    ?? throw new InvalidOperationException($"User {userId} not found.");

                var customerService = new CustomerService();
                var customer = await customerService.CreateAsync(new CustomerCreateOptions
                {
                    Metadata = new Dictionary<string, string>
                    {
                        { "cablejack_user_id", userId.ToString() },
                    },
                    Description = user.Username,
                });

                sub.StripeCustomerId = customer.Id;
                sub.ModifiedAt = DateTime.UtcNow;
                await db.SaveChangesAsync();
            }

            var sessionService = new Stripe.Checkout.SessionService();
            var session = await sessionService.CreateAsync(new Stripe.Checkout.SessionCreateOptions
            {
                Customer = sub.StripeCustomerId,
                Mode = "subscription",
                LineItems =
                [
                    new Stripe.Checkout.SessionLineItemOptions
                    {
                        Price = PriceId,
                        Quantity = 1,
                    },
                ],
                SuccessUrl = successUrl,
                CancelUrl = cancelUrl,
                AllowPromotionCodes = true,
                SubscriptionData = new Stripe.Checkout.SessionSubscriptionDataOptions
                {
                    Metadata = new Dictionary<string, string>
                    {
                        { "cablejack_user_id", userId.ToString() },
                    },
                },
            });

            return session.Url;
        }

        public async Task<string> CreatePortalSessionAsync(int userId, string returnUrl)
        {
            var sub = await db.UserSubscriptions
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.UserId == userId);

            if (sub?.StripeCustomerId is null)
                throw new InvalidOperationException("No Stripe customer found for this user.");

            var portalService = new Stripe.BillingPortal.SessionService();
            var session = await portalService.CreateAsync(new Stripe.BillingPortal.SessionCreateOptions
            {
                Customer = sub.StripeCustomerId,
                ReturnUrl = returnUrl,
            });

            return session.Url;
        }

        public async Task<bool> HandleWebhookAsync(string payload, string stripeSignature)
        {
            Stripe.Event stripeEvent;
            try
            {
                stripeEvent = EventUtility.ConstructEvent(payload, stripeSignature, WebhookSecret);
            }
            catch (StripeException ex)
            {
                logger.LogWarning(ex, "Stripe webhook signature verification failed.");
                return false;
            }

            logger.LogInformation("Received Stripe webhook: {EventType} ({EventId})", stripeEvent.Type, stripeEvent.Id);

            switch (stripeEvent.Type)
            {
                case EventTypes.CustomerSubscriptionCreated:
                case EventTypes.CustomerSubscriptionUpdated:
                    await HandleSubscriptionUpsertAsync((Subscription)stripeEvent.Data.Object);
                    break;

                case EventTypes.CustomerSubscriptionDeleted:
                    await HandleSubscriptionDeletedAsync((Subscription)stripeEvent.Data.Object);
                    break;

                case EventTypes.InvoicePaymentSucceeded:
                    await HandleInvoicePaymentSucceededAsync((Invoice)stripeEvent.Data.Object);
                    break;

                case EventTypes.InvoicePaymentFailed:
                    await HandleInvoicePaymentFailedAsync((Invoice)stripeEvent.Data.Object);
                    break;

                default:
                    logger.LogDebug("Unhandled Stripe event type: {EventType}", stripeEvent.Type);
                    break;
            }

            return true;
        }

        public async Task<UserBillingDto?> GetUserBillingAsync(int userId)
        {
            return await db.Users
                .Where(u => u.Id == userId)
                .Select(u => new UserBillingDto
                {
                    UserId = u.Id,
                    Username = u.Username,
                    Status = u.Subscription != null ? u.Subscription.Status : SubscriptionStatus.None,
                    FreeAccess = u.Subscription != null && u.Subscription.FreeAccess,
                    FreeAccessReason = u.Subscription != null ? u.Subscription.FreeAccessReason : null,
                    TrialExpiresAt = u.Subscription != null ? u.Subscription.TrialExpiresAt : null,
                    CurrentPeriodEnd = u.Subscription != null ? u.Subscription.CurrentPeriodEnd : null,
                    CanceledAt = u.Subscription != null ? u.Subscription.CanceledAt : null,
                    StripeCustomerId = u.Subscription != null ? u.Subscription.StripeCustomerId : null,
                    StripeSubscriptionId = u.Subscription != null ? u.Subscription.StripeSubscriptionId : null,
                })
                .FirstOrDefaultAsync();
        }

        public async Task<List<UserBillingDto>> GetAllUserBillingsAsync()
        {
            return await db.Users
                .OrderBy(u => u.Username)
                .Select(u => new UserBillingDto
                {
                    UserId = u.Id,
                    Username = u.Username,
                    Status = u.Subscription != null ? u.Subscription.Status : SubscriptionStatus.None,
                    FreeAccess = u.Subscription != null && u.Subscription.FreeAccess,
                    FreeAccessReason = u.Subscription != null ? u.Subscription.FreeAccessReason : null,
                    TrialExpiresAt = u.Subscription != null ? u.Subscription.TrialExpiresAt : null,
                    CurrentPeriodEnd = u.Subscription != null ? u.Subscription.CurrentPeriodEnd : null,
                    CanceledAt = u.Subscription != null ? u.Subscription.CanceledAt : null,
                    StripeCustomerId = u.Subscription != null ? u.Subscription.StripeCustomerId : null,
                    StripeSubscriptionId = u.Subscription != null ? u.Subscription.StripeSubscriptionId : null,
                })
                .ToListAsync();
        }

        public async Task SetFreeAccessAsync(int userId, bool freeAccess, string? reason)
        {
            var sub = await GetOrCreateSubscriptionAsync(userId);
            sub.FreeAccess = freeAccess;
            sub.FreeAccessReason = freeAccess ? reason : null;
            sub.ModifiedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            var action = freeAccess ? "FreeAccessGranted" : "FreeAccessRevoked";
            var description = freeAccess && reason != null ? $"Reason: {reason}" : null;
            await auditService.LogAsync(action, description, "User", userId);
        }

        public async Task SetTrialExpiryAsync(int userId, DateTime? trialExpiresAt)
        {
            var sub = await GetOrCreateSubscriptionAsync(userId);
            sub.TrialExpiresAt = trialExpiresAt;
            sub.ModifiedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            var description = trialExpiresAt.HasValue
                ? $"Trial expiry set to {trialExpiresAt.Value:yyyy-MM-dd}"
                : "Trial expiry cleared";
            await auditService.LogAsync("TrialExpirySet", description, "User", userId);
        }

        private async Task HandleSubscriptionUpsertAsync(Subscription stripeSub)
        {
            var sub = await db.UserSubscriptions
                .FirstOrDefaultAsync(s => s.StripeCustomerId == stripeSub.CustomerId);

            if (sub is null)
            {
                logger.LogWarning(
                    "No UserSubscription found for Stripe customer {CustomerId}", stripeSub.CustomerId);
                return;
            }

            sub.StripeSubscriptionId = stripeSub.Id;
            sub.Status = MapStripeStatus(stripeSub.Status);
            sub.CanceledAt = stripeSub.CanceledAt;
            sub.ModifiedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            // CurrentPeriodEnd is intentionally not set here — invoice.payment_succeeded
            // owns that field via Invoice.PeriodEnd, which is a properly mapped property.
        }

        private async Task HandleSubscriptionDeletedAsync(Subscription stripeSub)
        {
            var sub = await db.UserSubscriptions
                .FirstOrDefaultAsync(s => s.StripeCustomerId == stripeSub.CustomerId);

            if (sub is null) return;

            sub.Status = SubscriptionStatus.Canceled;
            sub.CanceledAt = DateTime.UtcNow;
            sub.ModifiedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }

        private async Task HandleInvoicePaymentSucceededAsync(Invoice invoice)
        {
            var sub = await db.UserSubscriptions
                .FirstOrDefaultAsync(s => s.StripeCustomerId == invoice.CustomerId);

            if (sub is null) return;

            sub.Status = SubscriptionStatus.Active;
            sub.CurrentPeriodEnd = invoice.PeriodEnd;
            sub.ModifiedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }

        private async Task HandleInvoicePaymentFailedAsync(Invoice invoice)
        {
            var sub = await db.UserSubscriptions
                .FirstOrDefaultAsync(s => s.StripeCustomerId == invoice.CustomerId);

            if (sub is null) return;

            sub.Status = SubscriptionStatus.PastDue;
            sub.ModifiedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }

        private async Task<UserSubscription> GetOrCreateSubscriptionAsync(int userId)
        {
            var sub = await db.UserSubscriptions.FirstOrDefaultAsync(s => s.UserId == userId);
            if (sub is not null) return sub;

            sub = new UserSubscription { UserId = userId };
            db.UserSubscriptions.Add(sub);
            await db.SaveChangesAsync();
            return sub;
        }

        private static SubscriptionStatus MapStripeStatus(string status) => status switch
        {
            "active" => SubscriptionStatus.Active,
            "trialing" => SubscriptionStatus.Trialing,
            "past_due" => SubscriptionStatus.PastDue,
            "canceled" => SubscriptionStatus.Canceled,
            "unpaid" => SubscriptionStatus.Unpaid,
            _ => SubscriptionStatus.None,
        };
    }
}
