using Microsoft.AspNetCore.Mvc;

namespace CableJack.Api.Controllers
{
    public class AuthController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
