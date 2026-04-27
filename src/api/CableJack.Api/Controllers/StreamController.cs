using System.Security.Claims;
using CableJack.Core.DTOs;
using CableJack.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CableJack.Api.Controllers
{
    [ApiController]
    [Route("api/streams")]
    [Authorize]
    public class StreamController(IStreamService streamService) : ControllerBase
    {
        [HttpGet]
        public async Task<ActionResult<List<StreamResponse>>> GetMyStreams()
        {
            var userId = GetUserId();
            if (userId is null) return Unauthorized();
            return await streamService.GetUserStreamsAsync(userId.Value);
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<StreamResponse>> GetStream(int id)
        {
            var userId = GetUserId();
            if (userId is null) return Unauthorized();

            var stream = await streamService.GetStreamByIdAsync(id, userId.Value);
            return stream is null ? NotFound() : Ok(stream);
        }

        [HttpPost]
        public async Task<ActionResult<StreamResponse>> StartStream([FromBody] StartStreamRequest request)
        {
            var userId = GetUserId();
            if (userId is null) return Unauthorized();

            var stream = await streamService.StartStreamAsync(request.ChannelId, userId.Value);
            return CreatedAtAction(nameof(GetStream), new { id = stream.Id }, stream);
        }

        [HttpPut("{id:int}/stop")]
        public async Task<ActionResult<StreamResponse>> StopStream(int id)
        {
            var userId = GetUserId();
            if (userId is null) return Unauthorized();

            var stream = await streamService.StopStreamAsync(id, userId.Value);
            return stream is null ? NotFound() : Ok(stream);
        }

        [HttpPut("{id:int}/pause")]
        public async Task<ActionResult<StreamResponse>> PauseStream(int id)
        {
            var userId = GetUserId();
            if (userId is null) return Unauthorized();

            var stream = await streamService.PauseStreamAsync(id, userId.Value);
            return stream is null ? NotFound() : Ok(stream);
        }

        [HttpPut("{id:int}/resume")]
        public async Task<ActionResult<StreamResponse>> ResumeStream(int id)
        {
            var userId = GetUserId();
            if (userId is null) return Unauthorized();

            var stream = await streamService.ResumeStreamAsync(id, userId.Value);
            return stream is null ? NotFound() : Ok(stream);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteStream(int id)
        {
            var userId = GetUserId();
            if (userId is null) return Unauthorized();

            var deleted = await streamService.DeleteStreamAsync(id, userId.Value);
            return deleted ? NoContent() : NotFound();
        }

        private int? GetUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub");
            return claim is not null && int.TryParse(claim.Value, out var id) ? id : null;
        }
    }
}
