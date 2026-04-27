using CableJack.Core.DTOs;
using CableJack.Core.Interfaces;
using CableJack.Core.Models;
using CableJack.Infrastructure.Data;
using CableJack.Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;

namespace CableJack.Infrastructure.Services
{
    public sealed class CategoryService(CableJackDbContext db) : ICategoryService
    {
        public async Task<PagedResult<CategoryResponse>> GetCategoriesAsync(PaginationParams pagination)
        {
            return await db.Categories
                .OrderBy(c => c.SortOrder)
                .Select(c => new CategoryResponse
                {
                    Id = c.Id,
                    Name = c.Name,
                    SortOrder = c.SortOrder,
                })
                .ToPagedResultAsync(pagination);
        }

        public async Task<CategoryResponse?> GetCategoryByIdAsync(int id)
        {
            return await db.Categories
                .Where(c => c.Id == id)
                .Select(c => new CategoryResponse
                {
                    Id = c.Id,
                    Name = c.Name,
                    SortOrder = c.SortOrder,
                })
                .FirstOrDefaultAsync();
        }

        public async Task<CategoryResponse> CreateCategoryAsync(CreateCategoryRequest request)
        {
            var category = new Category
            {
                Id = 0,
                Name = request.Name,
                SortOrder = request.SortOrder,
            };

            db.Categories.Add(category);
            await db.SaveChangesAsync();

            return new CategoryResponse
            {
                Id = category.Id,
                Name = category.Name,
                SortOrder = category.SortOrder,
            };
        }

        public async Task<CategoryResponse?> UpdateCategoryAsync(int id, UpdateCategoryRequest request)
        {
            var category = await db.Categories.FindAsync(id);
            if (category is null) return null;

            if (request.Name is not null) category.Name = request.Name;
            if (request.SortOrder is not null) category.SortOrder = request.SortOrder.Value;

            await db.SaveChangesAsync();

            return new CategoryResponse
            {
                Id = category.Id,
                Name = category.Name,
                SortOrder = category.SortOrder,
            };
        }

        public async Task<bool> DeleteCategoryAsync(int id)
        {
            var category = await db.Categories.FindAsync(id);
            if (category is null) return false;

            db.Categories.Remove(category);
            await db.SaveChangesAsync();
            return true;
        }
    }
}
