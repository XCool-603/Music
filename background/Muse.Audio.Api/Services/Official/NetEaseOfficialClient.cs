using System.Net;
using System.Numerics;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Muse.Audio.Api.Models;

namespace Muse.Audio.Api.Services.Official;

/// <summary>
/// Direct client for NetEase OFFICIAL web APIs (music.163.com).
/// Search / hot / player-url use the weapi encrypted POST channel (public
/// algorithm: double AES-CBC + RSA-no-padding secret). Other endpoints remain
/// plaintext GET.
/// </summary>
public class NetEaseOfficialClient
{
    private const string WebBase = "https://music.163.com";
    private const string Referer = "https://music.163.com/";
    private static readonly string Ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
    private const string Cookie = "os=pc; appver=2.9.7";

    // weapi constants (public, widely documented).
    private static readonly byte[] PresetKey = Encoding.UTF8.GetBytes("0CoJUm6Qyw8W8jud");
    private static readonly byte[] Iv = Encoding.UTF8.GetBytes("0102030405060708");
    private const string RsaModulus =
        "00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7";
    private const string RsaAlphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    private readonly HttpClient _http;
    private readonly int _timeoutSec;

    public NetEaseOfficialClient(IConfiguration cfg)
    {
        _timeoutSec = cfg.GetValue("V2:UpstreamTimeoutSec", 5);
        _http = new HttpClient(new HttpClientHandler
        {
            AutomaticDecompression = DecompressionMethods.All,
            AllowAutoRedirect = true,
            UseCookies = false,
        });
    }

    // ── weapi encryption (public algorithm) ──────────────────────
    private static string AesB64(string text, byte[] key)
    {
        using var aes = Aes.Create();
        aes.Mode = CipherMode.CBC;
        aes.Padding = PaddingMode.PKCS7;
        aes.Key = key;
        aes.IV = Iv;
        using var enc = aes.CreateEncryptor();
        var plain = Encoding.UTF8.GetBytes(text);
        return Convert.ToBase64String(enc.TransformFinalBlock(plain, 0, plain.Length));
    }

    private static string RsaEncryptNoPadding(string text)
    {
        var modulus = HexToBigInteger(RsaModulus);
        var message = HexToBigInteger(StringToHex(new string(text.Reverse().ToArray())));
        var result = BigInteger.ModPow(message, new BigInteger(65537), modulus);
        return ToHex(result).PadLeft(256, '0');
    }

    private static string StringToHex(string s) =>
        Convert.ToHexString(Encoding.UTF8.GetBytes(s)).ToLower();

    private static BigInteger HexToBigInteger(string hex)
    {
        if (hex.Length % 2 == 1) hex = "0" + hex;
        var bytes = new byte[hex.Length / 2 + 1];
        for (var i = 0; i < hex.Length / 2; i++)
            bytes[i] = Convert.ToByte(hex.Substring(hex.Length - 2 * (i + 1), 2), 16);
        return new BigInteger(bytes);
    }

    private static string ToHex(BigInteger value)
    {
        var bytes = value.ToByteArray();
        if (bytes[^1] == 0) bytes = bytes[..^1];
        Array.Reverse(bytes);
        return Convert.ToHexString(bytes).ToLower();
    }

