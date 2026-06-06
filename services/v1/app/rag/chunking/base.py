"""Base types for the chunking module."""
from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from typing import Protocol


@dataclass
class Chunk:
    """A single text chunk with metadata for embedding and retrieval."""

    content: str
    index: int = 0
    metadata: dict = field(default_factory=dict)
    token_count: int = 0
    char_count: int = 0
    hash: str = ""

    def __post_init__(self) -> None:
        self.char_count = len(self.content)
        if not self.hash:
            self.hash = hashlib.sha256(self.content.encode("utf-8")).hexdigest()

    def get_context_window(self, chunks: list[Chunk], window: int = 1) -> str:
        """
        Return this chunk plus `window` neighboring chunks for context expansion.

        Args:
            chunks: Full ordered list of chunks from the same document.
            window: Number of neighbors on each side to include.

        Returns:
            Concatenated text of this chunk and its neighbors.
        """
        start = max(0, self.index - window)
        end = min(len(chunks), self.index + window + 1)
        return "\n\n".join(c.content for c in chunks[start:end])


class ChunkerProtocol(Protocol):
    """Protocol that all chunking strategies must implement."""

    def chunk(self, text: str, metadata: dict | None = None) -> list[Chunk]:
        """Split text into chunks with metadata."""
        ...
