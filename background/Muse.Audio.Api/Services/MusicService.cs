using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Muse.Audio.Api.Models;

namespace Muse.Audio.Api.Services;

public class MusicService
{
    private static readonly HttpClient SharedHttp = new(new HttpClientHandler
    {
        AutomaticDecompression = DecompressionMethods.All,
        AllowAutoRedirect = true
    });

    private static readonly Dictionary<string, string> NetEaseCoverCache = new();

    // Resolved audio URLs by $"{source}:{id}:{level}" — kuwo upstream resolves slowly (10-20s),
    // so remember successes to make replays/quality-switches feel instant.
    private static readonly Dictionary<string, (string Url, DateTime Expires)> ResolvedStreamCache = new();
    private static readonly TimeSpan StreamCacheTtl = TimeSpan.FromMinutes(10);

    private static string DefaultFallback =>
        "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80";

    // First-choice online API host (PHP endpoints: kwsc.php / kw.php / kggc.php / ...).
    private const string NewApiBase = "http://124.223.119.127:3202";

    // ── Search Kuwo ──────────────────────────────────────────────
    public async Task<List<TrackInfo>> SearchKuwoAsync(string query, int page = 1, int limit = 25)
    {
        // 第一选择：使用在线 API http://124.223.119.127:3202/kwsc.php
        var newApi = await SearchKuwoViaNewApiAsync(query, page, limit);
        if (newApi.Count > 0) return newApi;

        // 兜底：原有 search.kuwo.cn 接口
        return await SearchKuwoLegacyAsync(query, page, limit);
    }

    private async Task<List<TrackInfo>> SearchKuwoViaNewApiAsync(string query, int page = 1, int limit = 25)
    {
        try
        {
            var pn = Math.Max(1, page);
            var url = $"{NewApiBase}/kwsc.php?key={Uri.EscapeDataString(query)}&pn={pn}&rn={limit}";
            var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
            var resp = await SharedHttp.SendAsync(req);
            resp.EnsureSuccessStatusCode();
            var json = await resp.Content.ReadFromJsonAsync<JsonElement>();

            if (!json.TryGetProperty("data", out var data) ||
                !data.TryGetProperty("songs", out var songs) ||
                songs.ValueKind != JsonValueKind.Array)
                return new List<TrackInfo>();

            var result = new List<TrackInfo>();
            foreach (var item in songs.EnumerateArray())
            {
                var rid = item.TryGetProperty("rid", out var ridP) ? ridP.ToString() : "";
                if (string.IsNullOrEmpty(rid)) continue;
                var title = item.TryGetProperty("name", out var nP) ? nP.GetString() ?? "未知单曲" : "未知单曲";
                var artist = item.TryGetProperty("artist", out var arP) ? arP.GetString() ?? "未知歌手" : "未知歌手";
                var album = item.TryGetProperty("album", out var alP) ? alP.GetString() ?? "单曲合辑" : "单曲合辑";
                var coverUrl = item.TryGetProperty("pic", out var picP) ? picP.GetString() ?? "" : "";
                var dur = item.TryGetProperty("duration", out var duP)
                    ? (duP.ValueKind == JsonValueKind.Number ? duP.GetInt32() : int.TryParse(duP.ToString(), out var dd) ? dd : 240)
                    : 240;
                if (dur <= 0) dur = 240;
                if (!coverUrl.StartsWith("http")) coverUrl = "";

                result.Add(new TrackInfo
                {
                    Id = $"kw_{rid}",
                    Rid = rid,
                    Title = title,
                    Artist = artist,
                    Album = album,
                    Duration = dur,
                    CoverUrl = coverUrl,
                    AudioUrl = $"/api/music/stream?source=kuwo&id={rid}&rid={rid}",
                    Genre = "流行音乐",
                    Bitrate = "酷我正版 FLAC / 320k",
                    SourceName = "酷我音乐",
                    SourceKey = "kw",
                    SourceRawInfo = new RawInfo
                    {
                        Id = rid, Songmid = rid,
                        Name = title, Singer = artist, AlbumName = album,
                        Interval = dur, Img = coverUrl
                    }
                });
            }
            return result;
        }
        catch
        {
            return new List<TrackInfo>();
        }
    }

