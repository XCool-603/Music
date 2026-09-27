# ==========================================
# MUSE.AUDIO - Production Dockerfile (.NET 8 + Static Web)
# ==========================================

# Stage 1: Build .NET 8 Backend
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project files and build
COPY background/Muse.Audio.Api/ ./background/Muse.Audio.Api/
WORKDIR /src/background/Muse.Audio.Api
RUN dotnet publish Muse.Audio.Api.csproj -c Release -o /app/publish

# Stage 2: ASP.NET Core 8 Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Copy published application (includes wwwroot frontend static assets)
COPY --from=build /app/publish .

# Environment configuration
ENV PORT=3001
ENV ASPNETCORE_URLS=http://0.0.0.0:3001
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 3001

ENTRYPOINT ["dotnet", "Muse.Audio.Api.dll"]
