using CableJack.Core.DTOs;
using CableJack.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CableJack.Api.Controllers
{
    [ApiController]
    [Route("api/channels")]
    public class ChannelController(IChannelService channelService) : ControllerBase
    {
        [HttpGet]
        public async Task<List<ChannelResponse>> GetChannels([FromQuery] int? categoryId)
        {
            return await channelService.GetChannelsAsync(categoryId);
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ChannelResponse>> GetChannel(int id)
        {
            var channel = await channelService.GetChannelByIdAsync(id);
            return channel is null ? NotFound() : Ok(channel);
        }

        [HttpPost]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ChannelResponse>> CreateChannel([FromBody] CreateChannelRequest request)
        {
            var channel = await channelService.CreateChannelAsync(request);
            return CreatedAtAction(nameof(GetChannel), new { id = channel.Id }, channel);
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ChannelResponse>> UpdateChannel(int id, [FromBody] UpdateChannelRequest request)
        {
            var channel = await channelService.UpdateChannelAsync(id, request);
            return channel is null ? NotFound() : Ok(channel);
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Administrator")]
        public async Task<IActionResult> DeleteChannel(int id)
        {
            var deleted = await channelService.DeleteChannelAsync(id);
            return deleted ? NoContent() : NotFound();
        }
    }
}
