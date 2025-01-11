from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File
from PIL import Image
import torch
import io, os, json, zlib
from transformers import pipeline
from fastapi.middleware.cors import CORSMiddleware
import socket
import logging
from typing import Dict, Annotated
import redis.asyncio as redis

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - ModelServer - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Clean up resources on shutdown
pipe = None
device = None
redis_pool = None

# Update environment variables
REDIS_HOST = os.environ.get("REDIS_HOST", "localhost")
REDIS_PORT = os.environ.get("REDIS_PORT", "6379")
REDIS_PASSWORD = os.environ.get("REDIS_PASSWORD", "")
HOSTNAME = socket.gethostname()

@asynccontextmanager
async def lifespan(app: FastAPI):
    global device, redis_pool

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Using device: {device}")

    # Redis setup
    logger.info(f"Creating Redis connection pool: host={REDIS_HOST}, port={REDIS_PORT}")
    redis_pool = redis.ConnectionPool(
        host=REDIS_HOST,
        port=REDIS_PORT,
        password=REDIS_PASSWORD,
        db=0,
        decode_responses=True,
    )

    # Load model on startup
    global pipe
    pipe = pipeline("image-classification", model="dima806/facial_emotions_image_detection")
    yield
    
    logger.info("Model server initialization complete")

app = FastAPI(lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    try:
        redis_client = get_redis()
        redis_connected = await redis_client.ping()
    except Exception as e:
        logger.error(f"Redis health check failed: {str(e)}")
        redis_connected = False

    return {
        "status": "healthy",
        "hostname": HOSTNAME,
        "model": 'dima806/facial_emotions_image_detection',
        "device": str(device) if "device" in globals() else None,
        "redis": {
            "host": REDIS_HOST,
            "port": REDIS_PORT,
            "connected": redis_connected,
        }
    }

def get_redis():
    return redis.Redis(connection_pool=redis_pool)

async def write_to_cache(file: bytes, result: Dict[str, float]) -> None:
    cache = get_redis()
    hash = str(zlib.adler32(file))
    logger.debug(f"Writing prediction to cache with hash: {hash}")
    await cache.set(hash, json.dumps(result))
    logger.debug("Cache write complete")

async def check_cached(image: bytes):
    hash = zlib.adler32(image)
    cache = get_redis()

    logger.debug(f"Checking cache for image hash: {hash}")
    data = await cache.get(hash)

    if data:
        logger.info(f"Cache hit for image hash: {hash}")
    else:
        logger.info(f"Cache miss for image hash: {hash}")

    return json.loads(data) if data else None
    
@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    # Read image data
    image_data = await file.read()
    
    # Check cache first
    cached_result = await check_cached(image_data)
    if cached_result:
        return cached_result
    
    # If not in cache, process the image
    image = Image.open(io.BytesIO(image_data))
    results = pipe(images=image)
    
    # Format predictions
    predictions = []
    for result in results:
        predictions.append({
            "emotion": result["label"],
            "probability": f"{result['score']:.4f}"
        })
    
    output = {"predictions": predictions}
    
    # Write results to cache
    await write_to_cache(image_data, output)
    
    return output

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
