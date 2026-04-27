using System.Collections.Concurrent;
using System.Diagnostics;
using CableJack.Core.Enums;
using CableJack.Core.Interfaces;
using CableJack.Core.Settings;
using CableJack.Infrastructure.Data;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace CableJack.Infrastructure.Services
{
    public sealed class FFmpegService : IFFmpegService
    {
        private readonly ConcurrentDictionary<int, Process> _processes = new();
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly StreamingSettings _settings;
        private readonly string _outputRoot;

        public FFmpegService(IServiceScopeFactory scopeFactory, IConfiguration configuration, IHostEnvironment environment)
        {
            _scopeFactory = scopeFactory;
            _settings = configuration.GetSection("Streaming").Get<StreamingSettings>() ?? new();
            _outputRoot = Path.IsPathRooted(_settings.OutputPath)
                ? _settings.OutputPath
                : Path.Combine(environment.ContentRootPath, _settings.OutputPath);
        }

        public async Task<string> StartAsync(int streamId, string sourceUrl)
        {
            var slug = Guid.NewGuid().ToString("N");
            var outputDir = Path.Combine(_outputRoot, slug);
            Directory.CreateDirectory(outputDir);

            var playlistPath = Path.Combine(outputDir, "index.m3u8");
            var segmentPattern = Path.Combine(outputDir, "seg%04d.ts");
            var url = $"/streams/{slug}/index.m3u8";

            var args = string.Join(" ",
                $"-i \"{sourceUrl}\"",
                "-c copy",
                "-f hls",
                $"-hls_time {_settings.HlsTime}",
                $"-hls_list_size {_settings.HlsListSize}",
                "-hls_flags delete_segments+append_list",
                $"-hls_segment_filename \"{segmentPattern}\"",
                $"\"{playlistPath}\"");

            var process = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = _settings.FfmpegPath,
                    Arguments = args,
                    UseShellExecute = false,
                    RedirectStandardError = true,
                    RedirectStandardOutput = true,
                    CreateNoWindow = true,
                },
                EnableRaisingEvents = true,
            };

            process.Exited += (_, _) => _ = OnProcessExitedAsync(streamId);
            process.Start();
            _processes[streamId] = process;

            await UpdateStreamAsync(streamId, StreamStatus.Running, url);
            return url;
        }

        public async Task StopAsync(int streamId)
        {
            if (_processes.TryRemove(streamId, out var process))
            {
                if (!process.HasExited)
                    process.Kill(entireProcessTree: true);

                await process.WaitForExitAsync();
                process.Dispose();
            }

            await UpdateStreamAsync(streamId, StreamStatus.Stopped);
        }

        public async Task PauseAsync(int streamId)
        {
            if (_processes.TryRemove(streamId, out var process))
            {
                if (!process.HasExited)
                    process.Kill(entireProcessTree: true);

                await process.WaitForExitAsync();
                process.Dispose();
            }

            await UpdateStreamAsync(streamId, StreamStatus.Paused);
        }

        public Task<string> ResumeAsync(int streamId, string sourceUrl) =>
            StartAsync(streamId, sourceUrl);

        public bool IsRunning(int streamId) => _processes.ContainsKey(streamId);

        private async Task OnProcessExitedAsync(int streamId)
        {
            // TryRemove returns false if StopAsync already removed it — do nothing in that case
            if (!_processes.TryRemove(streamId, out var process))
                return;

            var exitCode = process.ExitCode;
            process.Dispose();

            await UpdateStreamAsync(streamId, exitCode == 0 ? StreamStatus.Stopped : StreamStatus.Error);
        }

        private async Task UpdateStreamAsync(int streamId, StreamStatus status, string? url = null)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<CableJackDbContext>();

            var stream = await db.Streams.FindAsync(streamId);
            if (stream is null) return;

            stream.Status = status;
            if (url is not null) stream.Url = url;

            await db.SaveChangesAsync();
        }
    }
}
