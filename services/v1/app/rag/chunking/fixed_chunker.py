"""Fixed-size text chunking strategy — alternative to recursive chunking."""
from __future__ import annotations

import structlog
import tiktoken

from .base import Chunk

logger = structlog.get_logger()


class FixedChunker:
    """
    Splits text into fixed-size token chunks with overlap.

    Best for uniform text like logs, transcripts, or simple documents
    where structural boundaries are not meaningful.
    """

    def __init__(self, max_tokens: int = 1024, overlap_tokens: int = 128) -> None:
        self.max_tokens = max_tokens
        self.overlap_tokens = overlap_tokens
        self._encoding = tiktoken.get_encoding("cl100k_base")

    def chunk(self, text: str, metadata: dict | None = None) -> list[Chunk]:
        """
        Split text into fixed-size overlapping chunks by token count.

        Args:
            text: Input text to chunk.
            metadata: Base metadata to attach to each chunk.

        Returns:
            Ordered list of Chunk objects.
        """
        base_metadata = metadata or {}
        tokens = self._encoding.encode(text)
        total_tokens = len(tokens)

        if total_tokens <= self.max_tokens:
            return [Chunk(
                content=text.strip(),
                index=0,
                metadata={**base_metadata, "chunk_strategy": "fixed", "overlap_tokens": 0},
                token_count=total_tokens,
            )]

        chunks: list[Chunk] = []
        step = self.max_tokens - self.overlap_tokens
        if step <= 0:
            step = self.max_tokens  # Fallback: no overlap if misconfigured

        for start in range(0, total_tokens, step):
            end = min(start + self.max_tokens, total_tokens)
            chunk_tokens = tokens[start:end]
            content = self._encoding.decode(chunk_tokens).strip()

            if not content:
                continue

            chunk_metadata = {
                **base_metadata,
                "chunk_strategy": "fixed",
                "overlap_tokens": self.overlap_tokens if start > 0 else 0,
            }

            chunks.append(Chunk(
                content=content,
                index=len(chunks),
                metadata=chunk_metadata,
                token_count=len(chunk_tokens),
            ))

            if end >= total_tokens:
                break

        logger.info(
            "rag.chunking.fixed.complete",
            input_tokens=total_tokens,
            total_chunks=len(chunks),
            max_tokens=self.max_tokens,
            overlap_tokens=self.overlap_tokens,
        )
        return chunks
