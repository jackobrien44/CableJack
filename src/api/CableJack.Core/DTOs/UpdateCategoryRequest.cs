using System.ComponentModel.DataAnnotations;

namespace CableJack.Core.DTOs
{
    public sealed class UpdateCategoryRequest
    {
        [MaxLength(100)]
        public string? Name { get; set; }

        public int? SortOrder { get; set; }
    }
}
