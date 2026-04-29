# ── Stage 1: Build React frontend ───────────────────────────────────────────
FROM node:22-alpine AS frontend
WORKDIR /ui
COPY src/ui/package*.json ./
RUN npm ci
COPY src/ui/ ./
RUN npm run build

# ── Stage 2: Build .NET API ──────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS api-build
WORKDIR /src
COPY src/api/ .
RUN dotnet publish CableJack.Api/CableJack.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-self-contained

# ── Stage 3: Runtime ─────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

FROM runtime
WORKDIR /app
COPY --from=api-build /app/publish ./
COPY --from=frontend /ui/dist ./wwwroot/
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "CableJack.Api.dll"]
