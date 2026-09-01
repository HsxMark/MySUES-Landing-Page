# 三旋翼课程表 Backend

三旋翼课程表 (SANXUANYI) 官网的 FastAPI 后端，提供 App 版本/发布信息与下载分发 API，以及管理认证。

## Tech Stack

- FastAPI + Uvicorn
- SQLAlchemy 2.0 (async) + asyncpg
- PostgreSQL
- PyJWT (authentication)

## Quick Start

### Docker Compose (recommended)

```bash
# From project root
docker-compose up --build

# API: http://localhost:8000
# API docs: http://localhost:8000/api/docs
```

### Local Development

```bash
# Prerequisites: PostgreSQL running

# Setup
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # edit as needed

# Create database
psql -U postgres -c "CREATE DATABASE sanxuanyi;"

# Run
uvicorn app.main:app --reload --port 8000
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql+asyncpg://postgres:postgres@localhost:5432/sanxuanyi` | PostgreSQL connection |
| `ADMIN_USERNAME` | `admin` | Login username |
| `ADMIN_PASSWORD` | `change-this-password` | Login password |
| `JWT_SECRET` | `change-this-secret-key` | JWT signing key |
| `JWT_EXPIRE_HOURS` | `24` | Token expiration |
| `APP_FILE_CACHE_DIR` | `/tmp/sanxuanyi-app-cache` | Server-side download cache dir |
| `APP_FILE_CACHE_MAX_SIZE_MB` | `1024` | Download cache size (MB) |

## API Endpoints

### Public

```
GET  /api/apps                                  List all apps
GET  /api/apps/by-slug/{slug}                   Get app detail by slug
GET  /api/apps/by-slug/{slug}/release           Get latest release per platform
POST /api/apps/by-slug/{slug}/startup           Record app startup/installation
GET  /api/apps/{app_id}                         Get app detail
GET  /api/apps/{app_id}/versions                List versions
GET  /api/apps/{app_id}/versions/{id}/download/{filename}   Streamed download
GET  /health                                    Health check
GET  /api/docs                                  Swagger UI
GET  /api/redoc                                 ReDoc
```

### Authenticated (Bearer Token)

```
POST   /api/auth/login                          Login → JWT token
GET    /api/apps/by-slug/{slug}/metrics         Install/active metrics
POST   /api/apps                                Create app
PUT    /api/apps/{app_id}                       Update app
DELETE /api/apps/{app_id}                       Delete app
POST   /api/apps/{app_id}/versions              Create version
DELETE /api/apps/{app_id}/versions/{id}         Delete version
```

## Project Structure

```
app/
├── main.py              # FastAPI entry, CORS, routes
├── config.py            # pydantic-settings config
├── database.py          # async SQLAlchemy engine/session
├── dependencies.py      # JWT auth dependency
├── models/              # SQLAlchemy models (App, AppVersion, AppInstallation)
├── schemas/             # Pydantic request/response schemas
├── routers/             # API route handlers (auth, apps)
└── services/            # App download disk cache
```
