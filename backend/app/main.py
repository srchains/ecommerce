from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import asyncio
import logging
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from app.routers import products, orders, media, auth, customers, live_price, banner, cards
from app.database import Base, engine

# Ensure uploads directory exists
UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(os.path.join(UPLOADS_DIR, "cards"), exist_ok=True)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Background task handle
polling_task = None


async def start_polling():
    """Start the background polling task on app startup."""
    global polling_task
    try:
        polling_task = asyncio.create_task(live_price.poll_metals_api())
        logger.info("Background metal price polling started successfully.")
    except Exception as e:
        logger.error(f"Failed to start metal price polling: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting SR Chains E-Commerce Backend...")
    # Create DB tables
    Base.metadata.create_all(bind=engine)
    # Start price polling loop
    await start_polling()
    yield
    # Shutdown
    if polling_task:
        polling_task.cancel()
        logger.info("Background metal price polling stopped.")
    logger.info("Shutting down backend service.")


# Initialize FastAPI app with lifespan
app = FastAPI(
    title="SR Chains E-Commerce API",
    description="Enterprise wholesale backend for SR Chains silver jewelry",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware Setup
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:80",
    "http://138.252.201.239",
    "https://srchains.com",
    "http://srchains.com",
    "https://www.srchains.com",
    "http://www.srchains.com",
    "https://srchains.ddns.net",
    "http://srchains.ddns.net",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Serve uploaded files as static assets
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# Include Routers
app.include_router(live_price.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(media.router)
app.include_router(auth.router)
app.include_router(customers.router)
app.include_router(banner.router)
app.include_router(cards.router)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "SR Chains Backend",
        "version": "1.0.0"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )   