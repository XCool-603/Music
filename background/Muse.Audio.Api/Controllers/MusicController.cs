using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Muse.Audio.Api.Models;
using Muse.Audio.Api.Services;

namespace Muse.Audio.Api.Controllers;

[ApiController]
[Route("api")]
public class MusicController : ControllerBase
{
    private static readonly MusicService _music = new();
    private static readonly HttpClient _http = new();

    [HttpGet("health")]
    public IActionResult Health() => Ok(new { status = "ok", timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() });

    [HttpGet("music/search")]
    public async Task<IActionResult> Search(
        [FromQuery] string q = "",
        [FromQuery] int page = 1,
        [FromQuery] int limit = 25,
        [FromQuery] string source = "all",
        [FromQuery] string? platform = null)
    {
        var src = (platform ?? source).ToLower().Trim();
        var result = await _music.SearchAsync(q, page, limit, src);
        return Ok(result);
    }

    [HttpGet("music/stream")]
    public async Task Stream(
        [FromQuery] string source = "",
        [FromQuery] string id = "",
        [FromQuery] string? rid = null,
        [FromQuery] string level = "standard")
    {
        var resolvedId = rid ?? id;
        var url = await _music.ResolveStreamUrlAsync(source.ToLower().Trim(), id.Trim(), resolvedId.Trim(), level.ToLower().Trim());
        if (string.IsNullOrEmpty(url))
        {
            Response.StatusCode = 404;
            await Response.WriteAsync("Audio stream not available");
            return;
        }
        await _music.PipeAudioStreamAsync(url, GetRefererForSource(source), HttpContext);
    }

    // Lightweight: resolve the official/direct CDN URL without proxying content.
    // Lets the frontend play/download straight from the source (single-bandwidth),
    // falling back to /api/music/stream if the direct load fails.
    [HttpGet("music/stream-url")]
    public async Task<IActionResult> StreamUrl(
        [FromQuery] string source = "",
        [FromQuery] string id = "",
        [FromQuery] string? rid = null,
        [FromQuery] string level = "standard")
    {
        var resolvedId = rid ?? id;
        var url = await _music.ResolveStreamUrlAsync(source.ToLower().Trim(), id.Trim(), resolvedId.Trim(), level.ToLower().Trim());
        if (string.IsNullOrEmpty(url))
            return NotFound(new { url = "", error = "Audio stream not available" });

        Response.Headers["Access-Control-Allow-Origin"] = "*";
        return Ok(new { url, source = source.ToLower().Trim(), level = level.ToLower().Trim() });
    }

    [HttpGet("music/lyric")]
    public async Task<IActionResult> Lyric(
        [FromQuery] string source = "",
        [FromQuery] string id = "",
        [FromQuery] string? rid = null)
    {
        var result = await _music.ResolveLyricAsync(source.ToLower().Trim(), id.Trim(), (rid ?? id).Trim());
        return Ok(result);
    }

    [HttpGet("music/cover")]
    public async Task Cover(
        [FromQuery] string source = "",
        [FromQuery] string id = "",
        [FromQuery] string url = "")
    {
        var resolved = await _music.ResolveCoverAsync(source.ToLower().Trim(), id.Trim(), url.Trim());
        Response.Redirect(resolved);
    }

