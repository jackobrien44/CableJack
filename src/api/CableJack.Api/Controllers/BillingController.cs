using CableJack.Core.DTOs;
using CableJack.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace CableJack.Api.Controllers
{
    [ApiController]
    [Route("api/billing")]
    public class BillingController(IBillingService billingService) : ControllerBase
    {
        [HttpGet("status")]
        [Authorize]
        public async Task<ActionResult<AccessCheckResult>> GetStatus()
        {
            var userId = GetUserId();
            if (userId is null) return Unauthorized();
            return Ok(await billingService.CheckAccessAsync(userId.Value));
        }

        [HttpPost("checkout")]
        [Authorize]
        public async Task<ActionResult<object>> CreateCheckout([FromBody] CreateCheckoutRequest request)
        {
            var userId = GetUserId();
            if (userId is null) return Unauthorized();

            try
            {
                var url = await billingService.CreateCheckoutSessionAsync(userId.Value, request.SuccessUrl, request.CancelUrl);
                return Ok(new { url });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("portal")]
        [Authorize]
        public async Task<ActionResult<object>> CreatePortal([FromBody] PortalRequest request)
        {
            var userId = GetUserId();
            if (userId is null) return Unauthorized();

            try
            {
                var url = await billingService.CreatePortalSessionAsync(userId.Value, request.ReturnUrl);
                return Ok(new { url });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("webhook")]
        [AllowAnonymous]
        public async Task<IActionResult> Webhook()
        {
            var signature = Request.Headers["Stripe-Signature"].FirstOrDefault();
            if (string.IsNullOrEmpty(signature)) return BadRequest();

            string payload;
            using (var reader = new StreamReader(Request.Body))
                payload = await reader.ReadToEndAsync();

            var handled = await billingService.HandleWebhookAsync(payload, signature);
            return handled ? Ok() : BadRequest();
        }

        private int? GetUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub");
            return claim is not null && int.TryParse(claim.Value, out var id) ? id : null;
        }
    }

    public class PortalRequest
    {
        public required string ReturnUrl { get; set; }
    }
}
