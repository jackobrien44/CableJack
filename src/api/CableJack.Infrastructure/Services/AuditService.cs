using System.Security.Claims;
using CableJack.Core.Interfaces;
using CableJack.Core.Models;
using CableJack.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace CableJack.Infrastructure.Services
{
    public sealed class AuditService(CableJackDbContext db, IHttpContextAccessor httpContextAccessor, ILogger<AuditService> logger) : IAuditService
    {
        public async Task LogAsync(string action, string? description = null, string? targetType = null, int? targetId = null)
        {
            var ctx = httpContextAccessor.HttpContext;

            int? actorId = null;
            string? actorUsername = null;

            if (ctx?.User.Identity?.IsAuthenticated == true)
            {
                var idClaim = ctx.User.FindFirst(ClaimTypes.NameIdentifier) ?? ctx.User.FindFirst("sub");
                if (idClaim is not null && int.TryParse(idClaim.Value, out var id))
                    actorId = id;
                actorUsername = ctx.User.Identity.Name;
            }

            var ip = ctx?.Connection.RemoteIpAddress;
            var ipAddress = ip is not null
                ? (ip.IsIPv4MappedToIPv6 ? ip.MapToIPv4().ToString() : ip.ToString())
                : null;

            db.AuditLogs.Add(new AuditLog
            {
                Timestamp = DateTime.UtcNow,
                Action = action,
                ActorId = actorId,
                ActorUsername = actorUsername,
                TargetType = targetType,
                TargetId = targetId,
                Description = description,
                IpAddress = ipAddress,
            });

            await db.SaveChangesAsync();

            logger.LogInformation(
                "[Audit] {Action} | Actor: {Actor} | {Description} | IP: {IP}",
                action,
                actorUsername ?? "anonymous",
                description ?? string.Empty,
                ipAddress ?? "unknown");
        }
    }
}
