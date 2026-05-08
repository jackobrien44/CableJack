using CableJack.Core.DTOs;

namespace CableJack.Core.Interfaces
{
    public interface IBillingService
    {
        Task<AccessCheckResult> CheckAccessAsync(int userId);
        Task<string> CreateCheckoutSessionAsync(int userId, string successUrl, string cancelUrl);
        Task<string> CreatePortalSessionAsync(int userId, string returnUrl);
        Task<bool> HandleWebhookAsync(string payload, string stripeSignature);
        Task<UserBillingDto?> GetUserBillingAsync(int userId);
        Task<List<UserBillingDto>> GetAllUserBillingsAsync();
        Task SetFreeAccessAsync(int userId, bool freeAccess, string? reason);
        Task SetTrialExpiryAsync(int userId, DateTime? trialExpiresAt);
    }
}
