using Microsoft.Extensions.Caching.Memory;
using Muse.Audio.Api.Models;

namespace Muse.Audio.Api.Services.Official;

// ── v2 DTOs ──────────────────────────────────────────────────────
public class HotKeyword
{
    public int Rank { get; set; }
    public string Keyword { get; set; } = "";
    public string? Score { get; set; }
    public string? Tag { get; set; }
}

public class SuggestItem
{
    public string Keyword { get; set; } = "";
    public string? Type { get; set; }
    public string? Hint { get; set; }
}

public class V2SearchResult
{
    public string Source { get; set; } = "all";
    public int Page { get; set; } = 1;
    public int Limit { get; set; } = 30;
    public int? Total { get; set; }
    public List<TrackInfo> Tracks { get; set; } = new();
    public Dictionary<string, string>? SourceStatus { get; set; }
}

public class V2ToplistResult
{
    public string Source { get; set; } = "";
    public string Category { get; set; } = "hot";
    public string UpdatedAt { get; set; } = DateTime.UtcNow.ToString("o");
    public List<TrackInfo> Tracks { get; set; } = new();
    public bool Degraded { get; set; }
}

/// <summary>
/// v2 orchestration: official Kuwo/NetEase clients + IMemoryCache + fallback
/// to the v1 MusicService channels so v2 endpoints never come back empty.
/// v1 code paths are NOT modified — this service merely calls into them.
/// </summary>
public class V2MusicService
{
    private static readonly TimeSpan SearchTtl = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan HotTtl = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan ToplistTtl = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan UrlTtl = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan LyricTtl = TimeSpan.FromHours(1);

    private readonly KuwoOfficialClient _kuwo;
    private readonly NetEaseOfficialClient _netease;
    private readonly MusicService _v1;
    private readonly IMemoryCache _cache;
    private readonly IConfiguration _cfg;

    public V2MusicService(KuwoOfficialClient kuwo, NetEaseOfficialClient netease, MusicService v1, IMemoryCache cache, IConfiguration cfg)
    {
        _kuwo = kuwo;
        _netease = netease;
        _v1 = v1;
        _cache = cache;
        _cfg = cfg;
    }

    // ── Search ───────────────────────────────────────────────────
    public async Task<V2SearchResult> SearchAsync(string q, int page, int limit, string source)
    {
        limit = Math.Clamp(limit, 1, 100);
        page = Math.Max(1, page);
        source = NormalizeSource(source);
        var key = $"v2:search:{source}:{q}:{page}:{limit}";

        if (_cache.TryGetValue(key, out V2SearchResult? hit) && hit is not null)
            return hit;

        var result = source switch
        {
            "kuwo" => await SearchKuwoAsync(q, page, limit),
            "netease" => await SearchNetEaseAsync(q, page, limit),
            _ => await SearchAggregatedAsync(q, page, limit),
        };

        if (result.Tracks.Count > 0)
            _cache.Set(key, result, SearchTtl);
        return result;
    }

    private async Task<V2SearchResult> SearchKuwoAsync(string q, int page, int limit)
    {
        var tracks = await _kuwo.SearchAsync(q, page, limit);
        var status = new Dictionary<string, string>();
        if (tracks.Count == 0)
        {
            // Official upstream failed/empty → v1 channel fallback.
            tracks = await _v1.SearchKuwoAsync(q, page, limit);
            status["kuwo"] = "fallback";
        }
        else
        {
            status["kuwo"] = "ok";
        }
        return new V2SearchResult
        {
            Source = "kuwo",
            Page = page,
            Limit = limit,
            Total = tracks.Count,
            Tracks = tracks,
            SourceStatus = status,
        };
    }

