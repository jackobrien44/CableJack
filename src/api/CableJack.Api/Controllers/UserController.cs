using CableJack.Core.Models;
using Microsoft.AspNetCore.Mvc;

namespace CableJack.Api.Controllers
{
    [ApiController]
    [Route("api/users")]
    public class UserController : Controller
    {
        public UserController()
        {
        }

        [HttpGet]
        public async Task<List<User>> GetUsers()
        {

        }

        [HttpGet("{userId:int}")]
        public async Task<User> GetUser(int userId)
        {

        }
    }
}
