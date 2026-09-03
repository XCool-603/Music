using System.Net;
using System.Text;
using System.Text.Json;
using Muse.Audio.Api.Models;

namespace Muse.Audio.Api.Services.Official;

/// <summary>
/// Direct client for Kuwo OFFICIAL web APIs (www.kuwo.cn/api/www/*).
/// Independent from v1 MusicService third-party relays.
///
/// AUTH (2026-09 verified against live upstream):
/// Kuwo's /api/www/** and /api/v1/www/** endpoints require the `Secret`
/// request header, computed by the LCG + byte-XOR algorithm h(message, key)
/// where message = the `Hm_Iuvt_*` cookie value and key = the cookie NAME.
/// Kuwo rotates that cookie key name periodically and hard-coded cookies die,
/// so the client bootstraps from the homepage Set-Cookie and refreshes it on a
/// TTL plus on "The request is illegal!" responses. A random kw_token/csrf pair
/// is NOT accepted by these endpoints anymore (previously assumed).
/// </summary>
public class KuwoOfficialClient
{
    private const string WebBase = "https://www.kuwo.cn";
    private const string Referer = "http://www.kuwo.cn/";
    private static readonly string Ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

    /// <summary>Kuwo pay bitmask: songs where pay &amp; 0x030003 == 0 are playable over the web channel.</summary>
    private const long PayPlayableMask = 0x030003;

    private readonly HttpClient _http;
    private readonly int _timeoutSec;

    // Dynamic Hm_Iuvt_* credential state (bootstrap + lazy refresh).
    private readonly SemaphoreSlim _authLock = new(1, 1);
    private string _cookie = "";      // full cookie header collected from the homepage
    private string _hmKey = "";       // cookie key name, e.g. Hm_Iuvt_cdb524f42f0ce19b169b8072123a4727
    private string _hmToken = "";     // cookie value (the Secret message)
    private DateTime _authAt = DateTime.MinValue;
    private static readonly TimeSpan AuthTtl = TimeSpan.FromMinutes(25);

    public KuwoOfficialClient(IConfiguration cfg)
    {
        _timeoutSec = cfg.GetValue("V2:UpstreamTimeoutSec", 5);
        _http = new HttpClient(new HttpClientHandler
        {
            AutomaticDecompression = DecompressionMethods.All,
            AllowAutoRedirect = true,
            UseCookies = false, // we manage the Hm_Iuvt cookie manually per request
        });
    }

