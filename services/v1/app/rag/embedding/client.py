import asyncio
import logging
from typing import List
import google.generativeai as genai
from .rate_limiter import EmbeddingRateLimiter

logger = logging.getLogger("summerease.rag.embedding_client")

class EmbeddingClient:
    """Embedding generation client utilising the google-generativeai SDK."""

    def __init__(self, api_key: str, model: str, rate_limiter: EmbeddingRateLimiter, dimensions: int = 768):
        self.api_key = api_key
        # Standardise model name format for google-generativeai
        self.model = model if model.startswith("models/") else f"models/{model}"
        self.rate_limiter = rate_limiter
        self.dimensions = dimensions
        
        # Configure API key
        genai.configure(api_key=self.api_key)

    async def embed_single(self, text: str) -> List[float]:
        """Generate embedding vector for a query string."""
        if not text:
            return []
            
        await self.rate_limiter.acquire()

        def _call():
            result = genai.embed_content(
                model=self.model,
                content=text,
                task_type="retrieval_query",
                output_dimensionality=self.dimensions
            )
            return result["embedding"]

        try:
            return await asyncio.to_thread(_call)
        except Exception as e:
            logger.error(f"Failed to generate single embedding: {e}")
            raise e

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embedding vectors for a list of document passages."""
        if not texts:
            return []
            
        await self.rate_limiter.acquire()

        def _call():
            result = genai.embed_content(
                model=self.model,
                content=texts,
                task_type="retrieval_document",
                output_dimensionality=self.dimensions
            )
            return result["embedding"]

        try:
            return await asyncio.to_thread(_call)
        except Exception as e:
            logger.error(f"Failed to generate batch embeddings: {e}")
            raise e