    private async Task<V2SearchResult> SearchNetEaseAsync(string q, int page, int limit)
    {
        var (tracks, total) = await _netease.SearchAsync(q, page, limit);
        var status = new Dictionary<string, string>();
        if (tracks.Count == 0)
        {
            tracks = await _v1.SearchNetEaseAsync(q, page, limit);
            status["netease"] = "fallback";
        }
        else
        {
            status["netease"] = "ok";
        }
        return new V2SearchResult
        {
            Source = "netease",
            Page = page,
            Limit = limit,
            Total = tracks.Count > 0 ? Math.Max(total, tracks.Count) : null,
            Tracks = tracks,
            SourceStatus = status,
        };
    }

    private async Task<V2SearchResult> SearchAggregatedAsync(string q, int page, int limit)
    {
        var kwTask = SearchKuwoAsync(q, page, limit);
        var neTask = SearchNetEaseAsync(q, page, limit);
        await Task.WhenAll(kwTask, neTask);

        var kw = kwTask.Result;
        var ne = neTask.Result;
        var status = new Dictionary<string, string>
        {
            ["kuwo"] = kw.SourceStatus?.TryGetValue("kuwo", out var ks) == true ? ks : "ok",
            ["netease"] = ne.SourceStatus?.TryGetValue("netease", out var ns) == true ? ns : "ok",
        };

        var qLower = q.ToLower();
        var merged = kw.Tracks.Concat(ne.Tracks)
            .OrderByDescending(t =>
                (t.Artist != null && (qLower.Contains(t.Artist.ToLower()) || t.Artist.ToLower().Contains(qLower)) ? 2 : 0) +
                (t.Title != null && qLower.Contains(t.Title.ToLower()) ? 1 : 0))
            .ToList();

        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var deduped = new List<TrackInfo>();
        foreach (var t in merged)
        {
            var dedupKey = $"{t.Title?.ToLower()} - {t.Artist?.ToLower()}";
            if (seen.Add(dedupKey)) deduped.Add(t);
        }

        return new V2SearchResult
        {
            Source = "all",
            Page = page,
            Limit = limit,
            Total = deduped.Count,
            Tracks = deduped.Take(limit).ToList(),
            SourceStatus = status,
        };
    }

    // ── Hot search ───────────────────────────────────────────────
    public async Task<List<HotKeyword>> HotSearchAsync(string source)
    {
        source = NormalizeSource(source);
        var key = $"v2:hot:{source}";
        if (_cache.TryGetValue(key, out List<HotKeyword>? hit) && hit is not null)
            return hit;

        var list = source switch
        {
            "kuwo" => await _kuwo.HotSearchAsync(),
            _ => await _netease.HotSearchAsync(),
        };
        if (list.Count > 0)
            _cache.Set(key, list, HotTtl);
        return list;
    }

    // ── Suggest ──────────────────────────────────────────────────
    public async Task<List<SuggestItem>> SuggestAsync(string q, string source, int limit)
    {
        limit = Math.Clamp(limit, 1, 20);
        source = NormalizeSource(source);
        var key = $"v2:suggest:{source}:{q}:{limit}";
        if (_cache.TryGetValue(key, out List<SuggestItem>? hit) && hit is not null)
            return hit;

        var list = source switch
        {
            "kuwo" => await _kuwo.SuggestAsync(q, limit),
            _ => await _netease.SuggestAsync(q, limit),
        };
        if (list.Count > 0)
            _cache.Set(key, list, SearchTtl);
        return list;
    }

    // ── Toplist ──────────────────────────────────────────────────
    public async Task<V2ToplistResult> ToplistAsync(string source, string category, int limit)
    {
        limit = Math.Clamp(limit, 1, 100);
        source = NormalizeSource(source);
        category = category is "hot" or "new" or "rise" ? category : "hot";
        var key = $"v2:toplist:{source}:{category}:{limit}";
        if (_cache.TryGetValue(key, out V2ToplistResult? hit) && hit is not null)
            return hit;

        var result = await ToplistCoreAsync(source, category, limit);
        if (result.Tracks.Count > 0)
            _cache.Set(key, result, ToplistTtl);
        return result;
    }

