using Microsoft.AspNetCore.Mvc;
using Muse.Audio.Api.Services;

namespace Muse.Audio.Api.Controllers;

[ApiController]
[Route("api")]
public class DiscoveryController : ControllerBase
{
    [HttpGet("discovery")]
    public IActionResult GetDiscovery()
    {
        var heroTracks = TracksData.GetByIds(new[] { "kw_118980", "kw_228908", "kw_94237" });
        var trendingTracks = TracksData.GetByIds(new[]
        {
            "kw_118980", "kw_228908", "kw_94237", "kw_440613", "kw_3195905",
            "kw_93157", "kw_28423286", "kw_198554068", "kw_6468891", "kw_6863662",
            "kw_6239218", "kw_6307329", "kw_203270215", "kw_271333", "kw_157908"
        });

        return Ok(new
        {
            heroTracks,
            trendingTracks,
            genres = new object[]
            {
                new { id = "all", name = "全部风格", icon = "Sparkles", filterKeywords = Array.Empty<string>() },
                new { id = "pop", name = "华语流行 Pop", icon = "Music", filterKeywords = new[] { "华语流行" } },
                new { id = "classic", name = "经典老歌 Classic", icon = "Heart", filterKeywords = new[] { "经典" } },
                new { id = "ballad", name = "抒情慢歌 Ballad", icon = "Sunset", filterKeywords = new[] { "抒情" } },
                new { id = "rock", name = "摇滚 Rock", icon = "Zap", filterKeywords = new[] { "摇滚" } },
                new { id = "heal", name = "治愈励志 Heal", icon = "Sun", filterKeywords = new[] { "治愈", "励志" } },
                new { id = "cantonese", name = "粤语 Cantonese", icon = "Star", filterKeywords = new[] { "粤语" } },
                new { id = "ancient", name = "古风国韵 Ancient", icon = "Compass", filterKeywords = new[] { "古风" } }
            },
            playlists = new object[]
            {
                new
                {
                    id = "pl-jay", name = "周杰伦 经典正版专区",
                    coverUrl = "https://img4.kuwo.cn/star/albumcover/500/s4s11/89/774616642.jpg",
                    description = "周杰伦全正版独家音源，包含《夜曲》、《晴天》、《七里香》、《稻香》等旷世神作。",
                    trackIds = new[] { "kw_118980", "kw_228908", "kw_94237", "kw_440613", "kw_3195905" },
                    tags = new[] { "周杰伦", "酷我正版", "经典神曲", "高保真FLAC" }
                },
                new
                {
                    id = "pl-cpop", name = "华语流行 热门推荐",
                    coverUrl = "https://img4.kuwo.cn/star/albumcover/500/s4s43/72/3847291122.jpg",
                    description = "华语乐坛最受欢迎的流行金曲，每天为你精选好歌。",
                    trackIds = new[] { "kw_93157", "kw_28423286", "kw_198554068", "kw_6468891", "kw_6863662", "kw_6307329" },
                    tags = new[] { "华语流行", "精选", "热门", "每日更新" }
                },
                new
                {
                    id = "pl-chill", name = "治愈系 抒情慢歌",
                    coverUrl = "https://img4.kuwo.cn/star/albumcover/500/s4s44/67/3947477141.jpg",
                    description = "温暖人心的抒情歌曲，适合独处时光静静聆听。",
                    trackIds = new[] { "kw_6239218", "kw_203270215", "kw_6307329", "kw_157908" },
                    tags = new[] { "治愈", "抒情", "慢歌", "安静" }
                },
                new
                {
                    id = "pl-classic", name = "华语经典 永恒金曲",
                    coverUrl = "https://img4.kuwo.cn/star/albumcover/500/s4s43/72/3847291122.jpg",
                    description = "跨越时代的经典之作，传唱不衰的华语音乐瑰宝。",
                    trackIds = new[] { "kw_157908", "kw_271333", "kw_118980", "kw_228908", "kw_94237" },
                    tags = new[] { "经典", "永恒", "传唱", "怀旧" }
                }
            }
        });
    }

    [HttpGet("tracks/batch")]
    public IActionResult GetTracksByIds([FromQuery] string ids)
    {
        if (string.IsNullOrWhiteSpace(ids))
            return Ok(Array.Empty<object>());

        var idList = ids.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var tracks = TracksData.GetByIds(idList);
        return Ok(tracks);
    }
}