    [HttpGet("music/download")]
    public async Task Download(
        [FromQuery] string url = "",
        [FromQuery] string source = "",
        [FromQuery] string id = "",
        [FromQuery] string? rid = null,
        [FromQuery] string filename = "music.mp3",
        [FromQuery] string level = "high")
    {
        var resolvedRid = rid ?? id;
        filename = SanitizeFilename(filename);
        if (!filename.EndsWith(".mp3", StringComparison.OrdinalIgnoreCase) &&
            !filename.EndsWith(".flac", StringComparison.OrdinalIgnoreCase) &&
            !filename.EndsWith(".m4a", StringComparison.OrdinalIgnoreCase) &&
            !filename.EndsWith(".wav", StringComparison.OrdinalIgnoreCase))
            filename += ".mp3";

        if (string.IsNullOrEmpty(url) || url.StartsWith("/api/music/stream"))
        {
            url = await _music.ResolveStreamUrlAsync(source.ToLower().Trim(), id.Trim(), resolvedRid.Trim(), level.ToLower().Trim()) ?? "";
        }

        if (string.IsNullOrEmpty(url))
        {
            Response.StatusCode = 400;
            await Response.WriteAsync("Unable to resolve audio download stream URL");
            return;
        }

        try
        {
            var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
            req.Headers.Add("Accept", "*/*");
            if (url.Contains("kuwo.cn")) req.Headers.Add("Referer", "https://www.kuwo.cn/");
            else if (url.Contains("163.com") || url.Contains("126.net")) req.Headers.Add("Referer", "https://music.163.com/");
            else if (url.Contains("qq.com")) req.Headers.Add("Referer", "https://y.qq.com/");

            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
            using var upstream = await _http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, cts.Token);

            if (!upstream.IsSuccessStatusCode)
            {
                Response.StatusCode = (int)upstream.StatusCode;
                await Response.WriteAsync("Upstream download server returned error");
                return;
            }

            var encoded = Uri.EscapeDataString(filename);
            Response.ContentType = upstream.Content.Headers.ContentType?.MediaType ?? "audio/mpeg";
            Response.Headers["Content-Disposition"] = $"attachment; filename=\"{encoded}\"; filename*=UTF-8''{encoded}";
            Response.Headers["Access-Control-Allow-Origin"] = "*";
            if (upstream.Content.Headers.ContentLength.HasValue)
                Response.ContentLength = upstream.Content.Headers.ContentLength;

            await using var stream = await upstream.Content.ReadAsStreamAsync();
            await stream.CopyToAsync(Response.Body);
            await Response.CompleteAsync();
        }
        catch (Exception ex)
        {
            if (!Response.HasStarted)
                await Response.WriteAsync($"Download failed: {ex.Message}");
        }
    }

    [HttpGet("music/download/lrc")]
    public async Task DownloadLrc(
        [FromQuery] string source = "",
        [FromQuery] string id = "",
        [FromQuery] string? rid = null,
        [FromQuery] string filename = "lyrics.lrc",
        [FromQuery] string raw = "")
    {
        filename = SanitizeFilename(filename);
        if (!filename.EndsWith(".lrc", StringComparison.OrdinalIgnoreCase)) filename += ".lrc";
        var encoded = Uri.EscapeDataString(filename);
        Response.ContentType = "text/plain; charset=utf-8";
        Response.Headers["Content-Disposition"] = $"attachment; filename=\"{encoded}\"; filename*=UTF-8''{encoded}";
        Response.Headers["Access-Control-Allow-Origin"] = "*";

        if (!string.IsNullOrEmpty(raw))
        {
            await Response.WriteAsync(raw);
            return;
        }

        if (!string.IsNullOrEmpty(rid) || !string.IsNullOrEmpty(id))
        {
            var lyric = await _music.ResolveLyricAsync(source.ToLower().Trim(), id.Trim(), (rid ?? id).Trim());
            if (!string.IsNullOrEmpty(lyric.Lrc))
            {
                await Response.WriteAsync(lyric.Lrc);
                return;
            }
        }

        await Response.WriteAsync($"[00:00.00]{filename.Replace(".lrc", "")}\n[00:01.00]Wavesound Music Player\n");
    }

    private static string GetRefererForSource(string source) => source.ToLower() switch
    {
        "kuwo" or "kw" => "http://www.kuwo.cn/",
        "netease" or "wy" => "https://music.163.com/",
        _ => "https://www.kuwo.cn/"
    };

    private static string SanitizeFilename(string name) =>
        Regex.Replace(name, @"[\\/:*?""<>|]", "_");
}