    private async Task<V2ToplistResult> ToplistCoreAsync(string source, string category, int limit)
    {
        var result = new V2ToplistResult { Source = source, Category = category };
        try
        {
            if (source == "kuwo")
            {
                var bangId = _cfg.GetValue($"V2:KuwoBangIds:{category}", category switch
                {
                    "new" => "622",
                    "rise" => "93",
                    _ => "17",
                }) ?? "17";
                result.Tracks = await _kuwo.ToplistAsync(bangId, limit);
            }
            else
            {
                var toplistId = _cfg.GetValue($"V2:NetEaseToplistIds:{category}", category switch
                {
                    "new" => 3779629,
                    "rise" => 19723756,
                    _ => 3778678,
                });
                result.Tracks = await _netease.ToplistAsync(toplistId.ToString(), limit);
            }
        }
        catch
        {
            result.Tracks = new List<TrackInfo>();
        }

        if (result.Tracks.Count == 0)
        {
            // Degrade: reuse v1 aggregated search for the category keyword.
            var keyword = category switch { "new" => "新歌", "rise" => "热歌飙升", _ => "热歌" };
            var fallback = await _v1.SearchAsync(keyword, 1, limit, source);
            result.Tracks = fallback.List;
            result.Degraded = true;
        }
        return result;
    }

    // ── Song URL (302 target) ────────────────────────────────────
    public async Task<(string? Url, string? Error)> ResolveSongUrlAsync(string source, string id, string quality)
    {
        source = NormalizeSource(source);
        quality = NormalizeQuality(quality);
        var key = $"v2:url:{source}:{id}:{quality}";

        if (_cache.TryGetValue(key, out (string? Url, string? Error) hit) && (hit.Url is not null || hit.Error is not null))
            return hit;

        var (url, error) = await ResolveSongUrlCoreAsync(source, id, quality);
        // Only cache concrete outcomes (positive URL or explicit VIP lock).
        if (url is not null || error == "vip_locked")
            _cache.Set(key, (url, error), UrlTtl);
        return (url, error);
    }

    private async Task<(string? Url, string? Error)> ResolveSongUrlCoreAsync(string source, string id, string quality)
    {
        if (string.IsNullOrEmpty(id)) return (null, "unavailable");

        var neteaseLocked = false;
        NetEaseMeta? neMeta = null;

        if (source == "kuwo")
        {
            var br = QualityToKuwoBr(quality);
            var url = await _kuwo.GetPlayUrlAsync(id, br);
            if (url is not null) return (url, null);
        }
        else
        {
            // Fee-aware flow (洛雪网易云分析 §6.2): VIP 单曲 fee=1 在匿名态取链接
            // 必被拦截，先查详情预判可省一次必然失败的 weapi url 请求。
            var br = QualityToNeteaseBr(quality);
            neMeta = await _netease.GetSongMetaAsync(id);
            if (neMeta is { Fee: 1 })
            {
                neteaseLocked = true;
            }
            else
            {
                var (url, vip) = await _netease.GetPlayUrlAsync(id, br);
                if (url is not null) return (url, null);
                neteaseLocked = vip;
            }
        }

        // Official channel failed → v1 third-party fallback (includes kuwo flac relays).
        var level = quality; // standard | high | lossless maps 1:1 to v1 levels
        var v1Url = await _v1.ResolveStreamUrlAsync(source, id, id, level);
        if (v1Url is not null) return (v1Url, null);

        // NetEase locked/trial (official returns a 30s preview; relays dead)
        // → cross-source rescue: locate the same song on Kuwo and resolve it
        // through the mobi.s channel, which serves paid tracks in full.
        if (source == "netease")
        {
            var kuwoUrl = await ResolveNeteaseViaKuwoAsync(id, quality, neMeta);
            if (kuwoUrl is not null) return (kuwoUrl, null);
        }

        return (null, neteaseLocked ? "vip_locked" : "unavailable");
    }

