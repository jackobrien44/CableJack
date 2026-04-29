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

            return new SystemSettingsDto { RegistrationMode = registrationMode };
        }

        public async Task<SystemSettingsDto> UpdateSettingsAsync(SystemSettingsDto dto)
        {
            await db.SystemSettings.SetSettingAsync(SettingKeys.RegistrationMode, dto.RegistrationMode);
            await db.SaveChangesAsync();
            return new SystemSettingsDto { RegistrationMode = dto.RegistrationMode };
        }
    }
}