    private async Task<List<TrackInfo>> SearchKuwoLegacyAsync(string query, int page = 1, int limit = 25)
    {
        return await RetryAsync(async () =>
        {
            var pn = Math.Max(0, page - 1);
            var url = $"http://search.kuwo.cn/r.s?client=kt&all={Uri.EscapeDataString(query)}" +
                      $"&pn={pn}&rn={limit}&uid=794764098&ver=kwplayer_ar_9.2.2.1&vipver=1" +
                      $"&show_copyright_off=1&newsearch=1&ft=music&cluster=0&strategy=2012" +
                      $"&encoding=utf8&rformat=json&vermerge=1&mobi=1";

            var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
            var resp = await SharedHttp.SendAsync(req, HttpCompletionOption.ResponseHeadersRead);
            resp.EnsureSuccessStatusCode();
            var raw = await resp.Content.ReadAsStringAsync();

            JsonElement json;
            try { json = JsonSerializer.Deserialize<JsonElement>(raw); }
            catch
            {
                var clean = raw.Replace("'", "\"");
                json = JsonSerializer.Deserialize<JsonElement>(clean);
            }

            if (!json.TryGetProperty("abslist", out var abslist) || abslist.ValueKind != JsonValueKind.Array)
                return new List<TrackInfo>();

            var result = new List<TrackInfo>();
            foreach (var item in abslist.EnumerateArray())
            {
                var rid = (item.TryGetProperty("MUSICRID", out var mrid) ? mrid.GetString() ?? "" : "").Replace("MUSIC_", "");
                var coverUrl = ResolveKuwoCover(item);

                var durStr = item.TryGetProperty("DURATION", out var d) ? d.GetString() ?? "240" : "240";
                var duration = int.TryParse(durStr, out var dv) && dv > 0 ? dv : 240;

                result.Add(new TrackInfo
                {
                    Id = $"kw_{rid}",
                    Rid = rid,
                    Title = item.TryGetProperty("SONGNAME", out var sn) ? sn.GetString() ?? "未知单曲" : "未知单曲",
                    Artist = item.TryGetProperty("ARTIST", out var ar) ? ar.GetString() ?? "未知歌手" : "未知歌手",
                    Album = item.TryGetProperty("ALBUM", out var al) ? al.GetString() ?? "单曲合辑" : "单曲合辑",
                    Duration = duration,
                    CoverUrl = coverUrl,
                    AudioUrl = $"/api/music/stream?source=kuwo&id={rid}&rid={rid}",
                    Genre = item.TryGetProperty("GENRE", out var g) ? g.GetString() ?? "流行音乐" : "流行音乐",
                    Bitrate = "酷我正版 FLAC / 320k",
                    SourceName = "酷我音乐",
                    SourceKey = "kw",
                    SourceRawInfo = new RawInfo
                    {
                        Id = rid, Songmid = rid,
                        Name = item.TryGetProperty("SONGNAME", out var sn2) ? sn2.GetString() ?? "" : "",
                        Singer = item.TryGetProperty("ARTIST", out var ar2) ? ar2.GetString() ?? "" : "",
                        AlbumName = item.TryGetProperty("ALBUM", out var al2) ? al2.GetString() ?? "" : "",
                        Interval = duration, Img = coverUrl
                    }
                });
            }
            return result;
        }, new List<TrackInfo>());
    }

    // ── Search NetEase ───────────────────────────────────────────
    public async Task<List<TrackInfo>> SearchNetEaseAsync(string query, int page = 1, int limit = 25)
    {
        return await RetryAsync(async () =>
        {
            var url = $"https://music-api.gdstudio.xyz/api.php?types=search&count={limit}&source=netease&pages={page}&name={Uri.EscapeDataString(query)}";
            var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
            var resp = await SharedHttp.SendAsync(req);
            resp.EnsureSuccessStatusCode();
            var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
            if (json.ValueKind != JsonValueKind.Array) return new List<TrackInfo>();

            var result = new List<TrackInfo>();
            foreach (var item in json.EnumerateArray())
            {
                var id = item.TryGetProperty("id", out var idP) ? idP.ToString() : "";
                var artist = item.TryGetProperty("artist", out var arP)
                    ? arP.ValueKind == JsonValueKind.Array
                        ? string.Join(" / ", arP.EnumerateArray().Select(x => x.GetString()))
                        : arP.GetString() ?? "未知歌手"
                    : "未知歌手";
                var picId = item.TryGetProperty("pic_id", out var picP) ? picP.ToString() : id;
                var coverUrl = $"/api/music/cover?source=netease&id={picId}";

                result.Add(new TrackInfo
                {
                    Id = $"ne_{id}",
                    Rid = id,
                    Title = item.TryGetProperty("name", out var nP) ? nP.GetString() ?? "未知单曲" : "未知单曲",
                    Artist = artist,
                    Album = item.TryGetProperty("album", out var aP) ? aP.GetString() ?? "单曲合辑" : "单曲合辑",
                    CoverUrl = coverUrl,
                    AudioUrl = $"/api/music/stream?source=netease&id={id}",
                    Bitrate = "无损全长 FLAC / 320k",
                    SourceName = "网易云音乐",
                    SourceKey = "wy",
                    SourceRawInfo = new RawInfo
                    {
                        Id = id, Songmid = id,
                        Name = item.TryGetProperty("name", out var nP2) ? nP2.GetString() ?? "" : "",
                        Singer = artist,
                        AlbumName = item.TryGetProperty("album", out var aP2) ? aP2.GetString() ?? "" : "",
                        Interval = 240, Img = coverUrl
                    }
                });
            }
            return result;
        }, new List<TrackInfo>());
    }

