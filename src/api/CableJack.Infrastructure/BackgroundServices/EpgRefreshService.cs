using CableJack.Core.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;

namespace CableJack.Infrastructure.BackgroundServices
{
    public sealed class EpgRefreshService(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<EpgRefreshService> logger) : BackgroundService
    {
        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var hours = configuration.GetValue<int>("Epg:RefreshIntervalHours", 6);
            var interval = TimeSpan.FromHours(hours);

            // Wait one interval before the first run so startup isn't swamped
            await Task.Delay(interval, stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                await RefreshAllAsync(stoppingToken);
                await Task.Delay(interval, stoppingToken);
            }
        }

        private async Task RefreshAllAsync(CancellationToken ct)
        {
            using var scope = scopeFactory.CreateScope();
            var providerService = scope.ServiceProvider.GetRequiredService<IProviderService>();
            var epgService = scope.ServiceProvider.GetRequiredService<IEpgService>();

            var providers = await providerService.GetAllAsync();
            var eligible = providers.Where(p =>
                !string.IsNullOrWhiteSpace(p.BaseUrl) &&
                !string.IsNullOrWhiteSpace(p.Username) &&
                !string.IsNullOrWhiteSpace(p.Password)).ToList();

            if (eligible.Count == 0)
            {
                logger.LogDebug("EPG refresh: no providers configured, skipping.");
                return;
            }

            logger.LogInformation("EPG refresh: refreshing {Count} provider(s).", eligible.Count);

            using var http = new HttpClient();
            http.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
            http.Timeout = TimeSpan.FromSeconds(120);

            foreach (var provider in eligible)
            {
                if (ct.IsCancellationRequested) break;
                try
                {
                    var url = $"{provider.BaseUrl!.TrimEnd('/')}/xmltv.php" +
                              $"?username={Uri.EscapeDataString(provider.Username!)}" +
                              $"&password={Uri.EscapeDataString(provider.Password!)}";

                    using var response = await http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct);
                    if (!response.IsSuccessStatusCode)
                    {
                        logger.LogWarning("EPG refresh: provider '{Name}' returned {Status}.", provider.Name, (int)response.StatusCode);
                        continue;
                    }

                    using var stream = await response.Content.ReadAsStreamAsync(ct);
                    var result = await epgService.ImportXmltvAsync(stream);
                    if (result.Errors.Count > 0)
                        logger.LogWarning("EPG refresh: provider '{Name}' completed with {Errors} error(s).", provider.Name, result.Errors.Count);
                    else
                        logger.LogInformation("EPG refresh: provider '{Name}' completed successfully.", provider.Name);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    logger.LogError(ex, "EPG refresh: failed for provider '{Name}'.", provider.Name);
                }
            }
        }
    }
}
