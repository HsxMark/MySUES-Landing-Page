# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

三旋翼课程表 (SANXUANYI) - A full-stack web application for the 三旋翼课程表 campus-life assistant App (课程表查询/成绩查询/考试信息等). The site showcases the App and distributes its Android/iOS releases.

## Project Structure

```
.
├── frontend/          # Next.js 16 frontend
├── backend/           # FastAPI backend (app distribution only)
└── docker-compose.yml.example # Full stack deployment
```

## Commands

### Frontend (`frontend/` directory)

```bash
cd frontend

# Development
npm run dev          # Start dev server at http://localhost:3000

# Build & Production
npm run build        # Build for production (outputs standalone)
npm run start        # Run production server

# Lint
npm run lint         # Run ESLint
```

### Backend (`backend/` directory)

```bash
cd backend

# Setup (requires PostgreSQL)
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# Development
uvicorn app.main:app --reload --port 8000

# Endpoints
# API: http://localhost:8000
# Docs: http://localhost:8000/api/docs
```

### Docker (Full Stack)

```bash
# From project root
cp docker-compose.yml.example docker-compose.yml
docker-compose up --build

# Services:
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:8000
# - PostgreSQL: localhost:5432
```

## Architecture

### Frontend Tech Stack
- **Framework**: Next.js 16 (Pages Router, not App Router)
- **UI Library**: HeroUI v3 (beta) - component library built on React Aria
- **Styling**: Tailwind CSS v4 with custom CSS variables for theming
- **Animation**: Motion (Framer Motion) for scroll animations and transitions
- **Font**: IBM Plex Mono (loaded via next/font)

### Backend Tech Stack
- **Framework**: FastAPI + Uvicorn
- **Database**: PostgreSQL + SQLAlchemy 2.0 (async) + asyncpg
- **Authentication**: PyJWT (Bearer token)

### Frontend Key Patterns

**Pages Router**: Uses `pages/` directory routing, not App Router. Entry points:
- `src/pages/_app.tsx` - App wrapper with font configuration
- `src/pages/index.tsx` - 三旋翼课程表 landing page (hero, features, screenshots, download)
- `src/pages/admin.tsx` - Admin console (login + MySUES release management)

**CSS Variables for Theming**: Colors defined in `src/styles/globals.css` using OKLCH color space. Both light and dark themes are defined. Access via `var(--foreground)`, `var(--background)`, `var(--muted)`, etc.

**Path Alias**: `@/*` maps to `src/*` (configured in tsconfig.json)

**Standalone Build**: `next.config.ts` sets `output: 'standalone'` for Docker deployment

**API Rewrite**: `next.config.ts` proxies `/api/:path*` to `BACKEND_URL` (default `http://localhost:8000`)

### Backend Key Patterns

**API Structure**:
- `app/main.py` - FastAPI entry, CORS, route registration
- `app/config.py` - pydantic-settings configuration
- `app/database.py` - async SQLAlchemy engine/session
- `app/dependencies.py` - JWT auth dependency

**Modular Organization**:
- `app/models/` - SQLAlchemy ORM models (App, AppVersion, AppInstallation)
- `app/schemas/` - Pydantic request/response schemas
- `app/routers/` - API route handlers (auth, apps)
- `app/services/` - Business logic (app download LRU disk cache)

### Component Structure (Frontend)

```
frontend/src/components/
├── page-nav-bar.tsx    # Sticky nav with scroll spy
└── switch-theme-button.tsx  # Light/dark theme toggle (localStorage)
```

## Backend API Reference

### Public Endpoints
```
GET  /api/apps                              List all apps
GET  /api/apps/by-slug/{slug}               Get app detail by slug
GET  /api/apps/by-slug/{slug}/release       Get latest release per platform
POST /api/apps/by-slug/{slug}/startup       Record app startup/installation
GET  /api/apps/{app_id}                     Get app detail
GET  /api/apps/{app_id}/versions            List versions
GET  /api/apps/{app_id}/versions/{id}/download/{filename}  Streamed download
GET  /health                                Health check
GET  /api/docs                              Swagger UI
```

### Authenticated Endpoints (Bearer Token)
```
POST   /api/auth/login              Login → JWT token
GET    /api/apps/by-slug/{slug}/metrics   Install/active metrics
POST   /api/apps                   Create app
PUT    /api/apps/{app_id}          Update app
DELETE /api/apps/{app_id}          Delete app
POST   /api/apps/{app_id}/versions Create version
DELETE /api/apps/{app_id}/versions/{version_id}  Delete version
```

## Environment Variables

### Backend (`backend/.env`)
| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql+asyncpg://...` | PostgreSQL connection |
| `ADMIN_USERNAME` | `admin` | Login username |
| `ADMIN_PASSWORD` | `change-this-password` | Login password |
| `JWT_SECRET` | `change-this-secret-key` | JWT signing key |
| `JWT_EXPIRE_HOURS` | `24` | Token expiration |
| `APP_FILE_CACHE_DIR` | `/tmp/sanxuanyi-app-cache` | APK download cache dir |
| `APP_FILE_CACHE_MAX_SIZE_MB` | `1024` | Download cache size (MB) |

### Frontend
| Variable | Default | Description |
|----------|---------|-------------|
| `BACKEND_URL` | `http://localhost:8000` | Backend API base for `/api` rewrite |

## Notes

- HeroUI v3 is in beta - refer to https://v3.heroui.com for component docs
- ESLint config includes prettier and unused-imports plugins
- TypeScript strict mode is enabled (frontend)
- The App itself is an external Flutter project at https://github.com/HsxMark/MySUES
- App images/screenshots live in `frontend/public/image/mysues/`
