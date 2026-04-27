using System.ComponentModel.DataAnnotations;

namespace CableJack.Core.DTOs
{
    public sealed class UpdateChannelRequest
    {
        [MaxLength(200)]
        public string? Name { get; set; }

        public string? TvgId { get; set; }

        [MaxLength(500)]
        public string? Description { get; set; }

        public string? SourceUrl { get; set; }
        public string? LogoUrl { get; set; }
        public int? CategoryId { get; set; }
        public bool? IsActive { get; set; }
        public int? SortOrder { get; set; }
    }
}
