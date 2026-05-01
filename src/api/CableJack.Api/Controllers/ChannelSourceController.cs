using CableJack.Core.DTOs;
using CableJack.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CableJack.Api.Controllers
{
    [ApiController]
    [Route("api/channels/{channelId:int}/sources")]
    [Authorize(Roles = "Administrator")]
    public class ChannelSourceController(IChannelSourceService channelSourceService) : ControllerBase
    {
        [HttpGet]
        public async Task<List<ChannelSourceResponse>> GetSources(int channelId)
        {
            return await channelSourceService.GetByChannelAsync(channelId);
        }

        [HttpPost]
        public async Task<ActionResult<ChannelSourceResponse>> AddSource(int channelId, [FromBody] CreateChannelSourceRequest request)
        {
            var source = await channelSourceService.CreateAsync(channelId, request);
            return source is null ? NotFound() : CreatedAtAction(nameof(GetSources), new { channelId }, source);
        }

        [HttpPut("{sourceId:int}/priority")]
        public async Task<ActionResult<ChannelSourceResponse>> UpdatePriority(int channelId, int sourceId, [FromBody] int priority)
        {
            var source = await channelSourceService.UpdatePriorityAsync(channelId, sourceId, priority);
            return source is null ? NotFound() : Ok(source);
        }

        [HttpDelete("{sourceId:int}")]
        public async Task<IActionResult> DeleteSource(int channelId, int sourceId)
        {
            var deleted = await channelSourceService.DeleteAsync(channelId, sourceId);
            return deleted ? NoContent() : NotFound();
        }
    }
}
