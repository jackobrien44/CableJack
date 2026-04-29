using CableJack.Core.DTOs;
using CableJack.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CableJack.Api.Controllers
{
    [ApiController]
    [Route("api/providers")]
    public class ProviderController(IProviderService providerService) : ControllerBase
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
    }
}
