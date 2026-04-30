using CableJack.Core.DTOs;
using CableJack.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CableJack.Api.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController(IAuthService authService, ISettingsService settingsService, IAuditService audit) : ControllerBase
    {
        [HttpGet("registration-mode")]
        public async Task<IActionResult> GetRegistrationMode()
        {
            var settings = await settingsService.GetSettingsAsync();
            return Ok(new { registrationMode = settings.RegistrationMode });
        }

        [HttpPost("register")]
        [EnableRateLimiting("auth")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            try
            {
                var response = await authService.RegisterAsync(request);
                await audit.LogAsync("Register", $"New user registered: {request.Username}");
                return Ok(response);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        [HttpPost("login")]
        [EnableRateLimiting("auth")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            try
            {
                var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
                var deviceInfo = HttpContext.Request.Headers.UserAgent.ToString();
                var response = await authService.LoginAsync(request, ipAddress, deviceInfo);
                await audit.LogAsync("Login", $"User logged in: {request.Username}");
                return Ok(response);
            }
            catch (UnauthorizedAccessException ex)
            {
                await audit.LogAsync("LoginFailed", $"Failed login attempt for: {request.Username}");
                return Unauthorized(new { message = ex.Message });
            }
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest request)
        {
            try
            {
                var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
                var response = await authService.RefreshTokenAsync(request.RefreshToken, ipAddress);
                return Ok(response);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout([FromBody] RefreshTokenRequest request)
        {
            await authService.RevokeTokenAsync(request.RefreshToken);
            await audit.LogAsync("Logout");
            return NoContent();
        }
    }
}