    // ── Aggregated Search ────────────────────────────────────────
    public async Task<SearchResult> SearchAsync(string query, int page = 1, int limit = 25, string platform = "all")
    {
        if (string.IsNullOrWhiteSpace(query))
            return new SearchResult();

        if (platform is "kuwo" or "kw")
        {
            var list = await SearchKuwoAsync(query, page, limit);
            return new SearchResult { List = list, Total = list.Count, Source = "kuwo" };
        }
        if (platform is "netease" or "wy")
        {
            var list = await SearchNetEaseAsync(query, page, limit);
            return new SearchResult { List = list, Total = list.Count, Source = "netease" };
        }

        var kwTask = SearchKuwoAsync(query, page, limit);
        var neTask = SearchNetEaseAsync(query, page, limit);
        await Task.WhenAll(kwTask, neTask);

        var kwList = kwTask.Result;
        var neList = neTask.Result;
        var status = new Dictionary<string, string>
        {
            ["kuwo"] = kwList.Count > 0 ? "ok" : "empty",
            ["netease"] = neList.Count > 0 ? "ok" : "empty"
        };

        var qLower = query.ToLower();
        var all = kwList.Concat(neList)
            .OrderByDescending(t =>
                (t.Artist != null && (qLower.Contains(t.Artist.ToLower()) || t.Artist.ToLower().Contains(qLower)) ? 2 : 0) +
                (t.Title != null && qLower.Contains(t.Title.ToLower()) ? 1 : 0))
            .ToList();

        // Deduplicate by title+artist
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var deduped = new List<TrackInfo>();
        foreach (var t in all)
        {
            var key = $"{t.Title?.ToLower()} - {t.Artist?.ToLower()}";
            if (seen.Add(key)) deduped.Add(t);
        }

        return new SearchResult { List = deduped.Take(limit).ToList(), Total = deduped.Count, Source = "all", SourceStatus = status };
    }

    // ── Stream Resolve (Kuwo / NetEase) ──────────────────────────
    public async Task<string?> ResolveStreamUrlAsync(string source, string id, string rid, string level = "standard")
    {
        if (string.IsNullOrEmpty(id) && string.IsNullOrEmpty(rid)) return null;

        var key = $"{source}:{id ?? rid}:{level}";
        lock (ResolvedStreamCache)
        {
            if (ResolvedStreamCache.TryGetValue(key, out var hit) && hit.Expires > DateTime.UtcNow)
                return hit.Url;
        }

        var resolved = await ResolveStreamUrlCoreAsync(source, id, rid, level);
        if (!string.IsNullOrEmpty(resolved))
        {
            lock (ResolvedStreamCache)
            {
                ResolvedStreamCache[key] = (resolved, DateTime.UtcNow + StreamCacheTtl);
                if (ResolvedStreamCache.Count > 512)
                {
                    var expired = ResolvedStreamCache.Where(kv => kv.Value.Expires <= DateTime.UtcNow).Select(kv => kv.Key).ToList();
                    foreach (var k in expired) ResolvedStreamCache.Remove(k);
                }
            }
        }
        return resolved;
    }

