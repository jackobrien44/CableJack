using System.Text;
using System.Threading.RateLimiting;
using CableJack.Core.Enums;
using CableJack.Core.Interfaces;
using CableJack.Core.Services;
using CableJack.Infrastructure.BackgroundServices;
using CableJack.Infrastructure.Data;
using CableJack.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace CableJack.Api;

public static class ServiceExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<CableJackDbContext>(options =>
            options.UseSqlite(configuration.GetConnectionString("DefaultConnection")));

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<IChannelService, ChannelService>();
        services.AddScoped<IStreamService, StreamService>();
        services.AddSingleton<IFFmpegService, FFmpegService>();
        services.AddHostedService<TokenCleanupService>();
        services.AddScoped<IImportService, ImportService>();
        services.AddScoped<IEpgService, EpgService>();
        services.AddScoped<IProviderService, ProviderService>();

        services.AddRateLimiter(options =>
        {
            options.AddPolicy("auth", httpContext => RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                factory: _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 5,
                    Window = TimeSpan.FromMinutes(1),
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                    QueueLimit = 0,
                }));

            options.RejectionStatusCode = 429;
        });

        return services;
    }

    public static IServiceCollection AddCorsPolicy(this IServiceCollection services)
    {
        services.AddCors(options =>
        {
            options.AddPolicy("Development", policy =>
            {
                policy.WithOrigins(
                    "http://localhost:3000",
                    "http://localhost:5173",
                    "http://localhost:8080")
                      .AllowAnyMethod()
                      .AllowAnyHeader();
            });
        });

        return services;
    }

    public static IServiceCollection ConfigureAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        var jwtSettings = configuration.GetSection("Jwt");

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = jwtSettings["Issuer"],
                    ValidAudience = jwtSettings["Audience"],
                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(jwtSettings["Key"]!)),
                };
            });

        services.AddAuthorization();

        return services;
    }

    public static IServiceCollection ConfigureOpenApi(this IServiceCollection services)
    {
        services.AddOpenApiDocument(config =>
        {
            config.Title = "CableJack API";
            config.AddSecurity("Bearer", new NSwag.OpenApiSecurityScheme
            {
                Type = NSwag.OpenApiSecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                Description = "Paste your JWT access token here.",
            });
            config.OperationProcessors.Add(new NSwag.Generation.Processors.Security.OperationSecurityScopeProcessor("Bearer"));
        });

        return services;
    }

    public static WebApplication UseStreamStaticFiles(this WebApplication app)
    {
        var provider = new FileExtensionContentTypeProvider();
        provider.Mappings[".m3u8"] = "application/vnd.apple.mpegurl";
        provider.Mappings[".ts"] = "video/mp2t";
        app.UseStaticFiles(new StaticFileOptions { ContentTypeProvider = provider });

        return app;
    }

    public static async Task RunStartupTasksAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CableJackDbContext>();
        await db.Database.MigrateAsync();

        var orphanedPids = await db.Streams
            .Where(s => s.ProcessId != null)
            .Select(s => s.ProcessId!.Value)
            .ToListAsync();

        foreach (var pid in orphanedPids)
        {
            try
            {
                var proc = System.Diagnostics.Process.GetProcessById(pid);
                proc.Kill(entireProcessTree: true);
                await proc.WaitForExitAsync();
                proc.Dispose();
                app.Logger.LogInformation("Killed orphaned ffmpeg process {Pid}", pid);
            }
            catch (Exception ex)
            {
                app.Logger.LogWarning(ex, "Failed to kill ffmpeg process {Pid} (may have already exited)", pid);
            }
        }

        var streamsDir = Path.Combine(app.Environment.ContentRootPath, "wwwroot", "streams");
        Directory.CreateDirectory(streamsDir);
        foreach (var dir in Directory.GetDirectories(streamsDir))
        {
            try { Directory.Delete(dir, recursive: true); }
            catch (Exception ex) { app.Logger.LogWarning(ex, "Failed to delete orphaned stream directory {Dir}", dir); }
        }

        var reset = await db.Streams
            .Where(s => s.Status == StreamStatus.Starting || s.Status == StreamStatus.Running)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, StreamStatus.Error));
        if (reset > 0)
            app.Logger.LogInformation("Reset {Count} orphaned stream(s) to Error on startup", reset);
    }
}   