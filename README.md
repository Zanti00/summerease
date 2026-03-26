# SummerEase

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11+-blue)](https://www.python.org/)
[![Node](https://img.shields.io/badge/node-20+-green)](https://nodejs.org/)

## 1. Project Title & Description

**SummerEase** is an AI-powered document summarization and plagiarism-checking platform with a polished web UI and a served backend API layer.

Problem solved:

- Teams need fast extraction of key points from large documents.
- Developers need an integrated pipeline for upload, processing, and report delivery.

Value proposition:

- Automatically generate high-quality summaries + plagiarism evidence in one workflow.
- Fast API endpoint, secure storage, extensible architecture.

## 2. Tech Stack

- **FastAPI** (Python) for high-performance ASGI backend and auto-generated API docs.
- **Uvicorn** for production-grade async server.
- **Next.js** for modern SSR/SPA frontend (`frontend/`).
- **Python 3.11+**, **Node 20+**.
- **PostgreSQL** (recommended) via SQLAlchemy/Alembic migrations in `services`.
- **JWT** / OAuth compatible auth patterns.
- **Redis** (optional) for caching summary and plagiarism results.
- **Docker** for containerized deployment (not in repo yet but recommended).

## 3. Features

- Document upload endpoint (PDF/DOCX/TXT)
- AI summarization pipeline (LLM integration placeholder)
- Plagiarism check module (external API hooks)
- Health check endpoint (`/`)
- Fast development reload and API docs at `/docs`.
- Advanced: caching, rate limiter, structured logging.

## 4. System Architecture

Monolith with clearly separated frontend + backend packages:

- `frontend/` - Next.js React UI
- `services/` - FastAPI backend, migrations, Python models

Flow:

1. Client -> Next.js API/routes
2. Next.js frontend -> FastAPI in `services` for endpoints
3. FastAPI -> DB via SQLAlchemy -> PostgreSQL
4. Optional cache layer (Redis) for repeat summary workloads

Patterns:

- Dependency injection via FastAPI `Depends`
- Repository/service pattern possible in `services/app` modules
- `alembic` for data migration strategy

## 5. Installation & Setup

### Prerequisites

- Node 20+
- Python 3.11+
- pnpm or npm
- PostgreSQL 15+ (or your choice)
- (optional) Redis

### Setup

```bash
cd c:\Projects\summerease
# frontend
cd frontend
pnpm install

# backend
cd ..\services
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
```

### .env example

Create `.env` in `services`:

```ini
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/summerease
SECRET_KEY=ChangeMe_To_Secure_Value
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REDIS_URL=redis://localhost:6379/0
```

### Database and Migrations

```bash
cd services
.venv\Scripts\Activate.ps1
alembic upgrade head
```

If this repo has Alembic models in `services/alembic/`.

## 6. Usage

### Development server

Backend:

```bash
cd services
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```bash
cd frontend
pnpm dev
```

### Production

Build frontend:

```bash
cd frontend
pnpm build
pnpm start
```

Run backend (production workers):

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Base URLs

- API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`
- Frontend: `http://localhost:3000`

### Example request

```bash
curl -X GET "http://localhost:8000/" -H "Accept: application/json"
```

## 7. Project Structure

- `frontend/` - Next.js app (UI, components, page routes)
- `services/app` - FastAPI app module entrypoint (`main.py`)
- `services/alembic` - migrations
- `services/requirements.txt` - Python dependencies
- `package.json` - root workspace config
- `pnpm-workspace.yaml` - monorepo package layout

## 8. API Documentation

Main endpoints in FastAPI:

- `GET /` — health check
- `GET /docs` — OpenAPI UI
- `POST /upload` — document upload / summary trigger (planned)
- `POST /plagiarism` — check contents for plagiarism (planned)

### Example response

```json
{
  "status": "ok",
  "message": "Service is running"
}
```

## 9. Authentication & Security

- Use JWT for token authentication and refresh-cycle.
- `Authorization: Bearer <token>` header on protected endpoints.
- Secure config via `.env`, not committed.
- Enforce HTTPS in production and set `Secure` cookie flags.

## 10. Performance & Scalability

- Redis cache for summary results + rate limits.
- DB tuning: use connection pool and indexes via migrations.
- Run as multiple Uvicorn workers behind a reverse proxy (NGINX) for horizontal scaling.
- Offload heavy compute to async tasks/worker queue (Celery/RQ) if necessary.

## 11. Testing

- Use `pytest` under `services` and `frontend` if appropriate.
- Start test env with `pytest -q` from each package.

```bash
cd services
.venv\Scripts\Activate.ps1
pytest -q
```

## 12. Deployment

Strategy

- Build Docker images for each service.
- Apply CI pipeline with GitHub Actions/Bitbucket Pipelines.
- Deploy to AWS ECS/Fargate, Azure App Service, or GCP Cloud Run.

Sample Docker env config:

- `ENV=production`
- `DATABASE_URL`
- `SECRET_KEY`
- `REDIS_URL`

## 13. Contributing

1. Fork repo, create branch `feature/<name>`.
2. Add tests for new behavior.
3. Open PR with link to issue.
4. Follow commit style and lint with `pnpm lint`/`flake8`.

## 14. License

MIT License - see `LICENSE`

---

## Optional ASCII Diagram

```
[Browser] -> [Next.js Frontend] -> [FastAPI Backend] -> [Postgres]
                                 \-> [Redis Cache]
                                 \-> [External AI/Plagiarism API]
```
