namespace Muse.Audio.Api.Models;

public class SearchResult
{
    public List<TrackInfo> List { get; set; } = new();
    public int Total { get; set; }
    public string Source { get; set; } = "all";
    public Dictionary<string, string>? SourceStatus { get; set; }
}

public class TrackInfo
{
    public string Id { get; set; } = "";
    public string Rid { get; set; } = "";
    public string Title { get; set; } = "未知单曲";
    public string Artist { get; set; } = "未知歌手";
    public string Album { get; set; } = "单曲合辑";
    public int Duration { get; set; } = 240;
    public string CoverUrl { get; set; } = "";
    public string AudioUrl { get; set; } = "";
    public string Genre { get; set; } = "流行音乐";
    public string Bitrate { get; set; } = "";
    public string SourceName { get; set; } = "";
    public string SourceKey { get; set; } = "";
    public int? Bpm { get; set; }
    public int? Year { get; set; }
    public string? ThemeColor { get; set; }

    /// <summary>NetEase 版权档位：0 免费 / 1 VIP / 8 数字专辑（用于取链接前预判，见洛雪网易云分析）。</summary>
    public int? Fee { get; set; }

    /// <summary>Kuwo pay 位掩码：与 0x030003 相与为 0 才可经 Web 通道播放（见酷我 API 调用机制分析）。</summary>
    public long? Pay { get; set; }

    public string? Lyrics { get; set; }
    public RawInfo? SourceRawInfo { get; set; }
}

public class RawInfo
{
    public string Id { get; set; } = "";
    public string Songmid { get; set; } = "";
    public string Name { get; set; } = "";
    public string Singer { get; set; } = "";
    public string AlbumName { get; set; } = "";
    public int Interval { get; set; }
    public string Img { get; set; } = "";
}

public class LyricResponse
{
    public string Lrc { get; set; } = "";
    public string Tlyric { get; set; } = "";
}

public class CoverResponse
{
    public string Url { get; set; } = "";
}

public class ProxyRequest
{
    public string Url { get; set; } = "";
    public string Method { get; set; } = "GET";
    public Dictionary<string, string>? Headers { get; set; }
    public object? Body { get; set; }
    public Dictionary<string, string>? Form { get; set; }
}

public class ProxyResponse
{
    public int StatusCode { get; set; }
    public Dictionary<string, string> Headers { get; set; } = new();
    public object? Body { get; set; }
    public string? Error { get; set; }
}
