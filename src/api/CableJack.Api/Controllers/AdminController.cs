using CableJack.Core.DTOs;
using CableJack.Core.Interfaces;
using CableJack.Core.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;

namespace CableJack.Api.Controllers
{
    [ApiController]
    [Route("api/admin")]
    [Authorize(Roles = "Administrator")]
    public class AdminController(IUserService userService, IStreamService streamService, IChannelService channelService, IImportService importService) : ControllerBase
    {
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
            return user is null ? NotFound() : Ok(user);
        }

        [HttpDelete("users/{userId:int}")]
        public async Task<IActionResult> DeleteUser(int userId)
        {
            var deleted = await userService.DeleteUserAsync(userId);
            return deleted ? NoContent() : NotFound();
        }

        [HttpGet("streams")]
        public async Task<PagedResult<StreamResponse>> GetAllStreams([FromQuery] PaginationParams pagination)
        {
            return await streamService.GetAllStreamsAsync(pagination);
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