    // ── Quality ladder (aligned to the 2026-09 upstream measurements) ──
    // Kuwo effective tiers: 128kmp3 / 320kmp3 / 2000kflac (AAC/MP3-320/FLAC).
    // NetEase br: 128000 / 320000 / 999000 (flac silently downgrades to 320k
    // when the account has no flac right).
    private static string QualityToKuwoBr(string quality) => quality switch
    {
        "standard" => "128kmp3",
        "lossless" => "2000kflac",
        _ => "320kmp3", // high
    };

    private static int QualityToNeteaseBr(string quality) => quality switch
    {
        "standard" => 128000,
        "lossless" => 999000,
        _ => 320000, // high
    };

    /// <summary>Cross-source rescue for NetEase locked tracks via Kuwo mobi.s.</summary>
    private async Task<string?> ResolveNeteaseViaKuwoAsync(string neteaseId, string quality, NetEaseMeta? meta)
    {
        try
        {
            Console.WriteLine($"[v2:cross] start neId={neteaseId} q={quality}");
            meta ??= await _netease.GetSongMetaAsync(neteaseId);
            if (meta is not { } m) { Console.WriteLine("[v2:cross] meta=null"); return null; }
            var (title, artist) = (m.Title, m.Artist);
            Console.WriteLine($"[v2:cross] meta='{title}' / '{artist}'");

            var q = string.IsNullOrWhiteSpace(artist) ? title : $"{title} {artist}";
            var candidates = await _kuwo.SearchAsync(q, 1, 5);
            Console.WriteLine($"[v2:cross] kuwo hits={candidates.Count}");
            if (candidates.Count == 0) return null;

            // Prefer an exact normalized-title match; otherwise take the top hit.
            var norm = NormalizeTitle(title);
            var picked = candidates.FirstOrDefault(t => NormalizeTitle(t.Title) == norm)
                         ?? candidates[0];
            Console.WriteLine($"[v2:cross] picked rid={picked.Rid} title={picked.Title}");

            var br = quality == "standard" ? "128kmp3" : "320kmp3";
            var url = await _kuwo.GetPlayUrlAsync(picked.Rid ?? picked.SourceRawInfo?.Id ?? "", br);
            if (url is not null)
            {
                Console.WriteLine($"[v2:cross] url=OK(mobi)");
                return url;
            }

            // mobi.s intermittently answers with the unsigned stub (dur≈11s)
            // under IP rate-limiting → use the v1 kuwo relay (kw.php, real
            // signature, serves the lx transcode pool) as the final channel.
            var rid = picked.Rid ?? picked.SourceRawInfo?.Id ?? "";
            var v1KuwoUrl = await _v1.ResolveStreamUrlAsync("kuwo", rid, rid, quality);
            Console.WriteLine($"[v2:cross] url={(v1KuwoUrl is null ? "NULL" : "OK(v1)")}");
            return v1KuwoUrl;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[v2:cross] EX: {ex.Message}");
            return null;
        }
    }

    private static string NormalizeTitle(string? title) =>
        System.Text.RegularExpressions.Regex.Replace(title ?? "", @"[\s（）()\-_/·,，。]", "").ToLowerInvariant();

    // ── Lyric ────────────────────────────────────────────────────
    public async Task<LyricResponse> LyricAsync(string source, string id)
    {
        source = NormalizeSource(source);
        var key = $"v2:lyric:{source}:{id}";
        if (_cache.TryGetValue(key, out LyricResponse? hit) && hit is not null)
            return hit;

        var lrc = source == "kuwo"
            ? await _kuwo.GetLyricAsync(id)
            : await _netease.GetLyricAsync(id);

        if (string.IsNullOrEmpty(lrc.Lrc))
        {
            // v1 fallback (multi-source relay, returns Lrc/Tlyric).
            var v1Lrc = await _v1.ResolveLyricAsync(source, id, id);
            if (!string.IsNullOrEmpty(v1Lrc.Lrc))
                lrc = v1Lrc;
        }

        if (!string.IsNullOrEmpty(lrc.Lrc))
            _cache.Set(key, lrc, LyricTtl);
        return lrc;
    }

