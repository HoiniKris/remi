# Docker Setup Guide

## Quick Start

The backend requires PostgreSQL and Redis databases. The easiest way to run them is with Docker.

### Option 1: Using Docker (Recommended)

1. **Install Docker Desktop:**
   - Download: https://www.docker.com/products/docker-desktop/
   - Install and start Docker Desktop
   - Verify installation: `docker --version`

2. **Start the databases:**

   ```bash
   docker compose up -d
   ```

3. **Verify containers are running:**

   ```bash
   docker ps
   ```

   You should see:
   - `rummy-postgres` on port 5432
   - `rummy-redis` on port 6379

4. **Start the backend:**

   ```bash
   cd packages/backend
   npm run dev
   ```

5. **Check health:**
   Visit http://localhost:3000/health
   Should show: `"database": "connected"`

### Option 2: Without Docker (Manual Installation)

If you prefer not to use Docker:

**PostgreSQL:**

1. Download: https://www.postgresql.org/download/windows/
2. Install with these settings:
   - Port: 5432
   - Username: `user`
   - Password: `password`
   - Database name: `rummy_game`

**Redis:**

1. Download: https://github.com/microsoftarchive/redis/releases
2. Install and start Redis service on port 6379

**Configure Backend:**

```bash
cd packages/backend
cp .env.example .env
# Edit .env with your database credentials
```

### Option 3: Cloud Database (For Testing)

Use a free cloud PostgreSQL service:

- **Supabase**: https://supabase.com/ (Free tier)
- **ElephantSQL**: https://www.elephantsql.com/ (Free tier)

Update `packages/backend/.env` with your cloud database URL.

## Troubleshooting

### "ECONNREFUSED" Error

This means the database is not running. Solutions:

1. Start Docker: `docker compose up -d`
2. Check Docker is running: `docker ps`
3. Check logs: `docker compose logs`

### Backend Starts Without Database

The backend will start even if the database is not available, but database features will be disabled. You'll see:

```
⚠️  Database not available - starting without database
```

To enable database features, start Docker and restart the backend.

### Port Already in Use

If port 5432 or 6379 is already in use:

1. Stop other PostgreSQL/Redis instances
2. Or change ports in `docker-compose.yml`

## Docker Commands

```bash
# Start databases
docker compose up -d

# Stop databases
docker compose down

# View logs
docker compose logs

# Restart databases
docker compose restart

# Remove all data (fresh start)
docker compose down -v
```

## Current Status

The backend is configured to work **with or without** Docker:

- ✅ **With Docker**: Full functionality (recommended)
- ⚠️ **Without Docker**: Limited functionality (for Flutter development only)

You can develop the Flutter app without Docker, but you'll need it for:

- User authentication
- Game state persistence
- Tournaments
- Shop features
