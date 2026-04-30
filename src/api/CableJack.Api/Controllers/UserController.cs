using System.Security.Claims;
using CableJack.Core.DTOs;
using CableJack.Core.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CableJack.Api.Controllers
{
    [ApiController]
    [Route("api/users")]
    [Authorize]
    public class UserController(IUserService userService) : ControllerBase
    {
        [HttpGet("me")]
        public async Task<ActionResult<UserResponse>> GetMe()
        {
            var userId = GetUserId();
            if (userId is null) return Unauthorized();

            var user = await userService.GetUserById(userId.Value);
            return user is null ? NotFound() : Ok(user);
        }

        [HttpPut("me/password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            var userId = GetUserId();
            if (userId is null) return Unauthorized();

            await userService.ChangePasswordAsync(userId.Value, request);
            return NoContent();
        }

        [HttpGet("me/favorites")]
        public async Task<ActionResult<List<ChannelResponse>>> GetFavorites()
        {
            var userId = GetUserId();
            if (userId is null) return Unauthorized();

            return Ok(await userService.GetFavoritesAsync(userId.Value));
        }

        [HttpPost("me/favorites/{channelId:int}")]
        public async Task<IActionResult> AddFavorite(int channelId)
        {
            var userId = GetUserId();
            if (userId is null) return Unauthorized();

            var added = await userService.AddFavoriteAsync(userId.Value, channelId);
            return added ? NoContent() : Conflict("Channel is already in favorites.");
        }

        [HttpDelete("me/favorites/{channelId:int}")]
        public async Task<IActionResult> RemoveFavorite(int channelId)
        {
            var userId = GetUserId();
            if (userId is null) return Unauthorized();

            var removed = await userService.RemoveFavoriteAsync(userId.Value, channelId);
            return removed ? NoContent() : NotFound();
        }

        [HttpGet("me/stats")]
        public async Task<ActionResult<UserStatsDto>> GetStats()
        {
            var userId = GetUserId();
            if (userId is null) return Unauthorized();

            return Ok(await userService.GetStatsAsync(userId.Value));
        }

        [HttpGet("me/history")]
        public async Task<ActionResult<PagedResult<WatchHistoryResponse>>> GetWatchHistory([FromQuery] PaginationParams pagination)
        {
            var userId = GetUserId();
            if (userId is null) return Unauthorized();

            return Ok(await userService.GetWatchHistoryAsync(userId.Value, pagination));
        }

        private int? GetUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub");
            return claim is not null && int.TryParse(claim.Value, out var id) ? id : null;
        }
    }
}
