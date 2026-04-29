using CableJack.Core.DTOs;

namespace CableJack.Core.Interfaces
{
    public interface ISettingsService
    {
        Task<SystemSettingsDto> GetSettingsAsync();
        Task<SystemSettingsDto> UpdateSettingsAsync(SystemSettingsDto dto);
    }
}
