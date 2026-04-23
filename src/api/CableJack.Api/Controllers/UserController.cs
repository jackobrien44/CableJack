using CableJack.Core.Models;
using CableJack.Core.Services;
using Microsoft.AspNetCore.Mvc;

namespace CableJack.Api.Controllers
{
    [ApiController]
    [Route("api/users")]
    public class UserController : Controller
    {
        private readonly IUserService _userService;

        public UserController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpGet]
        public async Task<List<User>> GetUsers()
        {
            return await _userService.GetUsers();
        }

        [HttpGet("{userId:int}")]
        public async Task<User> GetUser(int userId)
        {
            return await _userService.GetUserById(userId);
        }
    }
}
