using System.ComponentModel.DataAnnotations;

namespace CableJack.Core.DTOs
{
    public sealed class CreateCategoryRequest
    {
        [Required]
        [MaxLength(100)]
        public required string Name { get; set; }

        public int SortOrder { get; set; }
    }
}