    // ── Auth bootstrap & Secret header ───────────────────────────
    /// <summary>Ensure we hold a fresh Hm_Iuvt credential. Throws nothing; on failure www calls simply return empty.</summary>
    private async Task EnsureAuthAsync(bool force = false)
    {
        if (!force && _hmToken.Length > 0 && DateTime.UtcNow - _authAt < AuthTtl)
            return;

        await _authLock.WaitAsync();
        try
        {
            if (!force && _hmToken.Length > 0 && DateTime.UtcNow - _authAt < AuthTtl)
                return;

            try
            {
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(_timeoutSec));
                using var req = new HttpRequestMessage(HttpMethod.Get, WebBase + "/");
                req.Headers.Add("User-Agent", Ua);
                using var resp = await _http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, cts.Token);

                var setCookies = new List<string>();
                if (resp.Headers.TryGetValues("Set-Cookie", out var values))
                    setCookies.AddRange(values);
                var all = string.Join("; ", setCookies.Select(c => c.Split(';')[0]));
                var match = System.Text.RegularExpressions.Regex.Match(all, @"(Hm_Iuvt_[A-Za-z0-9]+)=([^;]+)");
                if (match.Success)
                {
                    _cookie = all;
                    _hmKey = match.Groups[1].Value;
                    _hmToken = match.Groups[2].Value;
                    _authAt = DateTime.UtcNow;
                    Console.WriteLine($"[v2:kuwo] auth ok key={_hmKey} ttl={AuthTtl.TotalMinutes}min");
                }
                else
                {
                    Console.WriteLine("[v2:kuwo] homepage returned no Hm_Iuvt_ cookie — www endpoints disabled");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[v2:kuwo] auth bootstrap failed: {ex.Message}");
            }
        }
        finally
        {
            _authLock.Release();
        }
    }

    private Dictionary<string, string> AuthHeaders(string host, string referer)
    {
        var headers = new Dictionary<string, string>
        {
            ["User-Agent"] = Ua,
            ["Accept"] = "application/json, text/plain, */*",
            ["Referer"] = referer,
        };
        if (host == WebBase.Replace("https://", "") || host == "www.kuwo.cn")
            headers["Host"] = "www.kuwo.cn";
        if (_hmToken.Length > 0)
        {
            headers["Cookie"] = _cookie;
            headers["Secret"] = KuwoSigner.Compute(_hmToken, _hmKey);
        }
        return headers;
    }

    private async Task<JsonElement?> GetJsonAsync(string url, string? referer = Referer)
    {
        var host = ExtractHost(url);
        var headers = AuthHeaders(host, referer ?? Referer);

        // 1st attempt; on "illegal" force a credential refresh and retry once.
        var first = await SendGetJsonAsync(url, headers, host);
        if (first is JsonElement e && IsIllegalResponse(e))
        {
            Console.WriteLine("[v2:kuwo] The request is illegal! refreshing Hm_Iuvt credential…");
            await EnsureAuthAsync(force: true);
            headers = AuthHeaders(host, referer ?? Referer);
            return await SendGetJsonAsync(url, headers, host);
        }
        return first;
    }

    private async Task<JsonElement?> SendGetJsonAsync(string url, Dictionary<string, string> headers, string host)
    {
        try
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(_timeoutSec));
            using var req = new HttpRequestMessage(HttpMethod.Get, url);
            foreach (var kv in headers)
                req.Headers.TryAddWithoutValidation(kv.Key, kv.Value);
            using var resp = await _http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, cts.Token);
            if (!resp.IsSuccessStatusCode) return null;
            var raw = await resp.Content.ReadAsStringAsync(cts.Token);
            return JsonSerializer.Deserialize<JsonElement>(raw);
        }
        catch
        {
            return null;
        }
    }

    private static bool IsIllegalResponse(JsonElement json) =>
        json.ValueKind == JsonValueKind.Object &&
        json.TryGetProperty("message", out var m) && m.ValueKind == JsonValueKind.String &&
        (m.GetString() ?? "").Contains("illegal", StringComparison.OrdinalIgnoreCase);

    private static string ExtractHost(string url) =>
        Uri.TryCreate(url, UriKind.Absolute, out var u) ? u.Host : "www.kuwo.cn";

    private static string WithReqId(string url) =>
        url + (url.Contains('?') ? "&" : "?") + "reqId=" + Guid.NewGuid().ToString("N");

    // ── Search (official) ────────────────────────────────────────
    public async Task<List<TrackInfo>> SearchAsync(string q, int page, int limit)
    {
        var tracks = await SearchWwwAsync(q, page, limit);
        if (tracks.Count == 0)
        {
            // search.kuwo.cn/r.s is the official legacy search service (token-free).
            tracks = await SearchRsAsync(q, page, limit);
        }
        return tracks;
    }

    private async Task<List<TrackInfo>> SearchWwwAsync(string q, int page, int limit)
    {
        var url = $"{WebBase}/api/www/search/searchMusicBykeyWord?key={Uri.EscapeDataString(q)}&pn={page}&rn={limit}&httpsStatus=1";
        var json = await GetJsonAsync(WithReqId(url));
        if (json is not JsonElement j ||
            !V2Json.TryGetObj(j, "data", out var data) ||
            !V2Json.TryGetArr(data, "list", out var list))
            return new List<TrackInfo>();

        var tracks = new List<TrackInfo>();
        foreach (var item in list.EnumerateArray())
        {
            var rid = V2Json.Str(item, "rid");
            if (string.IsNullOrEmpty(rid) || rid == "0") continue;
            var title = V2Json.Str(item, "name");
            var artist = V2Json.Str(item, "artist");
            var album = V2Json.Str(item, "album");
            var pic = V2Json.Str(item, "pic").Replace("http://", "https://");
            var dur = V2Json.Num(item, "duration", 240);
            tracks.Add(V2Tracks.Kuwo(rid, title, artist, album, dur, pic,
                pay: TryGetPay(item), fee: null));
        }
        return tracks;
    }

    /// <summary>
    /// Official legacy search (search.kuwo.cn/r.s). Response is single-quoted
    /// pseudo-JSON; we normalize quotes and parse. Best-effort: any parse
    /// failure returns empty and the caller falls back to the v1 channel.
    /// </summary>
    private async Task<List<TrackInfo>> SearchRsAsync(string q, int page, int limit)
    {
        var url = $"https://search.kuwo.cn/r.s?client=kt&all={Uri.EscapeDataString(q)}" +
                  $"&pn={(page - 1) * limit}&rn={limit}&uid=794764098&ver=kwplayer_ar_9.2.2.1&vipver=1" +
                  $"&show_copyright_off=1&newsearch=1&ft=music&cluster=0&strategy=2012" +
                  $"&encoding=utf8&rformat=json&vermerge=1&mobi=1";
        try
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(_timeoutSec));
            using var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.Add("User-Agent", Ua);
            using var resp = await _http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, cts.Token);
            if (!resp.IsSuccessStatusCode) return new List<TrackInfo>();
            var raw = await resp.Content.ReadAsStringAsync(cts.Token);
            using var doc = JsonDocument.Parse(raw.Replace('\'', '"'));
            if (!doc.RootElement.TryGetProperty("abslist", out var list) ||
                list.ValueKind != JsonValueKind.Array)
                return new List<TrackInfo>();

            var tracks = new List<TrackInfo>();
            foreach (var item in list.EnumerateArray())
            {
                var musicrid = V2Json.Str(item, "MUSICRID"); // e.g. MUSIC_51685512
                var rid = musicrid.Contains('_') ? musicrid.Split('_')[^1] : musicrid;
                if (string.IsNullOrEmpty(rid) || rid == "0") continue;

                var rawName = V2Json.Str(item, "SONGNAME");
                if (string.IsNullOrEmpty(rawName)) rawName = V2Json.Str(item, "NAME");
                var title = CleanRsText(rawName);
                var artist = CleanRsText(V2Json.Str(item, "ARTIST"));
                var album = CleanRsText(V2Json.Str(item, "ALBUM"));
                var dur = V2Json.Num(item, "DURATION", 240);
                tracks.Add(V2Tracks.Kuwo(rid, title, artist, album, dur, ResolveRsCover(item)));
            }
            return tracks;
        }
        catch
        {
            return new List<TrackInfo>();
        }
    }

    private static string CleanRsText(string text) =>
        System.Net.WebUtility.HtmlDecode(text).Replace('\u00A0', ' ').Trim();

    /// <summary>Cover from web_albumpic_short / hts_MVPIC / web_artistpic_short (img4.kuwo.cn).</summary>
    private static string ResolveRsCover(JsonElement item)
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
        return "";
    }

    // ── Song meta (official musicInfo + pay pre-check) ───────────
    /// <summary>Kuwo musicInfo.pay is a bitmask: paid 0xFF00FF / free 0xFC00FC, diff bits 0x030003.</summary>
    public static bool IsWebPlayable(long pay) => (pay & PayPlayableMask) == 0;

    private static long? TryGetPay(JsonElement item)
    {
        if (item.TryGetProperty("pay", out var p))
        {
            if (p.ValueKind == JsonValueKind.Number)
            {
                var v = p.GetInt64();
                return v > 0 ? v : null;
            }
            if (p.ValueKind == JsonValueKind.String && long.TryParse(p.GetString(), out var payNum) && payNum > 0)
                return payNum;
        }
        return null;
    }

    /// <summary>Official musicInfo: (name, artist, pay). pay null means the field was absent/failed.</summary>
    public async Task<(string Name, string Artist, long? Pay)?> GetMusicInfoAsync(string rid)
    {
        var json = await GetJsonAsync(WithReqId($"{WebBase}/api/www/music/musicInfo?mid={rid}&httpsStatus=1"));
        if (json is not JsonElement j || !V2Json.TryGetObj(j, "data", out var data))
            return null;
        return (V2Json.Str(data, "name"), V2Json.Str(data, "artist"), TryGetPay(data));
    }

    // ── Hot search (official) ────────────────────────────────────
    public async Task<List<HotKeyword>> HotSearchAsync()
    {
        var json = await GetJsonAsync(WithReqId($"{WebBase}/api/www/search/searchHotValue"));
        var result = new List<HotKeyword>();
        if (json is not JsonElement j || !V2Json.TryGetArr(j, "data", out var data))
            return result;

        var rank = 1;
        foreach (var item in data.EnumerateArray())
        {
            var word = V2Json.Str(item, "name");
            if (string.IsNullOrEmpty(word)) continue;
            result.Add(new HotKeyword
            {
                Rank = rank++,
                Keyword = word,
                Score = V2Json.Str(item, "hotValue") is { Length: > 0 } s ? s : null,
            });
        }
        return result;
    }

    // ── Suggest (official tips endpoint, token-free) ─────────────
    public async Task<List<SuggestItem>> SuggestAsync(string q, int limit)
    {
        var json = await SendGetJsonAsync(
            WithReqId($"https://tips.kuwo.cn/up.pn?corp=kuwo&w={Uri.EscapeDataString(q)}&complexquery=0&dontusemeta=1&uid=0&prod=h5&version=1.0"),
            new Dictionary<string, string>
            {
                ["User-Agent"] = Ua,
                ["Accept"] = "application/json, text/plain, */*",
                ["Referer"] = Referer,
            },
            "tips.kuwo.cn");
        var result = new List<SuggestItem>();
        if (json is not JsonElement j || !V2Json.TryGetArr(j, "data", out var data))
            return result;

        foreach (var item in data.EnumerateArray())
        {
            var word = V2Json.Str(item, "word");
            if (string.IsNullOrEmpty(word)) continue;
            result.Add(new SuggestItem { Keyword = word, Type = "song" });
            if (result.Count >= limit) break;
        }
        return result;
    }

    // ── Toplist (official bang) ──────────────────────────────────
    public async Task<List<TrackInfo>> ToplistAsync(string bangId, int limit)
    {
        var json = await GetJsonAsync(
            WithReqId($"{WebBase}/api/www/bang/bang/musicList?bangId={bangId}&pn=1&rn={limit}&httpsStatus=1"));
        if (json is not JsonElement j ||
            !V2Json.TryGetObj(j, "data", out var data) ||
            !V2Json.TryGetArr(data, "musicList", out var list))
            return new List<TrackInfo>();

        var tracks = new List<TrackInfo>();
        foreach (var item in list.EnumerateArray())
        {
            var rid = V2Json.Str(item, "rid");
            if (string.IsNullOrEmpty(rid) || rid == "0") continue;
            var pic = V2Json.Str(item, "pic").Replace("http://", "https://");
            tracks.Add(V2Tracks.Kuwo(
                rid,
                V2Json.Str(item, "name"),
                V2Json.Str(item, "artist"),
                V2Json.Str(item, "album"),
                V2Json.Num(item, "duration", 240),
                pic,
                pay: TryGetPay(item)));
        }
        return tracks;
    }

    // ── Play URL (official www → mobile mobi.s channel) ──────────
    /// <summary>br: 320kmp3 | 2000kflac | 128kmp3 — kuwo's official bitrate tokens.</summary>
    public async Task<string?> GetPlayUrlAsync(string rid, string br)
    {
        // www playUrl hard-rejects paid tracks with code:-1. When we already
        // know the song is paid (pay mask), skip the doomed www call.
        var info = await GetMusicInfoAsync(rid);
        var knownPaid = info?.Pay is { } pay && !IsWebPlayable(pay);

        string? url = null;
        if (!knownPaid)
            url = await GetWwwPlayUrlAsync(rid, br);
        if (url is not null) return url;

        // mobi.s type=convert_url_with_sign is the official mobile-App channel
        // (trackmedia pool) and serves full audio incl. paid tracks.
        var mobiBr = br switch
        {
            "2000kflac" => "2000kflac",
            _ => "320kmp3",
        };
        return await GetMobiPlayUrlAsync(rid, mobiBr);
    }

    private async Task<string?> GetWwwPlayUrlAsync(string rid, string br)
    {
        var json = await GetJsonAsync(WithReqId(
            $"{WebBase}/api/v1/www/music/playUrl?mid={rid}&type=music&br={br}&penc=null&httpsStatus=1&plat=web_www&from="));
        if (json is JsonElement j &&
            V2Json.TryGetObj(j, "data", out var data) &&
            data.TryGetProperty("url", out var urlP) &&
            urlP.GetString() is { } u && u.StartsWith("http"))
            return u;
        return null;
    }

    /// <summary>
    /// mobi.kuwo.cn/mobi.s convert_url_with_sign — official mobile App channel.
    /// Unsigned calls return a stub with a REWRITTEN rid and duration≈11s, so
    /// the response must pass sanity checks before we trust its URL.
    /// </summary>
    public async Task<string?> GetMobiPlayUrlAsync(string rid, string br)
    {
        try
        {
            var url = $"https://mobi.kuwo.cn/mobi.s?f=web" +
                      $"&source=kwplayer_ar_1.1.9_oppo_118980_320.apk" +
                      $"&type=convert_url_with_sign&rid={rid}&br={br}";
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(_timeoutSec + 3));
            using var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.Add("User-Agent", Ua);
            using var resp = await _http.SendAsync(req, cts.Token);
            if (!resp.IsSuccessStatusCode)
            {
                Console.WriteLine($"[v2:mobi] rid={rid} br={br} http={(int)resp.StatusCode}");
                return null;
            }

            using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync(cts.Token));
            var root = doc.RootElement;
            if (root.TryGetProperty("code", out var codeP) &&
                codeP.ValueKind == JsonValueKind.Number && codeP.GetInt32() != 200)
            {
                Console.WriteLine($"[v2:mobi] rid={rid} br={br} code={codeP.GetInt32()}");
                return null;
            }
            if (!V2Json.TryGetObj(root, "data", out var data) ||
                !data.TryGetProperty("url", out var urlP) ||
                urlP.GetString() is not { } u || !u.StartsWith("http"))
            {
                var preview = root.ToString();
                Console.WriteLine($"[v2:mobi] rid={rid} br={br} no-url data={preview[..Math.Min(200, preview.Length)]}");
                return null;
            }

            // Sanity check: reject the unsigned stub (rid rewritten / ~11s placeholder).
            var dur = data.TryGetProperty("duration", out var dP) && dP.ValueKind == JsonValueKind.Number
                ? dP.GetInt32() : 0;
            if (dur is > 0 and < 30)
            {
                Console.WriteLine($"[v2:mobi] rid={rid} br={br} stub dur={dur}");
                return null;
            }

            return u;
        }
        catch
        {
            return null;
        }
    }

    // ── Lyric (official newlyric → mobile h5 fallback) ───────────
    /// <summary>
    /// Official lyric channel. Primary: newlyric.kuwo.cn — params are XOR(yeelion) +
    /// Base64 obfuscated and need NO Secret header; the payload is zlib-inflated,
    /// then base64-decoded, XOR-decrypted and GB18030-decoded. Fallback: the
    /// mobile h5 songinfoandlrc JSON used previously.
    /// </summary>
    public async Task<LyricResponse> GetLyricAsync(string rid)
    {
        var official = await GetLyricNewlyricAsync(rid);
        if (!string.IsNullOrEmpty(official.Lrc))
            return official;
        return await GetLyricH5Async(rid);
    }

    private async Task<LyricResponse> GetLyricNewlyricAsync(string rid)
    {
        try
        {
            var key = Encoding.ASCII.GetBytes("yeelion");
            var plain = Encoding.UTF8.GetBytes($"user=12345,web,web,web&requester=localhost&req=1&rid=MUSIC_{rid}&lrcx=1");
            var xored = new byte[plain.Length];
            for (var i = 0; i < plain.Length; i++)
                xored[i] = (byte)(key[i % key.Length] ^ plain[i]);

            var url = $"http://newlyric.kuwo.cn/newlyric.lrc?{Convert.ToBase64String(xored)}";
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(_timeoutSec + 2));
            using var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.Add("User-Agent", Ua);
            req.Headers.Add("Referer", "http://www.kuwo.cn/");
            using var resp = await _http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, cts.Token);
            if (!resp.IsSuccessStatusCode) return new LyricResponse();

            var raw = await resp.Content.ReadAsByteArrayAsync(cts.Token);
            var text = DecodeNewlyricPayload(raw);
            if (string.IsNullOrEmpty(text)) return new LyricResponse();

            var lrc = KuwoLrcNormalize.ToPlainLrc(text);
            return string.IsNullOrEmpty(lrc) ? new LyricResponse() : new LyricResponse { Lrc = lrc };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[v2:kuwo] newlyric failed rid={rid}: {ex.Message}");
            return new LyricResponse();
        }
    }

    private static string? DecodeNewlyricPayload(byte[] raw)
    {
        // Payload starts with "tp=content\r\n\r\n" followed by zlib data.
        var head = Encoding.ASCII.GetString(raw, 0, Math.Min(10, raw.Length));
        if (!head.StartsWith("tp=content", StringComparison.Ordinal)) return null;

        var sep = IndexOf(raw, "\r\n\r\n");
        if (sep < 0) return null;
        var compressed = raw[(sep + 4)..];

        using var zlib = new System.IO.Compression.ZLibStream(new MemoryStream(compressed), System.IO.Compression.CompressionMode.Decompress);
        using var inflated = new MemoryStream();
        zlib.CopyTo(inflated);
        var inflatedBytes = inflated.ToArray();

        // lrcx=1 body: base64 text → XOR(yeelion) → GB18030.
        var b64 = Encoding.ASCII.GetString(inflatedBytes).Trim();
        var cipher = Convert.FromBase64String(b64);

        var key = Encoding.ASCII.GetBytes("yeelion");
        var output = new byte[cipher.Length];
        for (var i = 0; i < cipher.Length; i++)
            output[i] = (byte)(cipher[i] ^ key[i % key.Length]);

        Encoding.RegisterProvider(System.Text.CodePagesEncodingProvider.Instance);
        return Encoding.GetEncoding("GB18030").GetString(output);
    }

    private static int IndexOf(byte[] data, string marker)
    {
        var needle = Encoding.ASCII.GetBytes(marker);
        for (var i = 0; i <= data.Length - needle.Length; i++)
        {
            var ok = true;
            for (var j = 0; j < needle.Length; j++)
            {
                if (data[i + j] != needle[j]) { ok = false; break; }
            }
            if (ok) return i;
        }
        return -1;
    }

    private async Task<LyricResponse> GetLyricH5Async(string rid)
    {
        var json = await SendGetJsonAsync(
            $"https://m.l.kuwo.cn/newh5/singles/songinfoandlrc?musicId={rid}",
            new Dictionary<string, string>
            {
                ["User-Agent"] = Ua,
                ["Accept"] = "application/json, text/plain, */*",
                ["Referer"] = "https://m.l.kuwo.cn/",
            },
            "m.l.kuwo.cn");
        var lrc = new LyricResponse();
        if (json is not JsonElement j ||
            !V2Json.TryGetObj(j, "data", out var data) ||
            !V2Json.TryGetArr(data, "lrclist", out var lines))
            return lrc;

        var sb = new StringBuilder();
        foreach (var line in lines.EnumerateArray())
        {
            var text = V2Json.Str(line, "lineLyric");
            if (string.IsNullOrEmpty(text)) continue;
            var time = V2Json.Num(line, "time", -1);
            if (time < 0) continue;
            var ts = TimeSpan.FromSeconds(time);
            sb.Append($"[{ts.Minutes:D2}:{ts.Seconds:D2}.{ts.Milliseconds / 10:D2}]{text}\n");
        }
        lrc.Lrc = sb.ToString();
        return lrc;
    }
}

