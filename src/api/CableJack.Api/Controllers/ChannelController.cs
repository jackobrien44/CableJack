using Microsoft.AspNetCore.Mvc;

namespace CableJack.Api.Controllers
{
    public class ChannelController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
