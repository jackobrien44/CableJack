using CableJack.Core.DTOs;
using CableJack.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CableJack.Api.Controllers
{
    [ApiController]
    [Route("api/epg")]
    public class EpgController(IEpgService epgService) : ControllerBase
    {
        [HttpGet("channels/{channelId:int}")]
        public async Task<List<ProgrammeResponse>> GetProgrammes(int channelId, [FromQuery] DateTime? from, [FromQuery] DateTime? to)
        {
            return await epgService.GetProgrammesAsync(channelId, from, to);
        }

        [HttpGet("channels/{channelId:int}/now")]
        public async Task<ActionResult<ProgrammeResponse>> GetNowPlaying(int channelId)
        {
            var programme = await epgService.GetNowPlayingAsync(channelId);
            return programme is null ? NotFound() : Ok(programme);
        }

        [HttpGet("now")]
        public async Task<List<ProgrammeResponse>> GetAllNowPlaying()
        {
            return await epgService.GetAllNowPlayingAsync();
        }

        [HttpDelete]
        [Authorize(Roles = "Administrator")]
        public async Task<IActionResult> DeleteAll()
        {
            var count = await epgService.DeleteAllAsync();
            return Ok(new { deleted = count });
        }

        [HttpPost("import")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ImportResult>> ImportXmltv(IFormFile file)
        {
            if (file.Length == 0)
                return BadRequest(new { message = "File is empty." });

            using var stream = file.OpenReadStream();
            var result = await epgService.ImportXmltvAsync(stream);
            return Ok(result);
        }
    }
}