/// <summary>
/// Kuwo `Secret` header algorithm (see kuwoMusicApi app/utils/secret.js).
/// h(message=Hm_Iuvt cookie value, key=cookie name): concatenated charCodes →
/// LCG(2^31-1) iterations per byte → XOR 0..255 → lowercase hex, plus an 8-hex
/// random tail. Verified against the live upstream on 2026-09.
/// </summary>
internal static class KuwoSigner
{
    public static string Compute(string message, string key)
    {
        if (string.IsNullOrEmpty(key) || key.Length == 0) return "";
        if (string.IsNullOrEmpty(message)) return "";

        var n = string.Concat(key.Select(c => ((int)c).ToString()));
        var r = n.Length / 5;
        var oStr = string.Concat(
            n[Math.Min(r, n.Length - 1)],
            n[Math.Min(2 * r, n.Length - 1)],
            n[Math.Min(3 * r, n.Length - 1)],
            n[Math.Min(4 * r, n.Length - 1)],
            n[Math.Min(5 * r, n.Length - 1)]);
        var o = long.Parse(oStr);
        var l = (key.Length + 1) / 2; // ceil(key.length/2)
        const long c = 2147483647;    // 2^31 - 1

        if (o < 2) return "";
        var rnd = new Random();
        var d = (long)(rnd.NextDouble() * 1e9) % 100000000L;

        n += d.ToString();
        while (n.Length > 10)
        {
            var head = long.Parse(n[..10]);
            var tail = ParseJsIntLossy(n[10..]);
            n = (head + tail).ToString();
        }

        long state = (o * long.Parse(n) + l) % c;
        var sb = new StringBuilder();
        foreach (var ch in message)
        {
            var x = (byte)ch ^ (int)Math.Floor(state / (double)c * 255);
            sb.Append(x < 16 ? "0" + x.ToString("x") : x.ToString("x"));
            state = (o * state + l) % c;
        }
        var dHex = d.ToString("x");
        while (dHex.Length < 8) dHex = "0" + dHex;
        return sb.ToString() + dHex;
    }

