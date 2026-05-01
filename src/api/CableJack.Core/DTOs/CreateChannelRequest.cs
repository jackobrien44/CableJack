using System.ComponentModel.DataAnnotations;

namespace CableJack.Core.DTOs
{
    public sealed class CreateChannelRequest
    {
        [Required]
        [MaxLength(200)]
        public required string Name { get; set; }

        public string? TvgId { get; set; }

        [MaxLength(500)]
        public string? Description { get; set; }

        public string? LogoUrl { get; set; }

        [Required]
        public required int CategoryId { get; set; }

        public bool IsActive { get; set; } = true;

        public int SortOrder { get; set; }
    }
}
