from fastapi import FastAPI
from .auth.router import router as auth_router
from .documents.router import router as documents_router

app = FastAPI(
    title="SummerEase API v1",
    description="V1 API for SummerEase services",
    version="1.0.0",
    docs_url="/docs",
    openapi_url="/openapi.json"
)

app.include_router(auth_router)
app.include_router(documents_router)

@app.get("/", tags=["Health Check"])
async def root():
    from .core.config import get_settings
    from .auth.nexusauth_client import get_nexusauth_client
    import httpx
    
    # Safely clear caches if they exist
    if hasattr(get_settings, "cache_clear"):
        get_settings.cache_clear()
    if hasattr(get_nexusauth_client, "cache_clear"):
        get_nexusauth_client.cache_clear()
    
    settings = get_settings()
    client_wrapper = get_nexusauth_client()
    
    target_url = f"{client_wrapper.base_url}/auth/login"
    
    try:
        # Test direct connection using same base_url as the client
        async with httpx.AsyncClient() as test_client:
            resp = await test_client.get(client_wrapper.base_url, timeout=1.0)
            conn_status = f"Connected! Status: {resp.status_code}"
    except Exception as e:
        conn_status = f"Failed to connect: {str(e)}"
        
    return {
        "status": "ok", 
        "base_url_in_client": client_wrapper.base_url,
        "target_login_url": target_url,
        "connection_test": conn_status
    }