    /// <summary>
    /// JS parseInt never throws on huge digit strings — it parses into a double
    /// and silently loses precision. long.Parse would instead throw
    /// OverflowException for inputs longer than Int64 range (long cookie keys),
    /// crashing the whole request chain. Emulate the JS behavior: keep leading
    /// digits, and when they exceed Int64 range approximate by truncating.
    /// </summary>
    private static long ParseJsIntLossy(string s)
    {
        int i = 0;
        while (i < s.Length && char.IsDigit(s[i])) i++;
        if (i == 0) return 0;
        var digits = s[..i];
        if (digits.Length > 18) digits = digits[..18];
        return long.Parse(digits);
    }
}

/// <summary>Converts Kuwo lrcx word-timed payload into a plain LRC (word tags dropped).</summary>
internal static class KuwoLrcNormalize
{
    public static string ToPlainLrc(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return "";
        var sb = new StringBuilder();
        foreach (var rawLine in raw.Split('\n', '\r'))
        {
            var line = rawLine.Trim();
            if (line.Length == 0) continue;
            // [kuwo:NN] octet-offset tag lines carry no displayable lyric.
            if (line.StartsWith("[kuwo:", StringComparison.OrdinalIgnoreCase)) continue;

            var cleaned = System.Text.RegularExpressions.Regex.Replace(line, @"<\s*-?\d+\s*,\s*-?\d+\s*(?:,\s*-?\d+)?\s*>", "");
            // Only keep timestamp-bearing lyric lines; keep harmless metadata tags.
            if (cleaned.StartsWith('['))
            {
                if (System.Text.RegularExpressions.Regex.IsMatch(cleaned, @"^\[\d{1,2}:\d{1,2}(?:[.:]\d{1,3})?\]"))
                {
                    if (cleaned.Length > 10) sb.Append(cleaned.Trim()).Append('\n');
                }
            }
        }
        return sb.ToString();
    }
}

