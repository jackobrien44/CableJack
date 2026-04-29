namespace CableJack.Core.Settings
{
    public sealed class StreamingSettings
    {
        public string FfmpegPath { get; set; } = "ffmpeg";
        public string OutputPath { get; set; } = "wwwroot/streams";
        public int HlsTime { get; set; } = 6;
        public int HlsListSize { get; set; } = 30;
    }
}
