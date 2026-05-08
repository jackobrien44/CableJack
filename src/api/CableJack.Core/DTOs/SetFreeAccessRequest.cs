namespace CableJack.Core.DTOs
{
    public class SetFreeAccessRequest
    {
        public required bool FreeAccess { get; set; }
        public string? Reason { get; set; }
    }
}
