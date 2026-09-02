using Microsoft.Extensions.FileProviders;
using Muse.Audio.Api.Services;
using Muse.Audio.Api.Services.Official;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
// v2 official-upstream clients (v1 MusicController keeps its static new() MusicService untouched).
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<MusicService>();
builder.Services.AddSingleton<KuwoOfficialClient>();
builder.Services.AddSingleton<NetEaseOfficialClient>();
builder.Services.AddSingleton<V2MusicService>();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader()
              .WithExposedHeaders("Content-Range", "Accept-Ranges", "Content-Disposition");
    });
});

var app = builder.Build();

var wwwroot = Path.Combine(AppContext.BaseDirectory, "wwwroot");

if (Directory.Exists(wwwroot))
{
    app.UseDefaultFiles(new DefaultFilesOptions
    {
        FileProvider = new PhysicalFileProvider(wwwroot),
        DefaultFileNames = { "index.html" }
    });

    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(wwwroot),
        RequestPath = ""
    });
}

app.UseCors();

app.MapControllers();

var port = Environment.GetEnvironmentVariable("PORT") ?? "3001";
app.Run($"http://0.0.0.0:{port}");
