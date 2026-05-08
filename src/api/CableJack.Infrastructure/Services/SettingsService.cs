using CableJack.Core.DTOs;
using CableJack.Core.Enums;
using CableJack.Core.Interfaces;
using CableJack.Core.Settings;
using CableJack.Infrastructure.Data;
using CableJack.Infrastructure.Extensions;

namespace CableJack.Infrastructure.Services
{
    public sealed class SettingsService(CableJackDbContext db) : ISettingsService
    {
        public async Task<SystemSettingsDto> GetSettingsAsync()
        {
            var registrationMode = await db.SystemSettings
                .GetSettingAsync<RegistrationMode>(SettingKeys.RegistrationMode)
                ?? RegistrationMode.Open;

            var maxConcurrentStr = await db.SystemSettings.GetSettingAsync(SettingKeys.MaxConcurrentStreams);
            var maxConcurrent = int.TryParse(maxConcurrentStr, out var n) && n >= 1 ? n : 2;

            var paymentsEnabledStr = await db.SystemSettings.GetSettingAsync(SettingKeys.PaymentsEnabled);
            var paymentsEnforcedStr = await db.SystemSettings.GetSettingAsync(SettingKeys.PaymentsEnforced);
            var stripePublishableKey = await db.SystemSettings.GetSettingAsync(SettingKeys.StripePublishableKey);
            var stripePriceId = await db.SystemSettings.GetSettingAsync(SettingKeys.StripePriceId);

            return new SystemSettingsDto
            {
                RegistrationMode = registrationMode,
                MaxConcurrentStreams = maxConcurrent,
                PaymentsEnabled = paymentsEnabledStr == "true",
                PaymentsEnforced = paymentsEnforcedStr == "true",
                StripePublishableKey = stripePublishableKey,
                StripePriceId = stripePriceId,
            };
        }

        public async Task<SystemSettingsDto> UpdateSettingsAsync(SystemSettingsDto dto)
        {
            await db.SystemSettings.SetSettingAsync(SettingKeys.RegistrationMode, dto.RegistrationMode);
            await db.SystemSettings.SetSettingAsync(SettingKeys.MaxConcurrentStreams, dto.MaxConcurrentStreams.ToString());
            await db.SystemSettings.SetSettingAsync(SettingKeys.PaymentsEnabled, dto.PaymentsEnabled ? "true" : "false");
            await db.SystemSettings.SetSettingAsync(SettingKeys.PaymentsEnforced, dto.PaymentsEnforced ? "true" : "false");
            await db.SystemSettings.SetSettingAsync(SettingKeys.StripePublishableKey, dto.StripePublishableKey ?? string.Empty);
            await db.SystemSettings.SetSettingAsync(SettingKeys.StripePriceId, dto.StripePriceId ?? string.Empty);
            await db.SaveChangesAsync();
            return await GetSettingsAsync();
        }
    }
}
