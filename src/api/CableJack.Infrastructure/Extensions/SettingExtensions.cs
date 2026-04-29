using CableJack.Core.Models;
using Microsoft.EntityFrameworkCore;

namespace CableJack.Infrastructure.Extensions
{
    public static class SettingExtensions
    {
        public static async Task<T?> GetSettingAsync<T>(this DbSet<SystemSetting> settings, string key) where T : struct, Enum
        {
            var setting = await settings.FirstOrDefaultAsync(s => s.Key == key);
            if (setting is null) return null;

            return Enum.TryParse<T>(setting.Value, ignoreCase: true, out var result) ? result : null;
        }

        public static async Task<string?> GetSettingAsync(this DbSet<SystemSetting> settings, string key)
        {
            var setting = await settings.FirstOrDefaultAsync(s => s.Key == key);
            return setting?.Value;
        }

        public static async Task SetSettingAsync<T>(this DbSet<SystemSetting> settings, string key, T value) where T : struct, Enum
        {
            var setting = await settings.FirstOrDefaultAsync(s => s.Key == key);
            if (setting is null)
            {
                settings.Add(new SystemSetting
                {
                    Key = key,
                    Value = value.ToString(),
                    CreatedAt = DateTime.UtcNow,
                    ModifiedAt = DateTime.UtcNow,
                });
            }
            else
            {
                setting.Value = value.ToString();
                setting.ModifiedAt = DateTime.UtcNow;
            }
        }

        public static async Task SetSettingAsync(this DbSet<SystemSetting> settings, string key, string value)
        {
            var setting = await settings.FirstOrDefaultAsync(s => s.Key == key);
            if (setting is null)
            {
                settings.Add(new SystemSetting
                {
                    Key = key,
                    Value = value,
                    CreatedAt = DateTime.UtcNow,
                    ModifiedAt = DateTime.UtcNow,
                });
            }
            else
            {
                setting.Value = value;
                setting.ModifiedAt = DateTime.UtcNow;
            }
        }
    }
}
