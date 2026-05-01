<p align="center">
  <img src="https://github.com/jackobrien44/CableJack/raw/main/docs/logo.png" alt="Logo">
</p>

# CableJack

A self-hosted IPTV streaming application. Import M3U playlists and XMLTV EPG data from your provider and watch live channels from any browser.

## Features

- **Live streaming** — HLS playback powered by ffmpeg transcoding
- **TV Guide** — EPG grid showing current and upcoming programmes with search
- **Favorites** — pin channels for quick access
- **Multi-user** — role-based access (User / Administrator)
- **Admin dashboard** — real-time stream monitoring, activity charts, watch history, and user stats
- **Provider management** — manage multiple IPTV providers, import M3U and EPG by file or URL
- **Configurable limits** — max concurrent streams per user, registration mode (open / invite-only / disabled)

## Stack

| Layer | Technology |
|---|---|
| Backend | ASP.NET Core (.NET 10), Entity Framework Core, SQLite |
| Frontend | React, TypeScript, Tailwind CSS, TanStack Query |
| Streaming | ffmpeg (HLS) |

## Local development

**Prerequisites:** [.NET 10 SDK](https://dotnet.microsoft.com/download), [Node.js 22](https://nodejs.org/), [FFmpeg](https://ffmpeg.org/download.html)

Run the backend and frontend in separate terminals.

**Terminal 1 — API**

```bash
cd src/api/CableJack.Api
dotnet run
```

Runs on `https://localhost:7248`. Swagger UI is available at `https://localhost:7248/swagger`.

**Terminal 2 — UI**

```bash
cd src/ui
npm install
npm run dev
```

Runs on `http://localhost:5173`. The dev server proxies `/api` and `/streams` to the backend automatically.

**Configuration**

Settings live in `src/api/CableJack.Api/appsettings.json`. Values most likely to need changing locally:

| Key | Description |
|---|---|
| `Streaming:FfmpegPath` | Path to your FFmpeg executable |
| `Streaming:OutputPath` | Where HLS segments are written (default: `wwwroot/streams`) |

## Deployment

A Docker image is published to the GitHub Container Registry on every release.

```yaml
services:
  cablejack:
    image: ghcr.io/jackobrien44/cablejack:latest
    ports:
      - "5000:5000"
    volumes:
      - ./data:/app/data
    environment:
      - ConnectionStrings__DefaultConnection=Data Source=/app/data/cablejack.db
```

Or build from source:

```bash
docker build -t cablejack .
docker run -p 5000:5000 cablejack
```

## License
This project is licensed under the MIT License.