    private async Task<JsonElement?> PostWeapiAsync(string path, string json)
    {
        try
        {
            var secret = RandomString(16);
            var payload = AesB64(AesB64(json, PresetKey), Encoding.UTF8.GetBytes(secret));
            var encSecKey = RsaEncryptNoPadding(secret);
            var form = $"params={Uri.EscapeDataString(payload)}&encSecKey={Uri.EscapeDataString(encSecKey)}";

            using var req = new HttpRequestMessage(HttpMethod.Post, WebBase + path);
            req.Headers.Add("User-Agent", Ua);
            req.Headers.Add("Referer", Referer);
            if (!string.IsNullOrEmpty(Cookie)) req.Headers.TryAddWithoutValidation("Cookie", Cookie);
            req.Content = new StringContent(form, Encoding.UTF8, "application/x-www-form-urlencoded");

            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(_timeoutSec));
            using var resp = await _http.SendAsync(req, cts.Token);
            if (!resp.IsSuccessStatusCode) return null;
            var raw = await resp.Content.ReadAsStringAsync(cts.Token);
            return JsonSerializer.Deserialize<JsonElement>(raw);
        }
        catch
        {
            return null;
        }
    }

    private static string RandomString(int len)
    {
        var buf = new byte[len];
        Random.Shared.NextBytes(buf);
        return new string(buf.Select(b => RsaAlphabet[b % RsaAlphabet.Length]).ToArray());
    }

    private async Task<JsonElement?> GetJsonAsync(string url)
    {
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.Add("User-Agent", Ua);
            req.Headers.Add("Accept", "application/json, text/plain, */*");
            req.Headers.Add("Referer", Referer);
            if (!string.IsNullOrEmpty(Cookie)) req.Headers.TryAddWithoutValidation("Cookie", Cookie);
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(_timeoutSec));
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

    // ── Search (official, weapi) ─────────────────────────────────
    public async Task<(List<TrackInfo> Tracks, int Total)> SearchAsync(string q, int page, int limit)
    {
        var offset = (Math.Max(1, page) - 1) * limit;
        var json = await PostWeapiAsync(
            "/weapi/search/get",
            $"{{\"s\":\"{JsonEscape(q)}\",\"type\":1,\"offset\":{offset},\"limit\":{limit},\"total\":true}}");

        var tracks = new List<TrackInfo>();
        var total = 0;
        if (json is not JsonElement j || !V2Json.TryGetObj(j, "result", out var result))
            return (tracks, total);

        if (result.TryGetProperty("songCount", out var sc) && sc.ValueKind == JsonValueKind.Number)
            total = sc.GetInt32();
        if (!V2Json.TryGetArr(result, "songs", out var songs))
            return (tracks, total);

        foreach (var item in songs.EnumerateArray())
            MapNetEaseSong(item, tracks);
        return (tracks, total);
    }

    private static void MapNetEaseSong(JsonElement item, List<TrackInfo> tracks)
    {
        var id = V2Json.Str(item, "id");
        if (string.IsNullOrEmpty(id) || id == "0") return;

        var artist = "未知歌手";
        if (V2Json.TryGetArr(item, "artists", out var artists))
        {
            var names = artists.EnumerateArray()
                .Select(a => V2Json.Str(a, "name"))
                .Where(n => !string.IsNullOrEmpty(n))
                .ToList();
            if (names.Count > 0) artist = string.Join(" / ", names);
        }

        var album = "单曲合辑";
        string? cover = null;
        if (V2Json.TryGetObj(item, "album", out var al))
        {
            var alName = V2Json.Str(al, "name");
            if (!string.IsNullOrEmpty(alName)) album = alName;
            var picUrl = V2Json.Str(al, "picUrl");
            if (picUrl.StartsWith("http")) cover = picUrl;
        }

        var durMs = 0;
        if (item.TryGetProperty("duration", out var du) && du.ValueKind == JsonValueKind.Number)
            durMs = du.GetInt32();

        var coverUrl = cover ?? $"/api/v2/song/pic?source=netease&id={id}";
        var mvId = V2Json.Str(item, "mvid");
        tracks.Add(V2Tracks.NetEase(id, V2Json.Str(item, "name"), artist, album, durMs / 1000, coverUrl,
            fee: ReadFee(item), mvId: string.IsNullOrEmpty(mvId) || mvId == "0" ? null : mvId));
    }

    /// <summary>
    /// fee: 0 免费 / 1 VIP 单曲 / 8 数字专辑(已购可播)。VIP(fee=1) 在匿名态取
    /// 链接必被 code:-110 或 freeTrial 拦截（洛雪网易云实现分析 §6.2）。
    /// </summary>
    internal static int? ReadFee(JsonElement item)
    {
        if (item.ValueKind != JsonValueKind.Object) return null;
        if (item.TryGetProperty("fee", out var f) && f.ValueKind == JsonValueKind.Number)
            return f.GetInt32();
        // /api/song/detail 有时只带 privilege[].fee（与 fee 字段等价）。
        if (V2Json.TryGetArr(item, "privilege", out var pr) && pr.GetArrayLength() > 0 &&
            pr[0].TryGetProperty("fee", out var pf) && pf.ValueKind == JsonValueKind.Number)
            return pf.GetInt32();
        return null;
    }

    // ── Hot search (official, weapi) ─────────────────────────────
    public async Task<List<HotKeyword>> HotSearchAsync()
    {
        var json = await PostWeapiAsync("/weapi/search/hot", "{\"type\":\"1111\"}");
        var result = new List<HotKeyword>();
        if (json is not JsonElement j ||
            !V2Json.TryGetObj(j, "result", out var data) ||
            !V2Json.TryGetArr(data, "hots", out var hots))
            return result;

        var rank = 1;
        foreach (var item in hots.EnumerateArray())
        {
            var word = V2Json.Str(item, "first");
            if (string.IsNullOrEmpty(word)) word = V2Json.Str(item, "searchWord");
            if (string.IsNullOrEmpty(word)) continue;
            result.Add(new HotKeyword
            {
                Rank = rank++,
                Keyword = word,
                Score = V2Json.Str(item, "score") is { Length: > 0 } s ? s : null,
                Tag = V2Json.Str(item, "source") is { Length: > 0 } src ? src : null,
            });
        }
        return result;
    }

    // ── Suggest (official, plaintext) ────────────────────────────
    public async Task<List<SuggestItem>> SuggestAsync(string q, int limit)
    {
        var json = await GetJsonAsync($"{WebBase}/api/search/suggest/web?s={Uri.EscapeDataString(q)}");
        var result = new List<SuggestItem>();
        if (json is not JsonElement j || !V2Json.TryGetObj(j, "result", out var data))
            return result;

        // Respect the official order: songs → artists → albums → playlists.
        foreach (var kind in new[] { "songs", "artists", "albums", "playlists" })
        {
            if (!V2Json.TryGetArr(data, kind, out var arr))
                continue;
            foreach (var item in arr.EnumerateArray())
            {
                var name = V2Json.Str(item, "name");
                if (string.IsNullOrEmpty(name)) continue;
                var hint = "";
                if (kind == "songs" && V2Json.TryGetArr(item, "artists", out var arts))
                {
                    var names = arts.EnumerateArray().Select(a => V2Json.Str(a, "name")).Where(n => !string.IsNullOrEmpty(n)).ToList();
                    if (names.Count > 0) hint = string.Join(" / ", names);
                }
                result.Add(new SuggestItem { Keyword = name, Type = kind, Hint = hint.Length > 0 ? hint : null });
                if (result.Count >= limit) return result;
            }
        }
        return result;
    }

    // ── Toplist (official toplist playlist detail, plaintext) ────
    public async Task<List<TrackInfo>> ToplistAsync(string toplistId, int limit)
    {
        var json = await GetJsonAsync($"{WebBase}/api/playlist/detail?id={toplistId}");
        if (json is not JsonElement j ||
            !V2Json.TryGetObj(j, "result", out var result) ||
            !V2Json.TryGetArr(result, "tracks", out var tracksArr))
            return new List<TrackInfo>();

        var tracks = new List<TrackInfo>();
        foreach (var item in tracksArr.EnumerateArray())
        {
            if (tracks.Count >= limit) break;
            MapNetEaseSong(item, tracks);
        }
        return tracks;
    }

    // ── Play URL (official, weapi) ───────────────────────────────
    /// <summary>br: 320000 | 999000. Returns (url, vipLocked).</summary>
    public async Task<(string? Url, bool VipLocked)> GetPlayUrlAsync(string id, int br)
    {
        var json = await PostWeapiAsync(
            "/weapi/song/enhance/player/url",
            $"{{\"ids\":\"[{id}]\",\"br\":{br},\"os\":\"pc\",\"header\":\"{{}}\"}}");
        if (json is JsonElement j &&
            V2Json.TryGetArr(j, "data", out var data) &&
            data.GetArrayLength() > 0 &&
            data[0].ValueKind == JsonValueKind.Object &&
            data[0].TryGetProperty("url", out var urlP))
        {
            var u = urlP.GetString() ?? "";
            if (u.StartsWith("http"))
            {
                // Trial detection: VIP/non-free tracks still return a URL but it
                // is a 30s preview (freeTrialInfo set). Treat as locked so the
                // caller degrades to the v1 channel which serves full audio.
                var trial =
                    (data[0].TryGetProperty("freeTrialInfo", out var fti) &&
                     fti.ValueKind == JsonValueKind.Object) ||
                    (data[0].TryGetProperty("freeTrialFlag", out var ftf) &&
                     ftf.ValueKind == JsonValueKind.Number && ftf.GetInt32() != 0);
                return trial ? (null, true) : (u, false);
            }
            // Upstream answered but no usable url → typically VIP-locked.
            return (null, true);
        }
        return (null, false);
    }

    // ── Cover (official song detail, plaintext) ──────────────────
    public async Task<string?> GetCoverUrlAsync(string id, int size = 500)
    {
        var json = await GetJsonAsync($"{WebBase}/api/song/detail?ids=[{id}]");
        if (json is JsonElement j &&
            V2Json.TryGetArr(j, "songs", out var songs) &&
            songs.GetArrayLength() > 0 &&
            songs[0].ValueKind == JsonValueKind.Object &&
            V2Json.TryGetObj(songs[0], "album", out var album) &&
            album.TryGetProperty("picUrl", out var pic) &&
            pic.GetString() is { } url && url.StartsWith("http"))
        {
            return url.Replace("http://", "https://") + $"?param={size}y{size}";
        }
        return null;
    }

    /// <summary>(title, first-artist, fee) from official song/detail — used for fee pre-check and cross-source rescue.</summary>
    public async Task<NetEaseMeta?> GetSongMetaAsync(string id)
    {
        try
        {
            var json = await GetJsonAsync($"{WebBase}/api/song/detail?ids=[{id}]");
            if (json is JsonElement j &&
                V2Json.TryGetArr(j, "songs", out var songs) &&
                songs.GetArrayLength() > 0 &&
                songs[0].ValueKind == JsonValueKind.Object)
            {
                var title = V2Json.Str(songs[0], "name");
                var artist = "";
                if (V2Json.TryGetArr(songs[0], "artists", out var arts) && arts.GetArrayLength() > 0)
                    artist = V2Json.Str(arts[0], "name");
                var fee = ReadFee(songs[0]);
                // /api/song/detail returns the fee on the sibling privileges[] entry.
                if (fee is null && V2Json.TryGetArr(j, "privileges", out var privs) && privs.GetArrayLength() > 0)
                    fee = ReadFee(privs[0]);
                if (!string.IsNullOrEmpty(title))
                    return new NetEaseMeta(title, artist, fee);
            }
        }
        catch { }
        return null;
    }

    // ── Lyric (official, plaintext, with translation) ────────────
    public async Task<LyricResponse> GetLyricAsync(string id)
    {
        var json = await GetJsonAsync($"{WebBase}/api/song/lyric?id={id}&lv=1&kv=1&tv=-1");
        var lrc = new LyricResponse();
        if (json is not JsonElement j) return lrc;
        if (V2Json.TryGetObj(j, "lrc", out var lrcObj) && lrcObj.TryGetProperty("lyric", out var l))
            lrc.Lrc = l.GetString() ?? "";
        if (V2Json.TryGetObj(j, "tlyric", out var tObj) && tObj.TryGetProperty("lyric", out var t))
            lrc.Tlyric = t.GetString() ?? "";
        return lrc;
    }

    // ── MV search (official, plaintext type=1004) ────────────────
    public async Task<(List<MvInfo> Mvs, int Total)> MvSearchAsync(string q, int page, int limit)
    {
        var mvs = new List<MvInfo>();
        var offset = (Math.Max(1, page) - 1) * limit;
        var json = await GetJsonAsync(
            $"{WebBase}/api/search/get?s={Uri.EscapeDataString(q)}&type=1004&offset={offset}&limit={limit}&total=true");
        if (json is not JsonElement j || !V2Json.TryGetObj(j, "result", out var result))
            return (mvs, 0);

        var total = result.TryGetProperty("mvCount", out var mc) && mc.ValueKind == JsonValueKind.Number
            ? mc.GetInt32() : 0;
        if (!V2Json.TryGetArr(result, "mvs", out var arr))
            return (mvs, total);

        foreach (var item in arr.EnumerateArray())
        {
            var mv = new MvInfo();
            if (item.TryGetProperty("id", out var id)) mv.Id = id.ToString();
            if (item.TryGetProperty("name", out var name)) mv.Name = name.GetString() ?? "";
            if (item.TryGetProperty("artistName", out var artist)) mv.Artist = artist.GetString() ?? "";
            if (string.IsNullOrEmpty(mv.Artist) && item.TryGetProperty("artists", out var artists)
                && artists.ValueKind == JsonValueKind.Array && artists.GetArrayLength() > 0
                && artists[0].TryGetProperty("name", out var aName))
                mv.Artist = aName.GetString() ?? "";
            if (item.TryGetProperty("cover", out var cover)) mv.Cover = cover.GetString() ?? "";
            if (item.TryGetProperty("duration", out var dur) && dur.ValueKind == JsonValueKind.Number)
                mv.DurationMs = dur.GetInt32();
            if (item.TryGetProperty("playCount", out var pc) && pc.ValueKind == JsonValueKind.Number)
                mv.PlayCount = pc.GetInt64();
            if (!string.IsNullOrEmpty(mv.Id)) mvs.Add(mv);
        }
        return (mvs, total);
    }

    // ── MV play URL (official mv/detail carries direct mp4 links in brs) ──
    // The old /api/mv/url endpoint is dead and the weapi mv-url channel needs
    // a logged-in session, but mv/detail's data.brs map ships signed vod.126.net
    // mp4 links per resolution anonymously — use it directly.
    public async Task<(string? Url, List<int> Resolutions)> MvUrlAsync(string id, int resolution = 720)
    {
        var json = await GetJsonAsync($"{WebBase}/api/mv/detail?id={Uri.EscapeDataString(id)}");
        if (json is not JsonElement j || !V2Json.TryGetObj(j, "data", out var data)
            || !V2Json.TryGetObj(data, "brs", out var brs))
            return (null, new List<int>());

        var parsed = new SortedDictionary<int, string>();
        foreach (var prop in brs.EnumerateObject())
        {
            if (int.TryParse(prop.Name, out var r) && prop.Value.ValueKind == JsonValueKind.String
                && prop.Value.GetString() is { Length: > 0 } link)
                parsed[r] = link;
        }
        if (parsed.Count == 0) return (null, new List<int>());

        // Pick the highest available resolution not exceeding the request;
        // fall back to the largest when the request exceeds everything.
        var chosen = parsed.LastOrDefault(kv => kv.Key <= resolution);
        if (chosen.Value is null) chosen = parsed.Last();
        return (chosen.Value, parsed.Keys.ToList());
    }

    private static string JsonEscape(string s) =>
        s.Replace("\\", "\\\\").Replace("\"", "\\\"");
}

/// <summary>NetEase song meta from official song/detail (title, first artist, copyright fee tier).</summary>
public readonly record struct NetEaseMeta(string Title, string Artist, int? Fee);

/// <summary>Music-video entry from official search (type=1004).</summary>
public class MvInfo
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Artist { get; set; } = "";
    public string Cover { get; set; } = "";
    public int DurationMs { get; set; }
    public long PlayCount { get; set; }
}

