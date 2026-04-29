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

            return new SystemSettingsDto
            {
                RegistrationMode = registrationMode,
                MaxConcurrentStreams = maxConcurrent,
            };
        }

        public async Task<SystemSettingsDto> UpdateSettingsAsync(SystemSettingsDto dto)
        {
            await db.SystemSettings.SetSettingAsync(SettingKeys.RegistrationMode, dto.RegistrationMode);
            await db.SystemSettings.SetSettingAsync(SettingKeys.MaxConcurrentStreams, dto.MaxConcurrentStreams.ToString());
            await db.SaveChangesAsync();
            return await GetSettingsAsync();
        }
    }
}
