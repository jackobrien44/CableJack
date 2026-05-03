using System.Collections.Concurrent;
using System.Diagnostics;
using CableJack.Core.Enums;
using CableJack.Core.Interfaces;
using CableJack.Core.Settings;
using CableJack.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace CableJack.Infrastructure.Services
{
    public sealed class FFmpegService : IFFmpegService, IDisposable
    {
        private readonly ConcurrentDictionary<int, Process> _processes = new();
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly StreamingSettings _settings;
        private readonly string _outputRoot;
        private readonly ILogger<FFmpegService> _logger;

        public FFmpegService(IServiceScopeFactory scopeFactory, IConfiguration configuration, IHostEnvironment environment, ILogger<FFmpegService> logger)
        {
            _scopeFactory = scopeFactory;
            _settings = configuration.GetSection("Streaming").Get<StreamingSettings>() ?? new();
            _outputRoot = Path.IsPathRooted(_settings.OutputPath)
                ? _settings.OutputPath
                : Path.Combine(environment.ContentRootPath, _settings.OutputPath);
            _logger = logger;
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
                "-avoid_negative_ts make_zero",
                $"-i \"{sourceUrl}\"",
                "-c:v copy",
                "-c:a aac",
                "-profile:a aac_low",
                "-ar 48000",
                "-ac 2",
                "-b:a 128k",
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

            process.ErrorDataReceived += (_, e) => { if (e.Data != null) _logger.LogDebug("[ffmpeg:{StreamId}] {Line}", streamId, e.Data); };
            process.Exited += (_, _) => _ = OnProcessExitedAsync(streamId);
            process.Start();
            process.BeginErrorReadLine();
            _processes[streamId] = process;

            await UpdateStreamAsync(streamId, StreamStatus.Starting, processId: process.Id);
            _logger.LogInformation("[stream:{StreamId}] ffmpeg started (pid {Pid}), waiting for playlist at {Path}", streamId, process.Id, playlistPath);

            // Wait until FFmpeg writes the first playlist before marking as Running
            var deadline = DateTime.UtcNow.AddSeconds(15);
            while (!File.Exists(playlistPath) && DateTime.UtcNow < deadline)
                await Task.Delay(200);

            if (!File.Exists(playlistPath))
            {
                var proc = _processes.GetValueOrDefault(streamId);
                if (proc is null || proc.HasExited)
                {
                    _logger.LogWarning("[stream:{StreamId}] timed out waiting for playlist and ffmpeg has exited — marking Error", streamId);
                    await UpdateStreamAsync(streamId, StreamStatus.Error);
                    return url;
                }
                _logger.LogWarning("[stream:{StreamId}] timed out waiting for playlist but ffmpeg is still running — marking Running anyway", streamId);
            }
            else
            {
                _logger.LogInformation("[stream:{StreamId}] playlist ready, marking Running. URL={Url}", streamId, url);
            }

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

        public void Dispose()
        {
            foreach (var (_, process) in _processes)
            {
                try
                {
                    if (!process.HasExited)
                        process.Kill(entireProcessTree: true);
                    process.Dispose();
                }
                catch { /* best effort */ }
            }
            _processes.Clear();
        }

        private async Task OnProcessExitedAsync(int streamId)
        {
            // TryRemove returns false if StopAsync already removed it — do nothing in that case
            if (!_processes.TryRemove(streamId, out var process))
                return;

            var exitCode = process.ExitCode;
            process.Dispose();

            _logger.LogInformation("[stream:{StreamId}] ffmpeg exited with code {ExitCode}", streamId, exitCode);
            await UpdateStreamAsync(streamId, exitCode == 0 ? StreamStatus.Stopped : StreamStatus.Error);
        }

        private async Task UpdateStreamAsync(int streamId, StreamStatus status, string? url = null, int? processId = null)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<CableJackDbContext>();

            var stream = await db.Streams.FindAsync(streamId);
            if (stream is null) return;

            stream.Status = status;
            if (url is not null) stream.Url = url;
            if (processId is not null) stream.ProcessId = processId;

            if (status is StreamStatus.Stopped or StreamStatus.Error)
            {
                stream.ProcessId = null;
                var openEntry = await db.WatchHistory
                    .Where(w => w.UserId == stream.UserId && w.ChannelId == stream.ChannelId && w.StoppedAt == null)
                    .OrderByDescending(w => w.StartedAt)
                    .FirstOrDefaultAsync();
                if (openEntry is not null)
                    openEntry.StoppedAt = DateTime.UtcNow;

                CleanupStreamDirectory(stream.Url);
            }

            await db.SaveChangesAsync();
        }

        private void CleanupStreamDirectory(string streamUrl)
        {
            try
            {
                // streamUrl is like /streams/<slug>/index.m3u8 — extract the slug
                var slug = streamUrl.Split('/', StringSplitOptions.RemoveEmptyEntries).Skip(1).FirstOrDefault();
                if (slug is null) return;

                var dir = Path.Combine(_outputRoot, slug);
                if (Directory.Exists(dir))
                {
                    Directory.Delete(dir, recursive: true);
                    _logger.LogInformation("[stream] cleaned up directory {Dir}", dir);
                }
                else
                {
                    _logger.LogDebug("[stream] cleanup skipped, directory not found: {Dir}", dir);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to clean up stream directory for {Url}", streamUrl);
            }
        }
    }
}
