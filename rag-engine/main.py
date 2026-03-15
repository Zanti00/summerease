from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# NOTE: We intentionally import the real auth router from `auth/router.py`.
# The `routers/auth.py` file is a stub that returns fixed "success" responses.
from auth.router import router as auth_router

app = FastAPI()

origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
