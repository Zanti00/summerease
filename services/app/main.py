from fastapi import FastAPI
from .auth.router import router as auth_router

app = FastAPI(
    title="SummerEase",
    description="A website for summarizing, interacting, and check plagiarism for uploaded documents",
    version="1.0.0"
)

app.include_router(auth_router)

@app.get("/", tags=["Health Check"])
async def root():
    from app.core.config import get_settings
    from app.auth.nexusauth_client import get_nexusauth_client
    import httpx
    
    # Manually clear caches to be absolutely sure
    get_settings.cache_clear()
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