    private async Task<string?> ResolveStreamUrlCoreAsync(string source, string id, string rid, string level)
    {
        if (string.IsNullOrEmpty(id) && string.IsNullOrEmpty(rid)) return null;

        var lvlMp3 = level == "lossless" ? "lossless" : (level == "high" || level == "super" ? "high" : "standard");
        var lvlNetease = level is "super" or "lossless" ? "lossless" : lvlMp3;

        if (source is "kuwo" or "kw" || (string.IsNullOrEmpty(source) && !string.IsNullOrEmpty(rid)))
        {
            // 第一选择：在线 API http://124.223.119.127:3202/kw.php?id= 返回多音质直链
            var newApiUrl = await ResolveKuwoViaNewApiAsync(rid, level);
            if (!string.IsNullOrEmpty(newApiUrl)) return newApiUrl;

            // 兜底：haitangw/nxinxz return full audio directly; antiserver returns only a preview URL
            var urlCandidates = new[]
            {
                $"https://musicapi.haitangw.net/music/kw.php?type=mp3&id={rid}&level={lvlMp3}",
                $"http://music.nxinxz.com/kw.php?id={rid}&level={lvlMp3}&type=mp3",
                $"https://musicapi.haitangw.net/music/kw.php?type=mp3&id={rid}&level=standard",
                $"http://music.nxinxz.com/kw.php?id={rid}&level=standard&type=mp3",
                $"http://antiserver.kuwo.cn/anti.s?type=convert_url&rid={rid}&format=mp3&response=url"
            };
            foreach (var c in urlCandidates)
            {
                try
                {
                    using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(8));
                    var req = new HttpRequestMessage(HttpMethod.Get, c);
                    req.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
                    var resp = await SharedHttp.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, cts.Token);
                    if (!resp.IsSuccessStatusCode) continue;

                    var ct = resp.Content.Headers.ContentType?.MediaType ?? "";

                    // If audio/*, the API returns raw audio directly — resolve any
                    // redirect so the frontend gets the FINAL CDN URL (no 3xx hop).
                    // Browser media stacks are unreliable on cross-origin redirects,
                    // but play a final 200/206 URL fine. Checked BEFORE reading the
                    // body so lossless FLAC (tens of MB) resolves instantly.
                    if (ct.Contains("audio") || ct.Contains("octet-stream"))
                        return FinalUrl(resp, c);

                    // If ContentLocation header has a URL, use it
                    var location = resp.Content.Headers.ContentLocation?.ToString();
                    if (!string.IsNullOrEmpty(location) && location.StartsWith("http"))
                        return location;

                    // If text/plain and looks like a URL, use it
                    var text = await resp.Content.ReadAsStringAsync();
                    if ((ct.Contains("text") || ct.Contains("json")) && text.TrimStart().StartsWith("http"))
                        return text.Trim();
                }
                catch { }
            }
        }

        if (source is "netease" or "wy" || (!string.IsNullOrEmpty(id)))
        {
            var candidates = new[]
            {
                $"https://music-api.gdstudio.xyz/api.php?types=url&id={id ?? rid}&source=netease",
                $"http://music.nxinxz.com/wy.php?id={id ?? rid}&level={lvlNetease}&type=mp3",
                $"http://music.nxinxz.com/wy.php?id={id ?? rid}&level=standard&type=mp3"
            };
            foreach (var c in candidates)
            {
                try
                {
                    using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(8));
                    if (c.Contains("gdstudio"))
                    {
                        var req = new HttpRequestMessage(HttpMethod.Get, c);
                        req.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
                        var resp = await SharedHttp.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, cts.Token);
                        var data = await resp.Content.ReadFromJsonAsync<JsonElement>();
                        if (data.TryGetProperty("url", out var urlP) && urlP.GetString()?.StartsWith("http") == true)
                            return urlP.GetString();
                    }
                    else
                    {
                        var req = new HttpRequestMessage(HttpMethod.Get, c);
                        req.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
                        var resp = await SharedHttp.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, cts.Token);
                        if (!resp.IsSuccessStatusCode) continue;

                        var ct = resp.Content.Headers.ContentType?.MediaType ?? "";

                        if (ct.Contains("audio") || ct.Contains("octet-stream"))
                            return FinalUrl(resp, c);

                        var location = resp.Content.Headers.ContentLocation?.ToString();
                        if (!string.IsNullOrEmpty(location) && location.StartsWith("http"))
                            return location;

                        var text = await resp.Content.ReadAsStringAsync();
                        if ((ct.Contains("text") || ct.Contains("json")) && text.TrimStart().StartsWith("http"))
                            return text.Trim();
                    }
                }
                catch { }
            }
        }

        return null;
    }

    // ── Lyrics Resolve ───────────────────────────────────────────
    public async Task<LyricResponse> ResolveLyricAsync(string source, string id, string rid)
    {
        var useId = !string.IsNullOrEmpty(id) ? id : rid;
        var src = source is "netease" or "wy" ? "netease" : "kuwo";

        foreach (var trySrc in new[] { src, src == "kuwo" ? "netease" : "kuwo", "kuwo" })
        {
            try
            {
                var url = $"https://music-api.gdstudio.xyz/api.php?types=lyric&id={useId}&source={trySrc}";
                var req = new HttpRequestMessage(HttpMethod.Get, url);
                req.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
                var resp = await SharedHttp.SendAsync(req);
                var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
                if (json.TryGetProperty("lyric", out var lrcP) && !string.IsNullOrEmpty(lrcP.GetString()))
                {
                    return new LyricResponse
                    {
                        Lrc = lrcP.GetString() ?? "",
                        Tlyric = json.TryGetProperty("tlyric", out var tP) ? tP.GetString() ?? "" : ""
                    };
                }
            }
            catch { }
        }

        return new LyricResponse();
    }

    // ── Cover Resolve ────────────────────────────────────────────
    public async Task<string> ResolveCoverAsync(string source, string id, string rawUrl)
    {
        if (source is "netease" or "wy" && !string.IsNullOrEmpty(id))
        {
            lock (NetEaseCoverCache)
            {
                if (NetEaseCoverCache.TryGetValue(id, out var cached))
                    return cached;
            }

            try
            {
                var url = $"https://music-api.gdstudio.xyz/api.php?types=pic&id={id}&source=netease";
                var req = new HttpRequestMessage(HttpMethod.Get, url);
                req.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
                var resp = await SharedHttp.SendAsync(req);
                var data = await resp.Content.ReadFromJsonAsync<JsonElement>();
                if (data.TryGetProperty("url", out var urlP) && !string.IsNullOrEmpty(urlP.GetString()))
                {
                    var final = urlP.GetString()!.Replace("http://", "https://");
                    lock (NetEaseCoverCache) { NetEaseCoverCache[id] = final; }
                    return final;
                }
            }
            catch { }
        }

        if (!string.IsNullOrEmpty(rawUrl))
        {
            if (rawUrl.Contains("music-api.gdstudio.xyz/api.php?types=pic"))
            {
                var match = Regex.Match(rawUrl, @"id=([^&]+)");
                if (match.Success)
                {
                    try
                    {
                        var req = new HttpRequestMessage(HttpMethod.Get, rawUrl);
                        req.Headers.Add("User-Agent", "Mozilla/5.0");
                        var resp = await SharedHttp.SendAsync(req);
                        var data = await resp.Content.ReadFromJsonAsync<JsonElement>();
                        if (data.TryGetProperty("url", out var urlP))
                            return urlP.GetString()?.Replace("http://", "https://") ?? rawUrl;
                    }
                    catch { }
                }
            }
            return rawUrl.Replace("http://", "https://");
        }

        return DefaultFallback;
    }

    // ── Stream Pipe ──────────────────────────────────────────────
    public async Task PipeAudioStreamAsync(string targetUrl, string referer, HttpContext ctx)
    {
        try
        {
            var req = new HttpRequestMessage(HttpMethod.Get, targetUrl);
            req.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
            req.Headers.Add("Accept", "*/*");
            req.Headers.Add("Referer", referer);
            if (ctx.Request.Headers.TryGetValue("Range", out var range))
                req.Headers.Add("Range", range.ToString());

            using var upstream = await SharedHttp.SendAsync(req, HttpCompletionOption.ResponseHeadersRead);

            ctx.Response.StatusCode = (int)upstream.StatusCode;
            ctx.Response.ContentType = upstream.Content.Headers.ContentType?.MediaType ?? "audio/mpeg";
            ctx.Response.Headers["Accept-Ranges"] = "bytes";
            ctx.Response.Headers["Access-Control-Allow-Origin"] = "*";
            ctx.Response.Headers["Cache-Control"] = "public, max-age=86400";

            if (upstream.Content.Headers.ContentLength.HasValue)
                ctx.Response.ContentLength = upstream.Content.Headers.ContentLength;
            var cr = upstream.Content.Headers.ContentRange?.ToString();
            if (!string.IsNullOrEmpty(cr))
                ctx.Response.Headers["Content-Range"] = cr;

            if (upstream.Content.Headers.ContentLength == 0 || upstream.Content is null)
            {
                await ctx.Response.CompleteAsync();
                return;
            }

            await using var upstreamStream = await upstream.Content.ReadAsStreamAsync();
            await upstreamStream.CopyToAsync(ctx.Response.Body);
            await ctx.Response.CompleteAsync();
        }
        catch (Exception ex)
        {
            if (!ctx.Response.HasStarted)
                await ctx.Response.WriteAsync($"Audio pipe error: {ex.Message}");
        }
    }

    // 第一选择：在线 API kw.php?id= 返回多音质直链，按所需音质挑选最佳档位
    private static async Task<string?> ResolveKuwoViaNewApiAsync(string rid, string level)
    {
        if (string.IsNullOrEmpty(rid)) return null;
        try
        {
            var url = $"{NewApiBase}/kw.php?id={rid}";
            var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(8));
            var resp = await SharedHttp.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, cts.Token);
            if (!resp.IsSuccessStatusCode) return null;
            var json = await resp.Content.ReadFromJsonAsync<JsonElement>();

            if (!json.TryGetProperty("data", out var data) || data.ValueKind != JsonValueKind.Array)
                return null;

            // 优先级：lossless->flac(SQ), high/super->mp3(HQ), standard->m4a(LQ)/ogg(MQ)
            string[] preferred;
            if (level is "lossless" or "super") preferred = new[] { "flac", "mp3" };
            else if (level is "high") preferred = new[] { "mp3", "flac" };
            else preferred = new[] { "m4a", "ogg", "mp3", "flac" };

            foreach (var want in preferred)
            {
                foreach (var item in data.EnumerateArray())
                {
                    var type = item.TryGetProperty("type", out var tP) ? tP.GetString() ?? "" : "";
                    if (!string.Equals(type, want, StringComparison.OrdinalIgnoreCase)) continue;
                    if (item.TryGetProperty("url", out var uP) && (uP.GetString() ?? "").StartsWith("http"))
                        return uP.GetString();
                }
            }
            // 无匹配档位时返回第一个可用直链
            foreach (var item in data.EnumerateArray())
            {
                if (item.TryGetProperty("url", out var uP) && (uP.GetString() ?? "").StartsWith("http"))
                    return uP.GetString();
            }
        }
        catch { }
        return null;
    }

    // ── Helpers ──────────────────────────────────────────────────
    private static string FinalUrl(HttpResponseMessage resp, string fallback)
    {
        // After AllowAutoRedirect, RequestMessage.RequestUri holds the FINAL URL.
        var final = resp.RequestMessage?.RequestUri?.ToString();
        if (!string.IsNullOrEmpty(final) && final.StartsWith("http")) return final;
        return fallback;
    }

    private static string ResolveKuwoCover(JsonElement item)
    {
        if (item.TryGetProperty("web_albumpic_short", out var picShort))
        {
            var s = picShort.GetString() ?? "";
            if (s.StartsWith("120/")) s = s.Replace("120/", "500/");
            else if (!s.StartsWith("500/") && !s.StartsWith("http")) s = $"500/{s}";
            return s.StartsWith("http") ? s.Replace("http://", "https://") : $"https://img4.kuwo.cn/star/albumcover/{s}";
        }
        if (item.TryGetProperty("hts_MVPIC", out var mvpic))
            return (mvpic.GetString() ?? "").Replace("http://", "https://");
        if (item.TryGetProperty("web_artistpic_short", out var artPic))
        {
            var s = artPic.GetString() ?? "";
            if (s.StartsWith("120/")) s = s.Replace("120/", "240/");
            return s.StartsWith("http") ? s.Replace("http://", "https://") : $"https://img4.kuwo.cn/star/starheads/{s}";
        }
        return DefaultFallback;
    }

    private static async Task<T> RetryAsync<T>(Func<Task<T>> fn, T defaultValue, int retries = 2, int delayMs = 800)
    {
        for (var i = 0; i <= retries; i++)
        {
            try { return await fn(); }
            catch when (i < retries) { await Task.Delay(delayMs); }
        }
        return defaultValue;
    }
}
