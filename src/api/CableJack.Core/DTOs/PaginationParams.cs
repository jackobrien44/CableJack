namespace CableJack.Core.DTOs
{
    public sealed class PaginationParams
    {
        private int _pageSize = 25;

        public int Page { get; set; } = 1;

        public int PageSize
        {
            get => _pageSize;
            set => _pageSize = Math.Clamp(value, 1, 100);
        }
    }
}
