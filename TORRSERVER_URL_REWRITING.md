# TorrServer URL Rewriting - Technical Documentation

## Overview

This feature rewrites Torrentio magnet links to TorrServer streaming URLs, allowing you to stream torrents through your local TorrServer instance instead of using external services.

## URL Reformatting Procedure

### Step-by-Step Process

#### 1. **Original Torrentio Stream Object**

When Torrentio returns a stream, it looks like this:

```json
{
  "title": "🇬🇧 4K HDR 👤 3 💾 15.2 GB ⚙️ YTS",
  "name": "Movie.Name.2024.2160p.WEB-DL.HDR.DDP5.1.x265-YTS",
  "url": "magnet:?xt=urn:btih:a1b2c3d4e5f6789012345678901234567890abcd&dn=Movie.Name.2024.2160p&tr=..."
}
```

The `url` field contains a **magnet link** with:
- `xt=urn:btih:<INFOHASH>` - The unique torrent identifier
- `dn=<NAME>` - Display name (optional)
- `tr=<TRACKER>` - Tracker URLs (optional)

#### 2. **Extract InfoHash**

The middleware uses a regex pattern to extract the infoHash:

```javascript
/xt=urn:btih:([a-fA-F0-9]{40}|[a-zA-Z2-7]{32})/i
```

This matches:
- **40 hexadecimal characters** (standard format): `a1b2c3d4e5f6789012345678901234567890abcd`
- **32 base32 characters** (alternative format): `MFRGG2LTMVRGS3THMFZGC3LBMQ`

**Example:**
```
Input:  magnet:?xt=urn:btih:a1b2c3d4e5f6789012345678901234567890abcd&dn=Movie
Output: a1b2c3d4e5f6789012345678901234567890abcd
```

#### 3. **Extract Filename**

The middleware extracts the filename from the stream object:

```javascript
// Priority order:
1. stream.behaviorHints.filename (if present)
2. stream.name (torrent release name)
3. "video.mkv" (fallback)
```

**Example:**
```
stream.name = "House.of.Guinness.S01E01.1080p.WEB.h264-ETHEL[EZTVx.to].mkv"
```

#### 4. **Build TorrServer URL**

The middleware constructs a new URL with the following structure:

```
https://<TORRSERVER_IP>:<PORT>/stream/<FILENAME>?link=<INFOHASH>&index=1&play[&preload]
```

**URL Components:**

| Component | Value | Description |
|-----------|-------|-------------|
| Path | `/stream/<filename>` | URL-encoded filename (from stream.name or behaviorHints) |
| `link` | InfoHash (40 hex chars) | Just the infoHash, NOT the full magnet link |
| `index` | `1` | File index to stream (1 = first/main video file) |
| `play` | (flag) | Tells TorrServer to start streaming immediately |
| `preload` | (flag, optional) | Pre-buffers content for smoother playback |

**Example Transformation:**

```javascript
// Original stream data
const stream = {
  name: "House.of.Guinness.S01E01.1080p.WEB.h264-ETHEL[EZTVx.to].mkv",
  url: "magnet:?xt=urn:btih:93f2b0958110ab07496e289b70eb9c30b9866ddd&dn=..."
};

// Extract infoHash
const infoHash = "93f2b0958110ab07496e289b70eb9c30b9866ddd";

// URL-encode filename
const encodedFilename = "House.of.Guinness.S01E01.1080p.WEB.h264-ETHEL%5BEZTVx.to%5D.mkv";

// Final TorrServer URL (with preload)
const torrServerUrl = "https://192.168.1.89:8090/stream/House.of.Guinness.S01E01.1080p.WEB.h264-ETHEL%5BEZTVx.to%5D.mkv?link=93f2b0958110ab07496e289b70eb9c30b9866ddd&index=1&play&preload";
```

#### 5. **Replace Stream URL**

The middleware replaces the original magnet link with the TorrServer URL:

```json
{
  "title": "🇬🇧 4K HDR 👤 3 💾 15.2 GB ⚙️ YTS",
  "name": "Movie.Name.2024.2160p.WEB-DL.HDR.DDP5.1.x265-YTS",
  "url": "https://192.168.1.89:8090/stream/Movie.Name.2024.2160p.WEB-DL.HDR.DDP5.1.x265-YTS?link=a1b2c3d4e5f6789012345678901234567890abcd&index=1&play&preload"
}
```

## Configuration

### Option 1: Configuration File (`config/default.json`)

```json
{
  "torrserver": {
    "baseUrl": "https://192.168.1.89:8090",
    "enabled": true,
    "preload": true
  }
}
```

### Option 2: Environment Variables

```bash
TORRSERVER_URL=https://192.168.1.89:8090
TORRSERVER_ENABLED=true
TORRSERVER_PRELOAD=true
```

