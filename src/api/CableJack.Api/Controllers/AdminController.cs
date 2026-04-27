using CableJack.Core.DTOs;
using CableJack.Core.Interfaces;
using CableJack.Core.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CableJack.Api.Controllers
{
    [ApiController]
    [Route("api/admin")]
    [Authorize(Roles = "Administrator")]
    public class AdminController(IUserService userService, IStreamService streamService) : ControllerBase
    {
        [HttpGet("users")]
        public async Task<List<UserResponse>> GetUsers()
        {
            return await userService.GetUsers();
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
        public async Task<List<StreamResponse>> GetAllStreams()
        {
            return await streamService.GetAllStreamsAsync();
        }
    }
}
