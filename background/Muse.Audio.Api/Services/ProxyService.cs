using System.Net;
using System.Text;
using System.Text.Json;
using Muse.Audio.Api.Models;

namespace Muse.Audio.Api.Services;

public class ProxyService
{
    private static readonly HttpClient SharedHttp = new(new HttpClientHandler
    {
        AutomaticDecompression = DecompressionMethods.All,
        AllowAutoRedirect = true
    });

    // ── Universal HTTP Request Proxy ─────────────────────────────
    public async Task<ProxyResponse> ProxyRequestAsync(ProxyRequest req)
    {
        if (string.IsNullOrEmpty(req.Url))
            return new ProxyResponse { StatusCode = 400, Error = "Missing url" };

        try
        {
            var method = (req.Method ?? "GET").ToUpper();
            var headers = req.Headers ?? new Dictionary<string, string>();

            headers.TryAdd("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
            headers.TryAdd("Accept", "*/*");
            headers.Remove("host");
            headers.Remove("Host");

            var httpReq = new HttpRequestMessage(new HttpMethod(method), req.Url);
            foreach (var kv in headers)
                httpReq.Headers.TryAddWithoutValidation(kv.Key, kv.Value);

            if (req.Body != null && method is not "GET" and not "HEAD")
            {
                var bodyStr = req.Body is string s ? s : JsonSerializer.Serialize(req.Body);
                httpReq.Content = new StringContent(bodyStr, Encoding.UTF8,
                    headers.TryGetValue("Content-Type", out var ct) ? ct : "application/json");
            }
            else if (req.Form != null && method is not "GET" and not "HEAD")
            {
                var ps = new System.Collections.Specialized.NameValueCollection();
                foreach (var kv in req.Form) ps[kv.Key] = kv.Value;
                var formStr = string.Join("&", ps.AllKeys!.Select(k => $"{Uri.EscapeDataString(k!)}={Uri.EscapeDataString(ps[k]!)}"));
                httpReq.Content = new StringContent(formStr, Encoding.UTF8, "application/x-www-form-urlencoded");
            }

            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(12));
            using var resp = await SharedHttp.SendAsync(httpReq, cts.Token);
            var text = await resp.Content.ReadAsStringAsync();
            object? body = null;
            try { body = JsonSerializer.Deserialize<JsonElement>(text); }
            catch { body = text; }

            var respHeaders = resp.Content.Headers
                .ToDictionary(h => h.Key, h => string.Join(", ", h.Value));

            return new ProxyResponse
            {
                StatusCode = (int)resp.StatusCode,
                Headers = respHeaders,
                Body = body
            };
        }
        catch (Exception ex)
        {
            return new ProxyResponse { StatusCode = 500, Error = ex.Message };
        }
    }

    // ── Audio Stream Proxy ───────────────────────────────────────
    public async Task PipeAudioProxyAsync(string targetUrl, string? referer, string? ua, HttpContext ctx)
    {
        try
        {
            var req = new HttpRequestMessage(HttpMethod.Get, targetUrl);
            var userAgent = ua ?? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
            req.Headers.Add("User-Agent", userAgent);
            req.Headers.Add("Accept", "*/*");

            if (!string.IsNullOrEmpty(referer))
                req.Headers.Add("Referer", referer);
            else if (targetUrl.Contains("qq.com"))
                req.Headers.Add("Referer", "https://y.qq.com/");
            else if (targetUrl.Contains("163.com") || targetUrl.Contains("126.net"))
                req.Headers.Add("Referer", "https://music.163.com/");
            else if (targetUrl.Contains("kugou.com"))
                req.Headers.Add("Referer", "https://www.kugou.com/");
            else if (targetUrl.Contains("kuwo.cn"))
                req.Headers.Add("Referer", "https://www.kuwo.cn/");

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

            if (upstream.Content.Headers.ContentLength == 0)
            {
                await ctx.Response.CompleteAsync();
                return;
            }

            await using var stream = await upstream.Content.ReadAsStreamAsync();
            await stream.CopyToAsync(ctx.Response.Body);
            await ctx.Response.CompleteAsync();
        }
        catch (Exception ex)
        {
            if (!ctx.Response.HasStarted)
                await ctx.Response.WriteAsync($"Audio proxy failed: {ex.Message}");
        }
    }
}