/// <summary>Shared small JSON helpers for the official clients.</summary>
internal static class V2Json
{
    public static string Str(JsonElement e, string name)
    {
        if (e.ValueKind != JsonValueKind.Object || !e.TryGetProperty(name, out var p)) return "";
        return p.ValueKind switch
        {
            JsonValueKind.String => p.GetString() ?? "",
            JsonValueKind.Number => p.GetRawText(),
            _ => "",
        };
    }

    public static int Num(JsonElement e, string name, int fallback)
    {
        if (e.ValueKind != JsonValueKind.Object || !e.TryGetProperty(name, out var p)) return fallback;
        if (p.ValueKind == JsonValueKind.Number) return p.GetInt32();
        return int.TryParse(p.ToString(), out var v) && v > 0 ? v : fallback;
    }

    /// <summary>Safe property fetch: only succeeds when both parent and child are objects.</summary>
    public static bool TryGetObj(JsonElement e, string name, out JsonElement value)
    {
        value = default;
        return e.ValueKind == JsonValueKind.Object &&
               e.TryGetProperty(name, out value) &&
               value.ValueKind == JsonValueKind.Object;
    }

    public static bool TryGetArr(JsonElement e, string name, out JsonElement value)
    {
        value = default;
        return e.ValueKind == JsonValueKind.Object &&
               e.TryGetProperty(name, out value) &&
               value.ValueKind == JsonValueKind.Array;
    }
}

