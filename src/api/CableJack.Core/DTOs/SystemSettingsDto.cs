using CableJack.Core.Enums;

namespace CableJack.Core.DTOs
{
    public class SystemSettingsDto
    {
        public RegistrationMode RegistrationMode { get; set; } = RegistrationMode.Open;
        public int MaxConcurrentStreams { get; set; } = 2;
    }
}
