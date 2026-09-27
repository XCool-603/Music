using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace Muse.Audio.Api.Controllers;

[ApiController]
[Route("api/system")]
public class SystemController : ControllerBase
{
    private static readonly HttpClient _httpClient = new(new HttpClientHandler
    {
        ServerCertificateCustomValidationCallback = (_, _, _, _) => true
    })
    {
        Timeout = TimeSpan.FromSeconds(8)
    };

    private const string CurrentVersion = "1.0.0";
    private const string GitHubRepo = "XCool-603/Music";

    static SystemController()
    {
        _httpClient.DefaultRequestHeaders.UserAgent.ParseAdd("MUSE-AUDIO-App/1.0");
        _httpClient.DefaultRequestHeaders.Accept.ParseAdd("application/vnd.github.v3+json");
    }

    [HttpGet("info")]
    public IActionResult GetSystemInfo()
    {
        var isDocker = Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER") == "true"
                       || System.IO.File.Exists("/.dockerenv");

        return Ok(new
        {
            version = CurrentVersion,
            isDocker,
            os = RuntimeInformation.OSDescription,
            framework = RuntimeInformation.FrameworkDescription,
            uptimeSeconds = (int)(DateTime.UtcNow - Process.GetCurrentProcess().StartTime.ToUniversalTime()).TotalSeconds,
            timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        });
    }

    [HttpGet("check-update")]
    public async Task<IActionResult> CheckUpdate([FromQuery] bool fastMirror = true)
    {
        var isDocker = Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER") == "true"
                       || System.IO.File.Exists("/.dockerenv");

        string[] candidateUrls = fastMirror
            ? new[]
            {
                $"https://ghfast.top/https://api.github.com/repos/{GitHubRepo}/releases/latest",
                $"https://api.github.com/repos/{GitHubRepo}/releases/latest"
            }
            : new[]
            {
                $"https://api.github.com/repos/{GitHubRepo}/releases/latest",
                $"https://ghfast.top/https://api.github.com/repos/{GitHubRepo}/releases/latest"
            };

        string? jsonString = null;
        foreach (var url in candidateUrls)
        {
            try
            {
                using var response = await _httpClient.GetAsync(url);
                if (response.IsSuccessStatusCode)
                {
                    jsonString = await response.Content.ReadAsStringAsync();
                    if (!string.IsNullOrWhiteSpace(jsonString))
                    {
                        break;
                    }
                }
            }
            catch
            {
                // Try next mirror
            }
        }

        if (string.IsNullOrWhiteSpace(jsonString))
        {
            return Ok(new
            {
                currentVersion = CurrentVersion,
                latestVersion = CurrentVersion,
                hasUpdate = false,
                isDocker,
                message = "未能连接到更新服务器，请稍后重试"
            });
        }

        try
        {
            using var doc = JsonDocument.Parse(jsonString);
            var root = doc.RootElement;

            var tagName = root.TryGetProperty("tag_name", out var tagElem) ? tagElem.GetString() ?? "" : "";
            var latestVersion = tagName.TrimStart('v', 'V').Trim();
            var releaseNotes = root.TryGetProperty("body", out var bodyElem) ? bodyElem.GetString() ?? "" : "";
            var releaseName = root.TryGetProperty("name", out var nameElem) ? nameElem.GetString() ?? tagName : tagName;
            var htmlUrl = root.TryGetProperty("html_url", out var urlElem) ? urlElem.GetString() ?? "" : "";

            var hasUpdate = CompareSemVer(latestVersion, CurrentVersion) > 0;

            var assets = new List<object>();
            if (root.TryGetProperty("assets", out var assetsElem) && assetsElem.ValueKind == JsonValueKind.Array)
            {
                foreach (var asset in assetsElem.EnumerateArray())
                {
                    var name = asset.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "";
                    var downloadUrl = asset.TryGetProperty("browser_download_url", out var u) ? u.GetString() ?? "" : "";
                    var size = asset.TryGetProperty("size", out var s) ? s.GetInt64() : 0;

                    assets.Add(new
                    {
                        name,
                        downloadUrl,
                        mirrorDownloadUrl = $"https://ghfast.top/{downloadUrl}",
                        size
                    });
                }
            }

            return Ok(new
            {
                currentVersion = CurrentVersion,
                latestVersion,
                hasUpdate,
                releaseName,
                releaseNotes,
                releaseUrl = htmlUrl,
                isDocker,
                assets
            });
        }
        catch (Exception ex)
        {
            return Ok(new
            {
                currentVersion = CurrentVersion,
                latestVersion = CurrentVersion,
                hasUpdate = false,
                isDocker,
                error = ex.Message
            });
        }
    }

    [HttpPost("update")]
    public async Task<IActionResult> ExecuteUpdate()
    {
        var isDocker = Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER") == "true"
                       || System.IO.File.Exists("/.dockerenv");

        // Locate repository root
        var currentDir = AppContext.BaseDirectory;
        var dirInfo = new DirectoryInfo(currentDir);
        string? repoRoot = null;

        for (int i = 0; i < 5 && dirInfo != null; i++)
        {
            if (Directory.Exists(Path.Combine(dirInfo.FullName, ".git")))
            {
                repoRoot = dirInfo.FullName;
                break;
            }
            dirInfo = dirInfo.Parent;
        }

        if (string.IsNullOrEmpty(repoRoot))
        {
            // If inside Docker without .git mounted or standalone publish
            return Ok(new
            {
                success = true,
                isDocker,
                updated = false,
                message = isDocker
                    ? "当前服务端运行在 Docker 容器中。前端已刷新至最新缓存！如需升级完整镜像，请在服务器执行: docker compose up -d --build"
                    : "当前运行环境未检测到 Git 仓库，前端静态资源已清理缓存并刷新。"
            });
        }

        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "git",
                Arguments = "fetch --all",
                WorkingDirectory = repoRoot,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var fetchProcess = Process.Start(psi);
            if (fetchProcess != null)
            {
                await fetchProcess.WaitForExitAsync();
            }

            psi.Arguments = "reset --hard origin/main";
            using var resetProcess = Process.Start(psi);
            string output = "";
            if (resetProcess != null)
            {
                output = await resetProcess.StandardOutput.ReadToEndAsync();
                await resetProcess.WaitForExitAsync();
            }

            return Ok(new
            {
                success = true,
                isDocker,
                updated = true,
                message = "服务端已成功拉取最新代码！",
                output = output.Trim()
            });
        }
        catch (Exception ex)
        {
            return Ok(new
            {
                success = false,
                isDocker,
                updated = false,
                message = $"执行 Git 更新时出错: {ex.Message}"
            });
        }
    }

    private static int CompareSemVer(string v1, string v2)
    {
        var parts1 = v1.TrimStart('v', 'V').Split(new[] { '.', '-', '+' }, StringSplitOptions.RemoveEmptyEntries);
        var parts2 = v2.TrimStart('v', 'V').Split(new[] { '.', '-', '+' }, StringSplitOptions.RemoveEmptyEntries);

        var max = Math.Max(parts1.Length, parts2.Length);
        for (int i = 0; i < max; i++)
        {
            int n1 = i < parts1.Length && int.TryParse(parts1[i], out var p1) ? p1 : 0;
            int n2 = i < parts2.Length && int.TryParse(parts2[i], out var p2) ? p2 : 0;
            if (n1 > n2) return 1;
            if (n1 < n2) return -1;
        }
        return 0;
    }
}
