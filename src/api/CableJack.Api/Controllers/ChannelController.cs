using CableJack.Core.DTOs;
using CableJack.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CableJack.Api.Controllers
{
    [ApiController]
    [Route("api/channels")]
    public class ChannelController(IChannelService channelService, IAuditService audit) : ControllerBase
    {
        [HttpGet]
        public async Task<PagedResult<ChannelResponse>> GetChannels([FromQuery] PaginationParams pagination, [FromQuery] int? categoryId, [FromQuery] int? providerId, [FromQuery] string? search)
        {
            return await channelService.GetChannelsAsync(pagination, categoryId, search: search, providerId: providerId);
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
            await audit.LogAsync("ChannelCreated", $"Created channel: {channel.Name}", "Channel", channel.Id);
            return CreatedAtAction(nameof(GetChannel), new { id = channel.Id }, channel);
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ChannelResponse>> UpdateChannel(int id, [FromBody] UpdateChannelRequest request)
        {
            var channel = await channelService.UpdateChannelAsync(id, request);
            if (channel is null) return NotFound();
            await audit.LogAsync("ChannelUpdated", $"Updated channel: {channel.Name}", "Channel", id);
            return Ok(channel);
        }

        [HttpDelete]
        [Authorize(Roles = "Administrator")]
        public async Task<IActionResult> DeleteAllChannels()
        {
            var count = await channelService.DeleteAllChannelsAsync();
            await audit.LogAsync("ChannelDeleteAll", $"Deleted all channels ({count})");
            return Ok(new { deleted = count });
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Administrator")]
        public async Task<IActionResult> DeleteChannel(int id)
        {
            var deleted = await channelService.DeleteChannelAsync(id);
            if (!deleted) return NotFound();
            await audit.LogAsync("ChannelDeleted", $"Deleted channel #{id}", "Channel", id);
            return NoContent();
        }
    }
}
