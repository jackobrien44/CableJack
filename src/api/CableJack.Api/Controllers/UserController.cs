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
            var claim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub");
            if (claim is null || !int.TryParse(claim.Value, out var userId))
                return Unauthorized();

            var user = await userService.GetUserById(userId);
            return user is null ? NotFound() : Ok(user);
        }
    }
}
