using CableJack.Core.DTOs;
using CableJack.Core.Interfaces;
using CableJack.Core.Models;
using CableJack.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CableJack.Infrastructure.Services
{
    public sealed class ProviderService(CableJackDbContext db) : IProviderService
    {
        public async Task<List<ProviderResponse>> GetAllAsync()
        {
            return await db.Providers
                .OrderBy(p => p.Name)
                .Select(p => ToResponse(p))
                .ToListAsync();
        }

        public async Task<ProviderResponse?> GetByIdAsync(int id)
        {
            return await db.Providers
                .Where(p => p.Id == id)
                .Select(p => ToResponse(p))
                .FirstOrDefaultAsync();
        }

        public async Task<ProviderResponse> CreateAsync(CreateProviderRequest request)
        {
            var provider = new Provider
            {
                Id = 0,
                Name = request.Name,
                BaseUrl = request.BaseUrl,
                Username = request.Username,
                Password = request.Password,
                MaxConcurrentStreams = request.MaxConcurrentStreams,
                ExpiresAt = request.ExpiresAt,
            };

            db.Providers.Add(provider);
            await db.SaveChangesAsync();
            return ToResponse(provider);
        }

        public async Task<ProviderResponse?> UpdateAsync(int id, UpdateProviderRequest request)
        {
            var provider = await db.Providers.FindAsync(id);
            if (provider is null) return null;

            if (request.Name is not null) provider.Name = request.Name;
            if (request.BaseUrl is not null) provider.BaseUrl = request.BaseUrl;
            if (request.Username is not null) provider.Username = request.Username;
            if (request.Password is not null) provider.Password = request.Password;
            if (request.MaxConcurrentStreams is not null) provider.MaxConcurrentStreams = request.MaxConcurrentStreams.Value;
            if (request.ExpiresAt is not null) provider.ExpiresAt = request.ExpiresAt;

            await db.SaveChangesAsync();
            return ToResponse(provider);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var provider = await db.Providers.FindAsync(id);
            if (provider is null) return false;

            db.Providers.Remove(provider);
            await db.SaveChangesAsync();
            return true;
        }

        private static ProviderResponse ToResponse(Provider p) => new()
        {
            Id = p.Id,
            Name = p.Name,
            BaseUrl = p.BaseUrl,
            Username = p.Username,
            Password = p.Password,
            MaxConcurrentStreams = p.MaxConcurrentStreams,
            ExpiresAt = p.ExpiresAt,
        };
    }
}
