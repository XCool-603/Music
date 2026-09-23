using Microsoft.AspNetCore.Mvc;
using Muse.Audio.Api.Services;
using Muse.Audio.Api.Services.Official;

namespace Muse.Audio.Api.Controllers;

/// <summary>
/// v2 API group backed by OFFICIAL Kuwo/NetEase upstreams. Fully isolated from
/// v1 endpoints (api/music/*) — those stay untouched for one-switch rollback.
/// </summary>
[ApiController]
[Route("api/v2")]
public class V2MusicController : ControllerBase
{
    private readonly V2MusicService _v2;

    public V2MusicController(V2MusicService v2)
    {
        _v2 = v2;
    }

    [HttpGet("health")]
    public IActionResult Health() => Ok(new { status = "ok", version = "v2", timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() });

    [HttpGet("search")]
    public async Task<IActionResult> Search(
        [FromQuery] string q = "",
        [FromQuery] int page = 1,
        [FromQuery] int limit = 30,
        [FromQuery] string source = "all")
    {
        if (string.IsNullOrWhiteSpace(q))
            return Ok(new V2SearchResult { Source = source, Page = page, Limit = limit });
        var result = await _v2.SearchAsync(q.Trim(), page, limit, source);
        return Ok(result);
    }

    [HttpGet("search/hot")]
    public async Task<IActionResult> HotSearch([FromQuery] string source = "netease")
    {
        var keywords = await _v2.HotSearchAsync(source);
        return Ok(new { source = source.ToLower().Trim(), keywords });
    }

    [HttpGet("search/suggest")]
    public async Task<IActionResult> Suggest(
        [FromQuery] string q = "",
        [FromQuery] string source = "kuwo",
        [FromQuery] int limit = 8)
    {
        if (string.IsNullOrWhiteSpace(q))
            return Ok(new { source = source.ToLower().Trim(), suggestions = Array.Empty<object>() });
        var suggestions = await _v2.SuggestAsync(q.Trim(), source, limit);
        return Ok(new { source = source.ToLower().Trim(), suggestions });
    }

    [HttpGet("toplist")]
    public async Task<IActionResult> Toplist(
        [FromQuery] string source = "netease",
        [FromQuery] string category = "hot",
        [FromQuery] int limit = 10)
    {
        var result = await _v2.ToplistAsync(source, category, limit);
        return Ok(result);
    }

    /// <summary>
    /// 302-redirects to the official CDN URL by default; 404 with error for
    /// VIP-locked/unavailable. Pass format=json to receive the resolved URL as
    /// JSON ({"url","error","source","id","quality"}) instead of a redirect —
    /// used by script engines and quality probing.
    /// </summary>
    [HttpGet("song/url")]
    public async Task<IActionResult> SongUrl(
        [FromQuery] string source = "kuwo",
        [FromQuery] string id = "",
        [FromQuery] string? rid = null,
        [FromQuery] string quality = "high",
        [FromQuery] string format = "redirect")
    {
        Response.Headers["Access-Control-Allow-Origin"] = "*";
        var songId = string.IsNullOrEmpty(id) ? rid ?? "" : id;
        var (url, error) = await _v2.ResolveSongUrlAsync(source, songId.Trim(), quality.ToLower().Trim());

        if (format.Equals("json", StringComparison.OrdinalIgnoreCase))
        {
            return Ok(new
            {
                url = url ?? "",
                error = string.IsNullOrEmpty(url) ? error ?? "unavailable" : null,
                source = source.ToLower().Trim(),
                id = songId,
                quality = quality.ToLower().Trim(),
            });
        }

        if (string.IsNullOrEmpty(url))
        {
            Response.StatusCode = 404;
            return new ObjectResult(new
            {
                url = "",
                error = error ?? "unavailable",
                source = source.ToLower().Trim(),
                id = songId,
            });
        }

        return Redirect(url);
    }

    /// <summary>Meta + pay/fee pre-check (avoid doomed song/url calls).</summary>
    [HttpGet("song/info")]
    public async Task<IActionResult> SongInfo(
        [FromQuery] string source = "kuwo",
        [FromQuery] string id = "",
        [FromQuery] string? rid = null)
    {
        var songId = string.IsNullOrEmpty(id) ? rid ?? "" : id;
        var info = await _v2.SongInfoAsync(source, songId.Trim());
        if (info is null)
            return NotFound(new { error = "song_not_found", source = source.ToLower().Trim(), id = songId });
        return Ok(info);
    }

    [HttpGet("song/lyric")]
    public async Task<IActionResult> Lyric(
        [FromQuery] string source = "kuwo",
        [FromQuery] string id = "",
        [FromQuery] string? rid = null)
    {
        var songId = string.IsNullOrEmpty(id) ? rid ?? "" : id;
        var lrc = await _v2.LyricAsync(source, songId.Trim());
        return Ok(new { lrc = lrc.Lrc, translation = lrc.Tlyric });
    }

    /// <summary>302-redirects to the official cover CDN.</summary>
    [HttpGet("song/pic")]
    public async Task<IActionResult> SongPic(
        [FromQuery] string source = "netease",
        [FromQuery] string id = "",
        [FromQuery] string? rid = null,
        [FromQuery] string? url = null)
    {
        Response.Headers["Access-Control-Allow-Origin"] = "*";
        if (!string.IsNullOrEmpty(url) && url.StartsWith("http"))
            return Redirect(url.Replace("http://", "https://"));

        var songId = string.IsNullOrEmpty(id) ? rid ?? "" : id;
        var resolved = await _v2.CoverUrlAsync(source, songId.Trim());
        if (string.IsNullOrEmpty(resolved))
        {
            Response.StatusCode = 404;
            return new ObjectResult(new { error = "cover_not_available" });
        }
        return Redirect(resolved);
    }

    // ── MV (music videos, NetEase official) ────────────────────────

    /// <summary>Search official music videos by keyword.</summary>
    [HttpGet("mv/search")]
    public async Task<IActionResult> MvSearch(
        [FromQuery] string q = "",
        [FromQuery] int page = 1,
        [FromQuery] int limit = 30)
    {
        var query = q.Trim();
        if (string.IsNullOrEmpty(query))
            return Ok(new { mvs = Array.Empty<object>(), total = 0, page, limit });
        var (mvs, total) = await _v2.MvSearchAsync(query, page, Math.Clamp(limit, 1, 60));
        return Ok(new { mvs, total, page, limit });
    }

    /// <summary>Resolve an mp4 play URL for an MV at the requested resolution.</summary>
    [HttpGet("mv/url")]
    public async Task<IActionResult> MvUrl(
        [FromQuery] string id = "",
        [FromQuery] int r = 720)
    {
        Response.Headers["Access-Control-Allow-Origin"] = "*";
        var (url, resolutions) = await _v2.MvUrlAsync(id.Trim(), r);
        if (string.IsNullOrEmpty(url))
        {
            Response.StatusCode = 404;
            return new ObjectResult(new { url = "", error = "mv_unavailable", id, r });
        }
        return Ok(new { url, resolutions, id, r });
    }
}
