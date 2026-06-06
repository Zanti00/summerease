"""Recursive text chunking strategy — the primary chunker for the RAG pipeline."""
from __future__ import annotations

import structlog
import tiktoken

from .base import Chunk

logger = structlog.get_logger()


class RecursiveChunker:
    """
    Recursively splits text at the most semantically meaningful boundary.

    Attempts separators in priority order: paragraphs -> lines -> sentences -> words.
    Uses tiktoken cl100k_base encoding for token counting (approximation for
    Google text-embedding-004).
    """

    SEPARATORS = ["\n\n", "\n", ". ", " "]

    def __init__(self, max_tokens: int = 1024, overlap_tokens: int = 128) -> None:
        self.max_tokens = max_tokens
        self.overlap_tokens = overlap_tokens
        self._encoding = tiktoken.get_encoding("cl100k_base")

    def chunk(self, text: str, metadata: dict | None = None) -> list[Chunk]:
        """
        Split text into overlapping chunks.

        Args:
            text: Input text to chunk.
            metadata: Base metadata to attach to each chunk.

        Returns:
            Ordered list of Chunk objects with overlap applied.
        """
        base_metadata = metadata or {}
        raw_chunks: list[str] = []
        self._split_recursive(text, self.SEPARATORS, raw_chunks)

        # Apply overlap and build Chunk objects
        chunks = self._apply_overlap(raw_chunks, base_metadata)

        logger.info(
            "rag.chunking.recursive.complete",
            input_tokens=self._token_count(text),
            total_chunks=len(chunks),
            max_tokens=self.max_tokens,
            overlap_tokens=self.overlap_tokens,
        )
        return chunks

    def _split_recursive(
        self, text: str, separators: list[str], result: list[str]
    ) -> None:
        """Recursively split text using progressively finer separators."""
        text = text.strip()
        if not text:
            return

        if self._token_count(text) <= self.max_tokens:
            result.append(text)
            return

        sep = separators[0] if separators else " "
        remaining_seps = separators[1:] if len(separators) > 1 else []
        parts = text.split(sep)

        current = ""
        for part in parts:
            candidate = f"{current}{sep}{part}" if current else part
            if self._token_count(candidate) > self.max_tokens:
                if current:
                    # Current accumulation fits — check if it itself needs splitting
                    if remaining_seps and self._token_count(current) > self.max_tokens:
                        self._split_recursive(current, remaining_seps, result)
                    else:
                        result.append(current.strip())
                current = part
            else:
                current = candidate

        if current and current.strip():
            if remaining_seps and self._token_count(current) > self.max_tokens:
                self._split_recursive(current, remaining_seps, result)
            else:
                result.append(current.strip())

    def _apply_overlap(self, raw_chunks: list[str], base_metadata: dict) -> list[Chunk]:
        """Apply token-level overlap between adjacent chunks."""
        chunks: list[Chunk] = []

        for i, content in enumerate(raw_chunks):
            if not content.strip():
                continue

            # Prepend overlap from previous chunk
            if i > 0 and self.overlap_tokens > 0:
                prev_tokens = self._encoding.encode(raw_chunks[i - 1])
                overlap_tokens = prev_tokens[-self.overlap_tokens:]
                overlap_text = self._encoding.decode(overlap_tokens)
                content = overlap_text + " " + content

            token_count = self._token_count(content)
            chunk_metadata = {
                **base_metadata,
                "chunk_strategy": "recursive",
                "overlap_tokens": self.overlap_tokens if i > 0 else 0,
            }

            chunks.append(Chunk(
                content=content.strip(),
                index=len(chunks),
                metadata=chunk_metadata,
                token_count=token_count,
            ))

        return chunks

    def _token_count(self, text: str) -> int:
        """Count tokens using tiktoken cl100k_base encoding."""
        return len(self._encoding.encode(text))