    // ── MV (NetEase official channel) ─────────────────────────────
    public async Task<(List<MvInfo> Mvs, int Total)> MvSearchAsync(string q, int page, int limit)
    {
        var key = $"v2:mvsearch:{q}:{page}:{limit}";
        if (_cache.TryGetValue(key, out (List<MvInfo> Mvs, int Total) hit))
            return hit;
        var result = await _netease.MvSearchAsync(q, page, limit);
        if (result.Mvs.Count > 0)
            _cache.Set(key, result, SearchTtl);
        return result;
    }

    public async Task<(string? Url, List<int> Resolutions)> MvUrlAsync(string id, int resolution)
    {
        var key = $"v2:mvurl:{id}";
        if (_cache.TryGetValue(key, out (string? Url, List<int> Resolutions) hit) && !string.IsNullOrEmpty(hit.Url))
            return hit;
        var result = await _netease.MvUrlAsync(id, resolution);
        if (!string.IsNullOrEmpty(result.Url))
            _cache.Set(key, result, UrlTtl);
        return result;
    }

    // ── Cover ────────────────────────────────────────────────────
    public async Task<string?> CoverUrlAsync(string source, string id)
    {
        source = NormalizeSource(source);
        var key = $"v2:cover:{source}:{id}";
        if (_cache.TryGetValue(key, out string? hit) && !string.IsNullOrEmpty(hit))
            return hit;

        string? url = null;
        if (source == "netease")
        {
            url = await _netease.GetCoverUrlAsync(id);
            url ??= (await _v1.ResolveCoverAsync("netease", id, "") is { } c && c.StartsWith("http") ? c : null);
        }
        else if (!string.IsNullOrEmpty(id))
        {
            // Kuwo covers come straight from search payloads; no standalone official
            // resolver — keep empty so the caller falls back to default art.
            url = null;
        }

        if (!string.IsNullOrEmpty(url))
            _cache.Set(key, url, TimeSpan.FromHours(1));
        return url;
    }

    // ── Song pre-check (meta + pay/fee) ──────────────────────────
    /// <summary>Meta + playability pre-check used by clients/scripts to avoid doomed url calls.</summary>
    public async Task<object?> SongInfoAsync(string source, string id)
    {
        source = NormalizeSource(source);
        if (string.IsNullOrEmpty(id)) return null;

        if (source == "kuwo")
        {
            var info = await _kuwo.GetMusicInfoAsync(id);
            if (info is null) return null;
            var (name, artist, pay) = info.Value;
            return new
            {
                source,
                id,
                title = name,
                artist,
                pay,
                payHex = pay is { } p ? "0x" + p.ToString("X") : null,
                webPlayable = pay is { } p2 && KuwoOfficialClient.IsWebPlayable(p2),
                vipLocked = pay is { } p3 && !KuwoOfficialClient.IsWebPlayable(p3),
            };
        }
        else
        {
            var meta = await _netease.GetSongMetaAsync(id);
            if (meta is not { } m) return null;
            return new
            {
                source,
                id,
                title = m.Title,
                artist = m.Artist,
                fee = m.Fee,
                vipLocked = m.Fee == 1,
            };
        }
    }

    private static string NormalizeSource(string source) => source?.ToLower().Trim() switch
    {
        "kuwo" or "kw" => "kuwo",
        "netease" or "wy" => "netease",
        _ => "all",
    };

    /// <summary>v2 quality vocabulary: standard | high | lossless (v1-style hires/super fold into lossless).</summary>
    private static string NormalizeQuality(string quality) => quality?.ToLower().Trim() switch
    {
        "standard" => "standard",
        "lossless" or "hires" or "super" or "flac" => "lossless",
        _ => "high",
    };
}
