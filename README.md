# SummerEase

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11+-blue)](https://www.python.org/)
[![Node](https://img.shields.io/badge/node-20+-green)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-ready-blue)](https://www.docker.com/)

**SummerEase** is an AI-powered document summarization and plagiarism-checking platform with a polished Next.js web UI and a high-performance FastAPI backend. It utilizes Retrieval-Augmented Generation (RAG) powered by Google Gemini (with an Agnes AI fallback) and local Ollama models.

This guide is written from the ground up to help you set up the entire project, whether you are running it natively on your machine or through Docker.

---

## 1. Prerequisites

Before you start, ensure you have the following installed on your system:

- **Git**: To clone the repositories.
- **Node.js (v20+)**: Required for the frontend.
- **pnpm**: Fast package manager for Node.js (`npm install -g pnpm`).
- **Python (3.11+)**: Required for the backend services.
- **Docker Desktop / Engine**: Required if you plan to use Docker to spin up the databases, workers, and API services easily.

---

## 2. Cloning the Repositories

Because SummerEase relies on **NexusAuth** for authentication, you will need to clone both repositories side-by-side. Your directory structure should look like this:

```
Projects/
├── NexusAuth/
└── summerease/
```

**Commands to clone:**
```bash
cd c:\Projects
git clone <URL_TO_NEXUSAUTH_REPO> NexusAuth
git clone <URL_TO_SUMMEREASE_REPO> summerease
cd summerease
```

*(Note: If you already have the directories as shown above, you can skip cloning.)*

---

## 3. Environment Variables Setup

SummerEase requires several `.env` files to configure API keys, databases, and LLMs. Example files are provided in the repository.

You will need to create three environment files based on their examples:

### A. Root Directory (`summerease/.env`)
This is primarily used by Docker Compose.
```bash
# Copy the example file
cp .env.example .env
```
Edit `summerease/.env` and add your Google API key:
```ini
GOOGLE_API_KEY=your-google-api-key
```

### B. Backend Services (`summerease/services/.env`)
This configures the FastAPI backend, RAG pipeline, and LLMs.
```bash
# Copy the example file
cp services/.env.example services/.env
```
Edit `services/.env` and fill in your details (Supabase, Google GenAI, Agnes AI fallback):
```ini
DATABASE_URL=postgresql+asyncpg://postgres:admin@localhost:5433/summerease
REDIS_URL=redis://localhost:6380
SECRET_KEY=ChangeMe_To_Secure_Value
ENVIRONMENT=development
NEXUSAUTH_BASE_URL=http://127.0.0.1:3001
NEXUSAUTH_API_KEY=dummy_key

SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_KEY=your-supabase-service-role-key

# RAG & LLM Configurations
GOOGLE_API_KEY=your-google-api-key
EMBEDDING_MODEL=gemini-embedding-2
# ... (Leave the rest of the RAG defaults as they are unless you need to change them)

# Agnes AI Fallback Configuration (Optional)
SAPIENS_API_KEY=your-agnes-api-key-here
SAPIENS_BASE_URL=https://apihub.agnes-ai.com/v1
SAPIENS_MODEL=agnes-2.0-flash
```

### C. Frontend App (`summerease/frontend/.env.local`)
This configures the Next.js web application.
```bash
# Copy the example file
cp frontend/.env.local.example frontend/.env.local
```
Edit `frontend/.env.local`:
```ini
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_AUTH_API=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### D. NexusAuth
Don't forget to configure the environment variables in `../NexusAuth/.env` if you haven't already!

---

## 4. Method A: Full Docker Setup (Recommended)

The easiest way to get the entire stack (Database, Redis, ClamAV, Ollama, NexusAuth, FastAPI backend, and Background Workers) running is by using Docker Compose.

```bash
cd c:\Projects\summerease

# Build and start all containers in detached mode
docker-compose up -d --build
```

**Wait a few moments** for the database to initialize and services to start. You can check the logs to ensure everything is running smoothly:
```bash
docker-compose logs -f
```

*(Note: The frontend is not containerized in `docker-compose.yml` by default, so you will run the Next.js app locally. See **Step 6**.)*

---

## 5. Method B: Local Setup (Without Docker)

If you prefer to run the Python backend and services locally without Docker, follow these steps.

### Start Required Infrastructure
You will still need PostgreSQL, Redis, and optionally ClamAV & Ollama. You can run just the infrastructure via Docker:
```bash
docker-compose up -d db redis clamav ollama
```

### Backend Setup (FastAPI)
```bash
cd c:\Projects\summerease\services

# Create and activate a Python virtual environment
python -m venv .venv
.venv\Scripts\Activate.ps1   # On Windows PowerShell
# source .venv/bin/activate  # On Mac/Linux

# Upgrade pip and install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Run Database Migrations (if applicable)
alembic upgrade head

# Start the FastAPI Development Server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Background Workers
If you are running the backend locally, you also need to start the Redis Queue (RQ) workers in separate terminal windows (with the virtual environment activated):
```bash
# Terminal 2
cd services
.venv\Scripts\Activate.ps1
rq worker documents_autosave --url redis://localhost:6380

# Terminal 3
cd services
.venv\Scripts\Activate.ps1
rq worker rag_processing --url redis://localhost:6380
```

---

## 6. Frontend Setup (Next.js)

Whether you used Method A (Docker) or Method B (Local) for the backend, you will run the frontend the same way.

Open a new terminal:
```bash
cd c:\Projects\summerease\frontend

# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

---

## 7. Accessing the Application

Once everything is up and running, you can access the different components of the application at the following URLs:

- **Web Application (Frontend)**: [http://localhost:3000](http://localhost:3000)
- **SummerEase API (Backend)**: [http://localhost:8000](http://localhost:8000)
- **SummerEase API Docs (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **NexusAuth Auth API**: [http://localhost:3001](http://localhost:3001)

---

## 8. Troubleshooting

- **Database Connection Issues**: Ensure the credentials in `services/.env` match the `POSTGRES_USER` and `POSTGRES_PASSWORD` defined in `docker-compose.yml` (`postgres` / `admin`).
- **Gemini Fallback/Agnes AI**: If Gemini quota is exhausted, generation will gracefully fallback to Agnes AI as long as `SAPIENS_API_KEY` is provided in `services/.env`.
- **ClamAV Healthcheck**: ClamAV takes a bit of time to start up and download virus definitions. Wait about 1-2 minutes for it to become healthy.
- **Missing `openai` module**: Ensure you've run `pip install -r requirements.txt` again, as dependencies are occasionally updated.

## 9. License

MIT License - see `LICENSE`
