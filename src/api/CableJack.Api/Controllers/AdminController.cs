using CableJack.Core.DTOs;
using CableJack.Core.Interfaces;
using CableJack.Core.Services;
using CableJack.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace CableJack.Api.Controllers
{
    [ApiController]
    [Route("api/admin")]
    [Authorize(Roles = "Administrator")]
    public class AdminController(
        IUserService userService,
        IStreamService streamService,
        IChannelService channelService,
        IImportService importService,
        ISettingsService settingsService,
        IDashboardService dashboardService,
        IAuditService audit,
        CableJackDbContext db) : ControllerBase
    {
        [HttpGet("settings")]
        public async Task<ActionResult<SystemSettingsDto>> GetSettings()
        {
            var settings = await settingsService.GetSettingsAsync();
            return Ok(settings);
        }

        [HttpPut("settings")]
        public async Task<ActionResult<SystemSettingsDto>> UpdateSettings([FromBody] SystemSettingsDto request)
        {
            var settings = await settingsService.UpdateSettingsAsync(request);
            await audit.LogAsync("SettingsUpdated", "Updated system settings");
            return Ok(settings);
        }

        [HttpPost("users")]
        public async Task<ActionResult<UserResponse>> CreateUser([FromBody] CreateUserRequest request)
        {
            try
            {
                var user = await userService.CreateUserAsync(request);
                await audit.LogAsync("UserCreated", $"Created user: {user.Username}", "User", user.Id);
                return CreatedAtAction(nameof(GetUser), new { userId = user.Id }, user);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        [HttpGet("users")]
        public async Task<PagedResult<UserResponse>> GetUsers([FromQuery] PaginationParams pagination)
        {
            return await userService.GetUsers(pagination);
        }

        [HttpGet("users/{userId:int}")]
        public async Task<ActionResult<UserResponse>> GetUser(int userId)
        {
            var user = await userService.GetUserById(userId);
            return user is null ? NotFound() : Ok(user);
        }

        [HttpPut("users/{userId:int}")]
        public async Task<ActionResult<UserResponse>> UpdateUser(int userId, [FromBody] UpdateUserRequest request)
        {
            var user = await userService.UpdateUserAsync(userId, request);
            if (user is null) return NotFound();
            await audit.LogAsync("UserUpdated", $"Updated user: {user.Username}", "User", userId);
            return Ok(user);
        }

        [HttpPost("users/{userId:int}/reset-password")]
        public async Task<IActionResult> ResetUserPassword(int userId, [FromBody] AdminResetPasswordRequest request)
        {
            var result = await userService.AdminResetPasswordAsync(userId, request);
            if (!result) return NotFound();
            await audit.LogAsync("PasswordReset", $"Admin reset password for user #{userId}", "User", userId);
            return NoContent();
        }

        [HttpDelete("users/{userId:int}")]
        public async Task<IActionResult> DeleteUser(int userId)
        {
            var deleted = await userService.DeleteUserAsync(userId);
            if (!deleted) return NotFound();
            await audit.LogAsync("UserDeleted", $"Deleted user #{userId}", "User", userId);
            return NoContent();
        }

        [HttpGet("dashboard")]
        public async Task<ActionResult<DashboardStatsDto>> GetDashboardStats() =>
            Ok(await dashboardService.GetStatsAsync());

        [HttpGet("dashboard/recent-history")]
        public async Task<ActionResult<List<WatchSessionDto>>> GetRecentHistory() =>
            Ok(await dashboardService.GetRecentHistoryAsync());

        [HttpGet("dashboard/top-channels")]
        public async Task<ActionResult<List<TopChannelDto>>> GetTopChannels() =>
            Ok(await dashboardService.GetTopChannelsAsync());

        [HttpGet("dashboard/user-stats")]
        public async Task<ActionResult<List<UserStatDto>>> GetUserStats() =>
            Ok(await dashboardService.GetUserStatsAsync());

        [HttpGet("dashboard/errors")]
        public async Task<ActionResult<List<StreamResponse>>> GetErrorStreams() =>
            Ok(await dashboardService.GetErrorStreamsAsync());

        [HttpGet("history")]
        public async Task<ActionResult<PagedResult<WatchSessionDto>>> GetAdminHistory([FromQuery] PaginationParams pagination, [FromQuery] int? userId, [FromQuery] string? search)
        {
            return Ok(await dashboardService.GetAdminHistoryAsync(pagination, userId, search));
        }

        [HttpGet("audit")]
        public async Task<ActionResult<PagedResult<AuditLogDto>>> GetAuditLogs([FromQuery] PaginationParams pagination, [FromQuery] string? search, [FromQuery] string? action)
        {
            var query = db.AuditLogs.AsQueryable();

            if (!string.IsNullOrWhiteSpace(action))
                query = query.Where(a => a.Action == action);

            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(a =>
                    (a.Description != null && a.Description.Contains(search)) ||
                    (a.ActorUsername != null && a.ActorUsername.Contains(search)));

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(a => a.Timestamp)
                .Skip((pagination.Page - 1) * pagination.PageSize)
                .Take(pagination.PageSize)
                .Select(a => new AuditLogDto
                {
                    Id = a.Id,
                    Timestamp = a.Timestamp,
                    Action = a.Action,
                    ActorId = a.ActorId,
                    ActorUsername = a.ActorUsername,
                    TargetType = a.TargetType,
                    TargetId = a.TargetId,
                    Description = a.Description,
                    IpAddress = a.IpAddress,
                })
                .ToListAsync();

            return Ok(new PagedResult<AuditLogDto>
            {
                Items = items,
                Page = pagination.Page,
                PageSize = pagination.PageSize,
                TotalCount = total,
            });
        }

        [HttpGet("streams")]
        public async Task<PagedResult<StreamResponse>> GetAllStreams([FromQuery] PaginationParams pagination)
        {
            return await streamService.GetAllStreamsAsync(pagination);
        }

        [HttpPost("streams/{id:int}/stop")]
        public async Task<ActionResult<StreamResponse>> AdminStopStream(int id)
        {
            var stream = await streamService.AdminStopStreamAsync(id);
            if (stream is null) return NotFound();
            await audit.LogAsync("StreamKilled", $"Admin killed stream #{id}", "Stream", id);
            return Ok(stream);
        }

        [HttpGet("channels")]
        public async Task<PagedResult<ChannelResponse>> GetAllChannels([FromQuery] PaginationParams pagination, [FromQuery] int? categoryId)
        {
            return await channelService.GetChannelsAsync(pagination, categoryId, includeInactive: true);
        }

        [HttpPost("channels/import")]
        public async Task<ActionResult<ImportResult>> ImportM3U(IFormFile file, [FromQuery] int? providerId)
        {
            if (file.Length == 0)
                return BadRequest(new { message = "File is empty." });

            using var stream = file.OpenReadStream();
            var result = await importService.ImportM3UAsync(stream, providerId);
            await audit.LogAsync("ImportCompleted", $"Imported {result.ChannelsCreated} channels from file upload");
            return Ok(result);
        }

        [HttpPost("channels/import-url")]
        public async Task<ActionResult<ImportResult>> ImportM3UFromUrl([FromBody] ImportUrlRequest request)
        {
            using var http = new HttpClient();
            http.Timeout = TimeSpan.FromSeconds(30);
            using var response = await http.GetAsync(request.Url, HttpCompletionOption.ResponseHeadersRead);

            if (!response.IsSuccessStatusCode)
                return BadRequest(new { message = $"Failed to fetch URL: {(int)response.StatusCode} {response.ReasonPhrase}" });

            using var stream = await response.Content.ReadAsStreamAsync();
            var result = await importService.ImportM3UAsync(stream, request.ProviderId);
            await audit.LogAsync("ImportCompleted", $"Imported {result.ChannelsCreated} channels from URL");
            return Ok(result);
        }
    }
}

public sealed class ImportUrlRequest
{
    [Required]
    [Url]
    public required string Url { get; set; }
    public int? ProviderId { get; set; }
}
