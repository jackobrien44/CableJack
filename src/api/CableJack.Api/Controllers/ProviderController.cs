using CableJack.Core.DTOs;
using CableJack.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CableJack.Api.Controllers
{
    [ApiController]
    [Route("api/providers")]
    public class ProviderController(IProviderService providerService, IImportService importService) : ControllerBase
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
            return CreatedAtAction(nameof(GetById), new { id = provider.Id }, provider);
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ProviderResponse>> Update(int id, [FromBody] UpdateProviderRequest request)
        {
            var provider = await providerService.UpdateAsync(id, request);
            return provider is null ? NotFound() : Ok(provider);
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Administrator")]
        public async Task<IActionResult> Delete(int id)
        {
            var deleted = await providerService.DeleteAsync(id);
            return deleted ? NoContent() : NotFound();
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
            return Ok(result);
        }
    }
}