/// <summary>Builds v2 TrackInfo entries. audioUrl points at /api/v2/song/url (302 → official CDN).</summary>
internal static class V2Tracks
{
    public static TrackInfo Kuwo(string rid, string title, string artist, string album, int duration, string pic,
        long? pay = null, int? fee = null) =>
        new()
        {
            Id = $"kw_{rid}",
            Rid = rid,
            Title = string.IsNullOrWhiteSpace(title) ? "未知单曲" : title,
            Artist = string.IsNullOrWhiteSpace(artist) ? "未知歌手" : artist,
            Album = string.IsNullOrWhiteSpace(album) ? "单曲合辑" : album,
            Duration = duration > 0 ? duration : 240,
            CoverUrl = pic.StartsWith("http") ? pic : "",
            AudioUrl = $"/api/v2/song/url?source=kuwo&rid={rid}&quality=high",
            Bitrate = "酷我官方 FLAC / 320k",
            SourceName = "酷我音乐",
            SourceKey = "kw",
            Pay = pay,
            Fee = fee,
            SourceRawInfo = new RawInfo
            {
                Id = rid, Songmid = rid,
                Name = title, Singer = artist, AlbumName = album,
                Interval = duration, Img = pic
            },
        };

    public static TrackInfo NetEase(string id, string title, string artist, string album, int duration, string coverUrl,
        int? fee = null) =>
        new()
        {
            Id = $"ne_{id}",
            Rid = id,
            Title = string.IsNullOrWhiteSpace(title) ? "未知单曲" : title,
            Artist = string.IsNullOrWhiteSpace(artist) ? "未知歌手" : artist,
            Album = string.IsNullOrWhiteSpace(album) ? "单曲合辑" : album,
            Duration = duration > 0 ? duration : 240,
            CoverUrl = coverUrl,
            AudioUrl = $"/api/v2/song/url?source=netease&id={id}&quality=high",
            Bitrate = "网易云官方 320k / FLAC",
            SourceName = "网易云音乐",
            SourceKey = "wy",
            Fee = fee,
            SourceRawInfo = new RawInfo
            {
                Id = id, Songmid = id,
                Name = title, Singer = artist, AlbumName = album,
                Interval = duration, Img = coverUrl
            },
        };
}
