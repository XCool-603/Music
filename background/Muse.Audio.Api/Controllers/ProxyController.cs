using Microsoft.AspNetCore.Mvc;
using Muse.Audio.Api.Models;
using Muse.Audio.Api.Services;

namespace Muse.Audio.Api.Controllers;

[ApiController]
[Route("api/proxy")]
public class ProxyController : ControllerBase
{
    private static readonly ProxyService _proxy = new();

    [HttpPost("request")]
    public async Task<IActionResult> RequestProxy([FromBody] ProxyRequest req)
    {
        var result = await _proxy.ProxyRequestAsync(req);
        return Ok(result);
    }

    [HttpGet("audio")]
    public async Task AudioProxy(
        [FromQuery] string url = "",
        [FromQuery] string? referer = null,
        [FromQuery] string? ua = null)
    {
        if (string.IsNullOrEmpty(url))
        {
            Response.StatusCode = 400;
            await Response.WriteAsync("Missing url query parameter");
            return;
        }
        await _proxy.PipeAudioProxyAsync(url, referer, ua, HttpContext);
    }

    /// <summary>
    /// Video alias of the audio pipe: same streaming logic (Range passthrough,
    /// content-type passthrough) for mp4 MV playback. Media CDNs reject
    /// cross-origin/hotlinked embeds, so the browser must stream via us.
    /// </summary>
    [HttpGet("video")]
    public Task VideoProxy(
        [FromQuery] string url = "",
        [FromQuery] string? referer = null,
        [FromQuery] string? ua = null)
        => AudioProxy(url, referer, ua);
}
