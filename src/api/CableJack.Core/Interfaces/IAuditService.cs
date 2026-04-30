namespace CableJack.Core.Interfaces
{
    public interface IAuditService
    {
        Task LogAsync(string action, string? description = null, string? targetType = null, int? targetId = null);
    }
}
