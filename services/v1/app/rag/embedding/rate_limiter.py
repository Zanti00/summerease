import time
import asyncio

class EmbeddingRateLimiter:
    """Token bucket / request rate limiter supporting both requests-per-minute and requests-per-day constraints."""

    def __init__(self, requests_per_minute: int = 15, requests_per_day: int = 1500):
        self.requests_per_minute = requests_per_minute
        self.requests_per_day = requests_per_day
        self.request_count_min = 0
        self.request_count_day = 0
        self.window_start_min = time.monotonic()
        self.window_start_day = time.monotonic()

    async def acquire(self, token_count: int = 0) -> None:
        now = time.monotonic()
        
        # Reset minute window
        if now - self.window_start_min >= 60:
            self.request_count_min = 0
            self.window_start_min = now
            
        # Reset daily window
        if now - self.window_start_day >= 86400:
            self.request_count_day = 0
            self.window_start_day = now

        # Enforce rate limits
        if self.request_count_min >= self.requests_per_minute or self.request_count_day >= self.requests_per_day:
            # Backoff for minute window reset
            wait_time = max(0.1, 60 - (now - self.window_start_min))
            await asyncio.sleep(wait_time)
            
            # Reset minute stats
            self.request_count_min = 0
            self.window_start_min = time.monotonic()

        self.request_count_min += 1
        self.request_count_day += 1
