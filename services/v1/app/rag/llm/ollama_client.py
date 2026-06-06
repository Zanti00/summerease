"""Async Ollama HTTP client for streaming LLM inference.

Uses httpx.AsyncClient to call Ollama's REST API at /api/chat with
stream=true, yielding individual token strings over NDJSON.

Designed for CPU-bound inference where responses take 15-40 seconds.
No heavy framework dependencies — just httpx (already in requirements.txt).
"""
from __future__ import annotations

import json
from typing import AsyncIterator

import httpx
import structlog

logger = structlog.get_logger()


class OllamaUnavailableError(Exception):
    """Raised when the Ollama server cannot be reached or the model is not loaded."""


class OllamaClient:
    """
    Lightweight async client for the Ollama REST API.

    Streams chat completions token-by-token over NDJSON.
    Manages its own httpx connection pool for TCP reuse.

    Args:
        base_url: Ollama server URL (e.g., http://localhost:11434).
        model: Model tag to use (e.g., llama3.2:3b).
        timeout: Per-request timeout in seconds. CPU inference needs 120s+.
    """

    def __init__(self, base_url: str, model: str, timeout: int = 120) -> None:
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._timeout = timeout
        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            timeout=httpx.Timeout(timeout, connect=10.0),
        )

    async def health_check(self) -> bool:
        """
        Verify Ollama is reachable and the target model is available.

        Calls GET /api/tags and checks the model list.
        Returns False (does not raise) on failure — caller decides how to handle.
        """
        try:
            resp = await self._client.get("/api/tags")
            resp.raise_for_status()
            models = resp.json().get("models", [])
            available_names = [m.get("name", "") for m in models]

            # Exact match first
            if self._model in available_names:
                return True

            # Partial match: "llama3.2:3b" should match "llama3.2:3b-instruct-q4_K_M"
            base_name = self._model.split(":")[0]
            if any(base_name in name for name in available_names):
                return True

            logger.warning(
                "ollama.model_not_found",
                requested_model=self._model,
                available_models=available_names,
            )
            return False
        except httpx.HTTPError as exc:
            logger.error("ollama.health_check_failed", error=str(exc))
            return False

    async def stream_chat(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.1,
        max_tokens: int = 512,
    ) -> AsyncIterator[str]:
        """
        Stream a chat completion from Ollama.

        Sends a POST to /api/chat with stream=true and iterates the NDJSON
        response line-by-line, yielding individual token strings.

        Args:
            messages: Chat messages array (system + user roles).
            temperature: Sampling temperature. 0.1 for deterministic policy Q&A.
            max_tokens: Maximum tokens to generate (num_predict in Ollama).

        Yields:
            Individual token strings as they are generated.

        Raises:
            OllamaUnavailableError: If the server is unreachable.
            httpx.HTTPStatusError: If Ollama returns a non-2xx status.
        """
        payload = {
            "model": self._model,
            "messages": messages,
            "stream": True,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
                "num_ctx": 4096,
            },
        }

        try:
            async with self._client.stream(
                "POST", "/api/chat", json=payload
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line.strip():
                        continue
                    try:
                        chunk = json.loads(line)
                    except json.JSONDecodeError:
                        logger.warning("ollama.malformed_chunk", raw=line[:200])
                        continue
                    token = chunk.get("message", {}).get("content", "")
                    if token:
                        yield token
                    if chunk.get("done", False):
                        return
        except httpx.ConnectError as exc:
            logger.error("ollama.connect_failed", error=str(exc))
            raise OllamaUnavailableError(
                "Ollama server is not reachable at "
                f"{self._base_url}. Ensure Ollama is running."
            ) from exc
        except httpx.HTTPStatusError as exc:
            logger.error(
                "ollama.http_error",
                status=exc.response.status_code,
                body=exc.response.text[:500],
            )
            raise

    async def stream_chat_with_tools(
        self,
        messages: list[dict[str, str]],
        tools: list[dict],
        temperature: float = 0.1,
        max_tokens: int = 2048,
    ) -> AsyncIterator[dict]:
        """
        Stream a chat completion from Ollama with tool support.

        Yields dictionaries with type 'token' or 'tool_call'.
        """
        payload = {
            "model": self._model,
            "messages": messages,
            "tools": tools,
            "stream": True,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
                "num_ctx": 4096,
            },
        }

        try:
            async with self._client.stream(
                "POST", "/api/chat", json=payload
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line.strip():
                        continue
                    try:
                        chunk = json.loads(line)
                    except json.JSONDecodeError:
                        logger.warning("ollama.malformed_chunk", raw=line[:200])
                        continue
                    
                    message = chunk.get("message", {})
                    
                    # Check for tool calls first
                    if "tool_calls" in message and message["tool_calls"]:
                        yield {"type": "tool_call", "tool_calls": message["tool_calls"]}
                    
                    # Yield any regular text tokens
                    token = message.get("content", "")
                    if token:
                        yield {"type": "token", "content": token}
                        
                    if chunk.get("done", False):
                        yield {"type": "done"}
                        return
        except httpx.ConnectError as exc:
            logger.error("ollama.connect_failed", error=str(exc))
            raise OllamaUnavailableError(
                "Ollama server is not reachable at "
                f"{self._base_url}. Ensure Ollama is running."
            ) from exc
        except httpx.HTTPStatusError as exc:
            logger.error(
                "ollama.http_error",
                status=exc.response.status_code,
                body=exc.response.text[:500],
            )
            raise

    async def close(self) -> None:
        """Close the underlying HTTP connection pool."""
        await self._client.aclose()
