using CableJack.Core.DTOs;

namespace CableJack.Core.Interfaces
{
    public interface IEpgService
    {
        Task<List<ProgrammeResponse>> GetProgrammesAsync(int channelId, DateTime? from = null, DateTime? to = null);
        Task<ProgrammeResponse?> GetNowPlayingAsync(int channelId);
        Task<ImportResult> ImportXmltvAsync(System.IO.Stream stream);
    }
}
