using CableJack.Core.DTOs;

namespace CableJack.Core.Interfaces
{
    public interface IImportService
    {
        Task<ImportResult> ImportM3UAsync(Stream stream, int? providerId = null, bool skipExisting = false);
    }
}
