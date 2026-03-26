from fastapi import FastAPI

app = FastAPI(
    title="SummerEase",
    description="A website for summarizing, interacting, and check plagiarism for uploaded documents",
    version="1.0.0"
)

@app.get("/", tags=["Health Check"])
async def root():
    return {"status": "ok", "message": "Service is running"}
