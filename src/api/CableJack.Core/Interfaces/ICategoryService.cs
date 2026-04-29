using CableJack.Core.DTOs;

namespace CableJack.Core.Interfaces
{
    public interface ICategoryService
    {
        Task<PagedResult<CategoryResponse>> GetCategoriesAsync(PaginationParams pagination);
        Task<CategoryResponse?> GetCategoryByIdAsync(int id);
        Task<CategoryResponse> CreateCategoryAsync(CreateCategoryRequest request);
        Task<CategoryResponse?> UpdateCategoryAsync(int id, UpdateCategoryRequest request);
        Task<bool> DeleteCategoryAsync(int id);
        Task<int> DeleteAllCategoriesAsync();
    }
}
