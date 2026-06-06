"""RAG generation service — orchestrates retrieval + LLM streaming.

Implements the full RAG chain:
    User Query → Vector Retrieval → Prompt Assembly → Ollama Streaming

This service composes the existing QueryEngine (for retrieval) with the
OllamaClient (for generation), bridging the two via the prompt_builder.
"""
from __future__ import annotations

from typing import AsyncIterator

import structlog

from v1.app.core.config import get_settings
from v1.app.rag.query_engine import QueryEngine
from v1.app.rag.schemas import SearchRequest
from .ollama_client import OllamaClient
from v1.app.rag.llm.tool_prompt_builder import build_tool_prompt_messages
from v1.app.rag.llm.tool_definitions import AVAILABLE_TOOLS
from v1.app.rag.llm.tool_executor import process_tool_call

logger = structlog.get_logger()


class GenerationService:
    """
    Full RAG generation pipeline.

    Chain: User Query → Vector Retrieval → Prompt Assembly → Ollama Streaming.

    Args:
        query_engine: Existing QueryEngine for vector/keyword search.
        ollama_client: Async Ollama HTTP client for LLM inference.
    """

    def __init__(
        self, query_engine: QueryEngine, ollama_client: OllamaClient
    ) -> None:
        self._query_engine = query_engine
        self._ollama_client = ollama_client
        self._settings = get_settings()

    async def generate_stream(
        self,
        query: str,
        user_id: str,
        document_ids: list[str] | None = None,
    ) -> AsyncIterator[str]:
        """
        Execute the full RAG pipeline and yield tokens as they are generated.

        Steps:
            1. Retrieve relevant chunks via QueryEngine (existing pipeline).
            2. Build the grounded prompt with context passages.
            3. Stream tokens from Ollama.

        Args:
            query: User's natural language question.
            user_id: Authenticated user ID for tenant isolation.
            document_ids: Optional scope to specific documents.

        Yields:
            Individual token strings from the LLM.
        """
        # Step 1: Retrieve relevant chunks
        search_request = SearchRequest(
            query=query,
            top_k=self._settings.LLM_TOP_K_CHUNKS,
            similarity_threshold=self._settings.RAG_SIMILARITY_THRESHOLD,
            document_ids=document_ids,
        )
        search_response = await self._query_engine.search(
            search_request, user_id
        )

        logger.info(
            "rag.generate.retrieval_complete",
            query=query[:100],
            chunks_retrieved=search_response.total_results,
            retrieval_time_ms=round(search_response.retrieval_time_ms, 1),
        )

        # Step 2: Build grounded prompt
        messages = build_prompt_messages(
            query=query,
            chunks=search_response.matched_chunks,
            max_context_tokens=self._settings.LLM_MAX_CONTEXT_TOKENS,
        )

        # Step 3: Stream from Ollama
        async for token in self._ollama_client.stream_chat(
            messages=messages,
            temperature=self._settings.LLM_TEMPERATURE,
            max_tokens=self._settings.LLM_MAX_OUTPUT_TOKENS,
        ):
            yield token

    async def generate_with_tools_stream(
        self,
        query: str,
        document_html: str,
    ) -> AsyncIterator[dict]:
        """
        Execute generation with tools and document HTML context.
        """
        messages = build_tool_prompt_messages(
            query=query,
            document_html=document_html,
            max_context_tokens=self._settings.LLM_TOOL_MAX_INPUT_TOKENS,
        )

        async for event in self._ollama_client.stream_chat_with_tools(
            messages=messages,
            tools=AVAILABLE_TOOLS,
            temperature=0.1,
            max_tokens=self._settings.LLM_TOOL_MAX_OUTPUT_TOKENS,
        ):
            if event["type"] == "tool_call":
                for tool_call in event["tool_calls"]:
                    result = process_tool_call(tool_call)
                    if result:
                        yield result
            else:
                yield event
