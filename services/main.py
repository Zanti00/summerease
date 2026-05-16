from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from v1.app.main import app as v1_app

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="SummerEase API Gateway",
    description="Main entry point for SummerEase services with versioning support",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this to specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount versioned apps
app.mount("/api/v1", v1_app)

@app.get("/", include_in_schema=False)
async def root_redirect():
    """Redirect root to latest API documentation"""
    return RedirectResponse(url="/api/v1/docs")

@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "API Gateway is running"}