### Configuration Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `baseUrl` | string | - | Your TorrServer instance URL (including protocol and port) |
| `enabled` | boolean | `false` | Enable/disable URL rewriting |
| `preload` | boolean | `false` | Add preload flag to TorrServer URLs for better buffering |

## Preload Flag

The `preload` flag tells TorrServer to pre-buffer content before streaming starts.

**Benefits:**
- ✅ Smoother playback with less buffering
- ✅ Better experience for slower connections
- ✅ Pre-caches the beginning of the video

**Trade-offs:**
- ⚠️ Slightly longer initial load time
- ⚠️ Uses more bandwidth upfront
- ⚠️ More disk I/O on the TorrServer machine

**When to enable:**
- Fast local network (Gigabit Ethernet, WiFi 6)
- TorrServer has good internet connection
- You want the best streaming experience

**When to disable:**
- Limited bandwidth
- Slow network connection
- You want instant playback start

## Middleware Pipeline

The URL rewriting happens in this order:

```
1. extractTitle          → Parse IMDB ID, type, season, episode
2. getTorrentioStreams   → Fetch streams from Torrentio (magnet links)
3. rewriteStreamUrls     → Convert magnet links to TorrServer URLs ⭐
4. getWizdomSubs         → Fetch Hebrew subtitles
5. enhanceStreamsBySubs  → Filter streams by subtitle availability
6. sendFilteredStreams   → Return final streams to Stremio
```

## How TorrServer Handles the Request

When Stremio/player requests the TorrServer URL:

1. **Parse Request**: TorrServer receives the infoHash and parameters from the URL
2. **Add Torrent**: Adds the torrent to its internal list (if not already present)
3. **Get Metadata**: Connects to peers and downloads torrent metadata
4. **Select File**: Uses `index=1` to select the first video file
5. **Preload (if enabled)**: Pre-buffers the first few pieces of the file
6. **Stream**: Starts HTTP streaming the video content

## Logging

The middleware logs each URL transformation:

```javascript
{
  originalUrl: "magnet:?xt=urn:btih:93f2b0958110ab07496e289b70eb9c30b9866ddd&dn=...",
  newUrl: "https://192.168.1.89:8090/stream/House.of.Guinness.S01E01.1080p.WEB.h264-ETHEL%5BEZTVx.to%5D.mkv?link=93f2b0958110ab07496e289b70eb9c30b9866ddd&index=1&play&preload",
  infoHash: "93f2b0958110ab07496e289b70eb9c30b9866ddd",
  filename: "House.of.Guinness.S01E01.1080p.WEB.h264-ETHEL[EZTVx.to].mkv",
  streamTitle: "🇬🇧 1080p 👤 15 💾 2.1 GB ⚙️ ETHEL",
  preload: true
}
```

## Troubleshooting

### Streams not loading
- ✅ Check TorrServer is running: `https://192.168.1.89:8090`
- ✅ Verify `baseUrl` in config matches your TorrServer URL
- ✅ Ensure TorrServer is accessible from your network
- ✅ Check firewall allows connections to TorrServer port

### Slow buffering
- ✅ Enable `preload: true` in config
- ✅ Check TorrServer has good internet connection
- ✅ Verify torrent has active seeders
- ✅ Consider increasing TorrServer cache size

### URLs not being rewritten
- ✅ Verify `enabled: true` in config
- ✅ Check logs for error messages
- ✅ Ensure middleware is in the correct pipeline position

## Example: Complete Flow

```
User clicks stream in Stremio
    ↓
Stremio requests: /stream/movie/tt1234567.json
    ↓
Torrentio returns: 
  - name: "House.of.Guinness.S01E01.1080p.WEB.h264-ETHEL[EZTVx.to].mkv"
  - url: "magnet:?xt=urn:btih:93f2b0958110ab07496e289b70eb9c30b9866ddd&dn=..."
    ↓
Middleware extracts infoHash: 93f2b0958110ab07496e289b70eb9c30b9866ddd
Middleware extracts filename: House.of.Guinness.S01E01.1080p.WEB.h264-ETHEL[EZTVx.to].mkv
    ↓
Middleware builds: 
  https://192.168.1.89:8090/stream/House.of.Guinness.S01E01.1080p.WEB.h264-ETHEL%5BEZTVx.to%5D.mkv?link=93f2b0958110ab07496e289b70eb9c30b9866ddd&index=1&play&preload
    ↓
Stremio receives rewritten URL
    ↓
Stremio player requests TorrServer URL
    ↓
TorrServer adds torrent by infoHash and streams file at index 1
    ↓
User watches video! 🎬
```

## Security Considerations

- 🔒 Use HTTPS for TorrServer (configured in your setup)
- 🔒 TorrServer should be on your local network only
- 🔒 Don't expose TorrServer to the public internet
- 🔒 Consider using authentication on TorrServer if needed

