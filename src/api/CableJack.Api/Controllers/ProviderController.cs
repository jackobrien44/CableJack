using CableJack.Core.DTOs;
using CableJack.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CableJack.Api.Controllers
{
    [ApiController]
    [Route("api/providers")]
    public class ProviderController(IProviderService providerService, IImportService importService, IEpgService epgService, IAuditService audit) : ControllerBase
    {
        [HttpGet]
        [Authorize]
        public async Task<List<ProviderResponse>> GetAll()
        {
            return await providerService.GetAllAsync();
        }

        [HttpGet("{id:int}")]
        [Authorize]
        public async Task<ActionResult<ProviderResponse>> GetById(int id)
        {
            var provider = await providerService.GetByIdAsync(id);
            return provider is null ? NotFound() : Ok(provider);
        }

        [HttpPost]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ProviderResponse>> Create([FromBody] CreateProviderRequest request)
        {
            var provider = await providerService.CreateAsync(request);
            await audit.LogAsync("ProviderCreated", $"Created provider: {provider.Name}", "Provider", provider.Id);
            return CreatedAtAction(nameof(GetById), new { id = provider.Id }, provider);
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ProviderResponse>> Update(int id, [FromBody] UpdateProviderRequest request)
        {
            var provider = await providerService.UpdateAsync(id, request);
            if (provider is null) return NotFound();
            await audit.LogAsync("ProviderUpdated", $"Updated provider: {provider.Name}", "Provider", id);
            return Ok(provider);
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Administrator")]
        public async Task<IActionResult> Delete(int id)
        {
            var deleted = await providerService.DeleteAsync(id);
            if (!deleted) return NotFound();
            await audit.LogAsync("ProviderDeleted", $"Deleted provider #{id}", "Provider", id);
            return NoContent();
        }

        [HttpPost("{id:int}/import")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ImportResult>> Import(int id)
        {
            var provider = await providerService.GetByIdAsync(id);
            if (provider is null) return NotFound();

            if (string.IsNullOrWhiteSpace(provider.BaseUrl) ||
                string.IsNullOrWhiteSpace(provider.Username) ||
                string.IsNullOrWhiteSpace(provider.Password))
                return BadRequest(new { message = "Provider must have a base URL, username, and password to auto-import." });

            var m3uUrl = $"{provider.BaseUrl.TrimEnd('/')}/get.php?username={Uri.EscapeDataString(provider.Username)}&password={Uri.EscapeDataString(provider.Password)}&type=m3u_plus&output=ts";

            using var http = new HttpClient();
            http.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
            http.Timeout = TimeSpan.FromSeconds(60);

            using var response = await http.GetAsync(m3uUrl, HttpCompletionOption.ResponseHeadersRead);
            if (!response.IsSuccessStatusCode)
                return BadRequest(new { message = $"Failed to fetch playlist: {(int)response.StatusCode} {response.ReasonPhrase}" });

            using var stream = await response.Content.ReadAsStreamAsync();
            var result = await importService.ImportM3UAsync(stream, id, skipExisting: true);
            await audit.LogAsync("ImportCompleted", $"Imported {result.ChannelsCreated} channels from provider: {provider.Name}", "Provider", id);
            return Ok(result);
        }

        [HttpPost("{id:int}/import-epg")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ImportResult>> ImportEpg(int id)
        {
            var provider = await providerService.GetByIdAsync(id);
            if (provider is null) return NotFound();

            if (string.IsNullOrWhiteSpace(provider.BaseUrl) ||
                string.IsNullOrWhiteSpace(provider.Username) ||
                string.IsNullOrWhiteSpace(provider.Password))
                return BadRequest(new { message = "Provider must have a base URL, username, and password to import EPG." });

            var epgUrl = $"{provider.BaseUrl.TrimEnd('/')}/xmltv.php?username={Uri.EscapeDataString(provider.Username)}&password={Uri.EscapeDataString(provider.Password)}";

            using var http = new HttpClient();
            http.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
            http.Timeout = TimeSpan.FromSeconds(120);

            using var response = await http.GetAsync(epgUrl, HttpCompletionOption.ResponseHeadersRead);
            if (!response.IsSuccessStatusCode)
                return BadRequest(new { message = $"Failed to fetch EPG: {(int)response.StatusCode} {response.ReasonPhrase}" });

            using var stream = await response.Content.ReadAsStreamAsync();
            var result = await epgService.ImportXmltvAsync(stream);
            await audit.LogAsync("EpgImportCompleted", $"Imported EPG data from provider: {provider.Name}", "Provider", id);
            return Ok(result);
        }
    }
}
