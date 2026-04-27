using CableJack.Core.DTOs;

namespace CableJack.Core.Interfaces
{
    public interface ICategoryService
    {
        Task<List<CategoryResponse>> GetCategoriesAsync();
        Task<CategoryResponse?> GetCategoryByIdAsync(int id);
        Task<CategoryResponse> CreateCategoryAsync(CreateCategoryRequest request);
        Task<CategoryResponse?> UpdateCategoryAsync(int id, UpdateCategoryRequest request);
        Task<bool> DeleteCategoryAsync(int id);
    }
}
