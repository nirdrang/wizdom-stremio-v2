# Deployment Guide

This document describes the deployment process and configuration for the Wizdom Stremio V2 addon.

## Table of Contents

- [Overview](#overview)
- [BeamUp Configuration](#beamup-configuration)
- [Configuration Files](#configuration-files)
- [Environment Variables](#environment-variables)
- [Git Remotes](#git-remotes)
- [Development Workflow](#development-workflow)
- [Deployment Process](#deployment-process)
- [Viewing Logs](#viewing-logs)
- [Troubleshooting](#troubleshooting)

## Overview

The addon can run in two modes:
- **Local Development** - HTTPS server with local SSL certificates
- **Production (BeamUp)** - HTTP server behind BeamUp's reverse proxy

The mode is controlled by the `isProduction` flag, which is automatically set based on the `NODE_ENV` environment variable.

## BeamUp Configuration

### Project Details

- **Project Name**: `stremio-heb-enhancer-nir7`
- **BeamUp Host**: `a.baby-beamup.club`
- **Production URL**: `https://28aa7e9346ec-stremio-heb-enhancer-nir7.baby-beamup.club`
- **Manifest URL**: `https://28aa7e9346ec-stremio-heb-enhancer-nir7.baby-beamup.club/manifest.json`

### BeamUp Remote

```
dokku@a.baby-beamup.club:28aa7e9346ec/stremio-heb-enhancer-nir7
```

## Configuration Files

### 1. `/beamup.json` (Root)

**Purpose**: BeamUp CLI configuration for deployment

```json
{
  "host": "a.baby-beamup.club",
  "app": "stremio-heb-enhancer-nir7"
}
```

### 2. `/config/default.json`

**Purpose**: Default configuration for local development

```json
{
  "srtUnzipperRoute": "/srt/",
  "port": 8080,
  "hostname": "auto",
  "isProduction": false,
  "torrentio": {
    "baseUrl": "https://torrentio.strem.fun",
    "timeout": 10000
  },
  "torrserver": {
    "baseUrl": "http://192.168.1.89:8090",
    "enabled": false,
    "preload": true
  },
  "filtering": {
    "primaryLanguage": "hebrew",
    "hebrewOnly": true
  }
}
```

### 3. `/config/beamup.json`

**Purpose**: Production configuration (loaded when `NODE_ENV=beamup`)

```json
{
  "hostname": "https://28aa7e9346ec-stremio-heb-enhancer-nir7.baby-beamup.club",
  "isProduction": true
}
```

This file overrides `default.json` values when running on BeamUp.

### 4. `/config/custom-environment-variables.json`

**Purpose**: Maps environment variables to configuration values

```json
{
  "port": "PORT",
  "torrentio": {
    "baseUrl": "TORRENTIO_BASE_URL"
  },
  "torrserver": {
    "baseUrl": "TORRSERVER_URL",
    "enabled": "TORRSERVER_ENABLED",
    "preload": "TORRSERVER_PRELOAD"
  }
}
```

## Environment Variables

### Required Secrets (BeamUp)

#### 1. `NODE_ENV=beamup`
- **Required**: Yes
- **Purpose**: Loads `config/beamup.json` and enables production mode
- **Set on BeamUp**: ✅ Yes

#### 2. `TORRENTIO_BASE_URL`
- **Required**: No (has default)
- **Current Value**: `https://torrentio.strem.fun/realdebrid=JZEK4E2EZNIXTSYFXZQWX4YD3CGBB2TKCYZE2BFWSNJQ2JJVTDPA`
- **Purpose**: Custom Torrentio URL with RealDebrid integration
- **Set on BeamUp**: ✅ Yes
- **Note**: Contains RealDebrid API key for premium cached torrents

### Optional Secrets

#### `PORT`
- **Default**: `8080`
- **Purpose**: Server port (usually set automatically by BeamUp)

#### `TORRSERVER_URL`
- **Default**: `http://192.168.1.89:8090`
- **Purpose**: TorrServer instance URL (if using TorrServer)

#### `TORRSERVER_ENABLED`
- **Default**: `false`
- **Purpose**: Enable TorrServer integration

#### `TORRSERVER_PRELOAD`
- **Default**: `true`
- **Purpose**: Control TorrServer preload behavior

### Setting Secrets on BeamUp

To add or update a secret:

```bash
beamup secrets <SECRET_NAME> <SECRET_VALUE>
```

Example:
```bash
beamup secrets NODE_ENV beamup
```

**Note**: BeamUp CLI does not support viewing existing secrets for security reasons.

## Git Remotes

The project is configured with two git remotes:

### 1. Origin (GitHub) - Backup & Version Control

```bash
origin  https://github.com/nirdrang/wizdom-stremio-v2.git
```

**Purpose**: Code backup, version control, and collaboration

### 2. BeamUp - Deployment

```bash
beamup  dokku@a.baby-beamup.club:28aa7e9346ec/stremio-heb-enhancer-nir7
```

**Purpose**: Deployment to BeamUp hosting platform

### Viewing Remotes

```bash
git remote -v
```

## Development Workflow

### Making Changes

1. **Edit your code** in the project directory

2. **Test locally** (optional):
   ```bash
   npm start
   ```
   The addon will run at `https://<your-ip>:8080` with HTTPS

3. **Commit your changes**:
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

4. **Push to GitHub** (backup):
   ```bash
   git push origin master
   ```

5. **Push to BeamUp** (deploy):
   ```bash
   git push --progress beamup HEAD:master
   ```

### Quick Deploy Command

After committing changes, deploy to both remotes:

```bash
git push origin master && git push --progress beamup HEAD:master
```

## Deployment Process

### Step-by-Step Deployment

1. **Make your code changes**

2. **Stage changes**:
   ```bash
   git add .
   ```

3. **Commit**:
   ```bash
   git commit -m "Your commit message"
   ```

4. **Push to GitHub** (backup):
   ```bash
   git push origin master
   ```

5. **Push to BeamUp** (deployment):
   ```bash
   git push --progress beamup HEAD:master
   ```

6. **Verify deployment**:
   - Check logs: See [Viewing Logs](#viewing-logs)
   - Test manifest: Visit `https://28aa7e9346ec-stremio-heb-enhancer-nir7.baby-beamup.club/manifest.json`

### What Happens on BeamUp

When you push to BeamUp:
1. Code is transferred to BeamUp servers
2. Dependencies are installed (`npm install`)
3. Application is built
4. Service is restarted with new code
5. Environment variables are applied
6. App becomes available at the production URL

## Viewing Logs

### BeamUp Logs

To view application logs on BeamUp:

```bash
echo stremio-heb-enhancer-nir7 | beamup logs
```

Or interactively (you'll be prompted for project name):

```bash
beamup logs
```

### Startup Logs

When the addon starts, it displays environment configuration:

```
🔧 ============ ENVIRONMENT & CONFIGURATION ============
📌 NODE_ENV: beamup
📌 PORT (env): 8080 → Resolved: 8080
📌 HOSTNAME: https://28aa7e9346ec-stremio-heb-enhancer-nir7.baby-beamup.club
📌 IS_PRODUCTION: true

🌐 Torrentio Configuration:
   TORRENTIO_BASE_URL (env): https://torrentio.strem.fun/realdebrid=...
   → Resolved: https://torrentio.strem.fun/realdebrid=...
   Timeout: 10000ms

📡 TorrServer Configuration:
   TORRSERVER_URL (env): not set
   → Resolved: http://192.168.1.89:8090
   TORRSERVER_ENABLED (env): not set
   → Resolved: false
   TORRSERVER_PRELOAD (env): not set
   → Resolved: true
🔧 ======================================================
```

## Troubleshooting

### Common Issues

#### 1. Addon Not Loading in Stremio

**Check**:
- Is the manifest accessible? Visit the manifest URL in a browser
- Are there errors in the logs? Run `beamup logs`
- Is the service running? Check BeamUp panel at `https://baby-beamup.club`

#### 2. Changes Not Reflected After Deploy

**Solutions**:
- Wait 1-2 minutes for the service to restart
- Check logs to see if deployment succeeded
- Verify you pushed to the correct remote: `git remote -v`

#### 3. Environment Variables Not Working

**Check**:
- Startup logs show the environment configuration
- Use `beamup secrets` to re-set if needed
- Ensure `NODE_ENV=beamup` is set

#### 4. Cannot View Secrets on BeamUp

This is **by design** for security. BeamUp CLI does not support viewing existing secret values. You can only set/update them.

**Solution**: Document secrets locally or check startup logs to see resolved values.

### Testing the Deployment

1. **Test Manifest**:
   ```bash
   curl https://28aa7e9346ec-stremio-heb-enhancer-nir7.baby-beamup.club/manifest.json
   ```

2. **Test in Stremio**:
   - Open Stremio
   - Go to Addons
   - Click "Install from URL"
   - Enter: `https://28aa7e9346ec-stremio-heb-enhancer-nir7.baby-beamup.club/manifest.json`

3. **Check Logs**:
   ```bash
   echo stremio-heb-enhancer-nir7 | beamup logs
   ```

## Local vs Production Differences

### Local Development (`isProduction: false`)

- **Server**: HTTPS with local SSL certificates
- **Port**: Explicit port in URLs (`:8080`)
- **Hostname**: Auto-detected or `127.0.0.1`
- **Config File**: `config/default.json`

### Production on BeamUp (`isProduction: true`)

- **Server**: HTTP (SSL termination handled by BeamUp)
- **Port**: No port in URLs (handled by reverse proxy)
- **Hostname**: `https://28aa7e9346ec-stremio-heb-enhancer-nir7.baby-beamup.club`
- **Config File**: `config/beamup.json` (overrides default)

## Additional Resources

- **BeamUp Panel**: `https://baby-beamup.club`
- **GitHub Repository**: `https://github.com/nirdrang/wizdom-stremio-v2`
- **Production URL**: `https://28aa7e9346ec-stremio-heb-enhancer-nir7.baby-beamup.club`

## Quick Reference

### Essential Commands

```bash
# View git remotes
git remote -v

# Deploy workflow
git add .
git commit -m "message"
git push origin master                    # Backup to GitHub
git push --progress beamup HEAD:master    # Deploy to BeamUp

# View logs
echo stremio-heb-enhancer-nir7 | beamup logs

# Set a secret
beamup secrets SECRET_NAME SECRET_VALUE

# Test locally
npm start
```

### Important Files

- `/beamup.json` - BeamUp CLI config
- `/config/default.json` - Local development config
- `/config/beamup.json` - Production config
- `/config/custom-environment-variables.json` - Environment variable mapping
- `/index.js` - Main entry point with environment logging

---

**Last Updated**: January 2, 2026

