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

from app.routers import products, orders, media, auth, customers, live_price, banner
from app.database import Base, engine

# Ensure uploads directory exists
UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Background task handle
polling_task = None


async def start_polling():
    """Start the background polling task on app startup."""
    global polling_task
    try:
        polling_task = asyncio.create_task(live_price.poll_vijay_bullion())
        logger.info("Background polling task started successfully")
    except Exception as e:
        logger.error(f"Failed to start polling task: {e}")


async def stop_polling():
    """Stop the background polling task on app shutdown."""
    global polling_task
    if polling_task:
        polling_task.cancel()
        try:
            await polling_task
        except asyncio.CancelledError:
            logger.info("Polling task cancelled successfully")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan manager for startup and shutdown events."""
    # Startup
    Base.metadata.create_all(bind=engine)
    await start_polling()
    yield
    # Shutdown
    await stop_polling()


# Initialize FastAPI app with lifespan
app = FastAPI(
    title="SR Chains - Silver Jewelry ERP",
    description="B2B wholesale silver jewelry manufacturing platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration - Allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    expose_headers=["*"],
    allow_headers=["*"]
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