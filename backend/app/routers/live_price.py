from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from datetime import datetime, timezone, timedelta
import asyncio
import httpx
import logging
import random

router = APIRouter(prefix="/api/live-price", tags=["Live Price"])

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class LiveRateManager:
    """Manages live silver rates with thread-safe operations."""
    
    def __init__(self):
        self.silver_gram_rate = 222.00
        self.silver_kg_rate = 222000.00
        self.last_updated = datetime.now(timezone.utc)
        self.source = "Initial"
        
        # Pre-populate history with 12 hourly intervals leading up to now
        self.history = []
        base_time = self.last_updated
        for i in range(12, 0, -1):
            h_time = base_time - timedelta(hours=i)
            # Generate a small fluctuation
            fluctuation = random.uniform(-1.5, 1.5)
            self.history.append({
                "rate": round(self.silver_gram_rate + fluctuation, 2),
                "timestamp": h_time.isoformat()
            })

    def update_rates(self, gram: float, kg: float, source: str) -> None:
        """Update silver rates with rounding."""
        self.silver_gram_rate = round(gram, 2)
        self.silver_kg_rate = round(kg, 2)
        self.last_updated = datetime.now(timezone.utc)
        self.source = source
        
        # Add to history if rate changes or if last entry is older than 1 minute
        should_add = True
        if self.history:
            last_entry = self.history[-1]
            try:
                last_time = datetime.fromisoformat(last_entry["timestamp"])
                time_diff = (self.last_updated - last_time).total_seconds()
                if last_entry["rate"] == self.silver_gram_rate and time_diff < 60:
                    should_add = False
            except Exception:
                pass
                
        if should_add:
            self.history.append({
                "rate": self.silver_gram_rate,
                "timestamp": self.last_updated.isoformat()
            })
            if len(self.history) > 24:
                self.history.pop(0)

    def generate_mock_fluctuation(self) -> None:
        """Generate realistic mock price fluctuation for fallback."""
        fluctuation = random.uniform(-0.30, 0.30)
        new_gram = max(200.0, min(260.0, self.silver_gram_rate + fluctuation))
        self.update_rates(
            new_gram,
            new_gram * 1000,
            "Fallback (Offline)"
        )

    def to_dict(self):
        return {
            "silver_gram_rate": self.silver_gram_rate,
            "silver_kg_rate": self.silver_kg_rate,
            "last_updated": self.last_updated.isoformat(),
            "source": self.source,
            "history": self.history
        }


# Global instances
rate_manager = LiveRateManager()
connected_clients: list[WebSocket] = []


async def broadcast_price() -> None:
    """Broadcast current price to all connected WebSocket clients."""
    if not connected_clients:
        return

    data = rate_manager.to_dict()
    disconnected: list[WebSocket] = []

    for client in connected_clients:
        try:
            await client.send_json(data)
        except Exception as e:
            logger.warning(f"Failed to broadcast to client: {e}")
            disconnected.append(client)

    for client in disconnected:
        if client in connected_clients:
            connected_clients.remove(client)


async def poll_vijay_bullion() -> None:
    """
    Background task: Poll Vijay Bullion API every 5 seconds.
    Vijay Bullion API returns live rate or fallback.
    Broadcasts to all WebSocket clients and updates rate_manager.
    """
    urls = [
        "http://www.vijaybullion.com/index.php/C_rates/rate_data",
        "http://www.vijaybullion.com/index.php/C_booking/get_commodity_data",
    ]
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "*/*",
        "Referer": "http://www.vijaybullion.com/"
    }

    while True:
        fetched = False
        for url in urls:
            try:
                async with httpx.AsyncClient(timeout=8, follow_redirects=True) as client:
                    response = await client.get(url, headers=headers)

                if response.status_code == 200:
                    if "rate_data" in url:
                        # Parse tab-separated rates
                        content = response.text
                        lines = content.strip().split('\n')
                        silver_found = False
                        for line in lines:
                            if not line.strip():
                                continue
                            cols = line.split('\t')
                            if len(cols) >= 5:
                                row_type = cols[0].strip()
                                if row_type == '3':
                                    com_name = cols[2].replace('"', '').strip()
                                    if "SILVER" in com_name.upper():
                                        try:
                                            sell_rate = float(cols[4].strip())
                                            if sell_rate > 0:
                                                gram_rate = sell_rate / 1000.0
                                                kg_rate = sell_rate
                                                rate_manager.update_rates(
                                                    gram_rate,
                                                    kg_rate,
                                                    "Vijay Bullion Live"
                                                )
                                                silver_found = True
                                                fetched = True
                                                logger.info(f"✅ Vijay Bullion Live Spot Silver Rate: ₹{gram_rate:.2f}/g (₹{kg_rate:.2f}/kg)")
                                                await broadcast_price()
                                                break
                                        except ValueError:
                                            continue
                        if silver_found:
                            break
                    else:
                        # Fallback parsing as JSON for get_commodity_data
                        try:
                            data = response.json()
                        except Exception:
                            logger.warning("Vijay Bullion returned non-JSON response")
                            break

                        commodity_details = (
                            data.get("commodity", {}).get("commoditydetails")
                            or data.get("commoditydetails", [])
                        )

                        silver_found = False

                        for item in commodity_details:
                            com_name = str(item.get("com_name", "")).upper()

                            if "SILVER" in com_name:
                                sell_rate = float(item.get("sell_rate", 0) or 0)
                                com_weight = float(item.get("com_weight", 1000) or 1000)

                                if sell_rate > 0 and com_weight > 0:
                                    gram_rate = sell_rate / com_weight
                                    kg_rate = gram_rate * 1000

                                    rate_manager.update_rates(
                                        gram_rate,
                                        kg_rate,
                                        "Vijay Bullion Live"
                                    )

                                    silver_found = True
                                    fetched = True
                                    logger.info(f"✅ Vijay Bullion JSON Silver Rate: ₹{gram_rate:.2f}/g (sell_rate={sell_rate}, weight={com_weight}g)")
                                    await broadcast_price()
                                    break
                        if silver_found:
                            break
                else:
                    logger.warning(f"HTTP {response.status_code} from {url}")

            except httpx.ConnectError:
                logger.warning(f"Cannot connect to Vijay Bullion ({url})")
            except httpx.TimeoutException:
                logger.warning(f"Timeout fetching Vijay Bullion ({url})")
            except Exception as e:
                logger.error(f"Polling Error from {url}: {e}")

            if fetched:
                break

        if not fetched:
            # Fallback: realistic fluctuation around current rate
            rate_manager.generate_mock_fluctuation()
            logger.info(f"Using fallback rate: ₹{rate_manager.silver_gram_rate:.2f}/g")
            await broadcast_price()

        await asyncio.sleep(5)



@router.get(
    "",
    summary="Get current live silver rate",
    description="Returns the latest silver gram and kg rates"
)
async def get_live_price():
    """
    GET /api/live-price
    Returns the current live silver rate updated every 5 seconds.
    """
    return rate_manager.to_dict()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """
    WebSocket /api/live-price/ws
    Connects client and sends live price updates in real-time.
    Send any message to keep connection alive.
    """
    await websocket.accept()
    connected_clients.append(websocket)

    try:
        # Send initial rate immediately upon connection
        await websocket.send_json(rate_manager.to_dict())

        # Keep connection alive and listen for client messages
        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
        if websocket in connected_clients:
            connected_clients.remove(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        if websocket in connected_clients:
            connected_clients.remove(websocket)