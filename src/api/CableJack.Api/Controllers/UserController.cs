using CableJack.Core.DTOs;
using CableJack.Core.Services;
using Microsoft.AspNetCore.Mvc;

namespace CableJack.Api.Controllers
{
    [ApiController]
    [Route("api/users")]
    public class UserController(IUserService userService) : ControllerBase
    {
        [HttpGet]
        public async Task<List<UserResponse>> GetUsers()
        {
            return await userService.GetUsers();
        }

        [HttpGet("{userId:int}")]
        public async Task<ActionResult<UserResponse>> GetUser(int userId)
        {
            var user = await userService.GetUserById(userId);
            return user is null ? NotFound() : Ok(user);
        }
    }
}
