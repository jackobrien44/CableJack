namespace CableJack.Core.Interfaces
{
    public interface IFFmpegService
    {
        Task<string> StartAsync(int streamId, string sourceUrl);
        Task StopAsync(int streamId);
        Task PauseAsync(int streamId);
        Task<string> ResumeAsync(int streamId, string sourceUrl);
        bool IsRunning(int streamId);
    }
}
