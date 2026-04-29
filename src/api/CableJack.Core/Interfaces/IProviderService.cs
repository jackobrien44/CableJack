using CableJack.Core.DTOs;

namespace CableJack.Core.Interfaces
{
    public interface IProviderService
    {
        Task<List<ProviderResponse>> GetAllAsync();
        Task<ProviderResponse?> GetByIdAsync(int id);
        Task<ProviderResponse> CreateAsync(CreateProviderRequest request);
        Task<ProviderResponse?> UpdateAsync(int id, UpdateProviderRequest request);
        Task<bool> DeleteAsync(int id);
    }
}
