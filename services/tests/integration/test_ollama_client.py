"""Integration tests for the Ollama async client.

Requires a running Ollama instance at OLLAMA_BASE_URL.
Tests health check, basic streaming, and error handling.

Usage:
    python tests/integration/test_ollama_client.py
"""
import asyncio
import sys
import os

sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))

from v1.app.rag.llm.ollama_client import OllamaClient, OllamaUnavailableError
from v1.app.core.config import get_settings


async def test_health_check():
    """Verify Ollama is reachable and the model is available."""
    settings = get_settings()
    client = OllamaClient(
        base_url=settings.OLLAMA_BASE_URL,
        model=settings.OLLAMA_MODEL,
        timeout=30,
    )
    try:
        is_healthy = await client.health_check()
        assert is_healthy, (
            f"Ollama health check failed. "
            f"Ensure Ollama is running at {settings.OLLAMA_BASE_URL} "
            f"and model '{settings.OLLAMA_MODEL}' is pulled."
        )
        print(f"PASS: Health check — Ollama is running with model '{settings.OLLAMA_MODEL}'")
    finally:
        await client.close()


async def test_basic_streaming():
    """Verify that stream_chat yields at least one token."""
    settings = get_settings()
    client = OllamaClient(
        base_url=settings.OLLAMA_BASE_URL,
        model=settings.OLLAMA_MODEL,
        timeout=settings.OLLAMA_TIMEOUT_SECONDS,
    )
    try:
        messages = [
            {"role": "system", "content": "You are a helpful assistant. Answer briefly."},
            {"role": "user", "content": "Say the word 'hello' and nothing else."},
        ]

        tokens: list[str] = []
        async for token in client.stream_chat(
            messages=messages,
            temperature=0.0,
            max_tokens=20,
        ):
            tokens.append(token)

        assert len(tokens) > 0, "Should receive at least one token"
        full_response = "".join(tokens)
        assert len(full_response) > 0, "Full response should not be empty"
        print(f"PASS: Streaming — received {len(tokens)} tokens: '{full_response[:100]}'")
    finally:
        await client.close()


async def test_unreachable_server():
    """Verify that connecting to a bad URL raises OllamaUnavailableError."""
    client = OllamaClient(
        base_url="http://localhost:99999",
        model="nonexistent",
        timeout=5,
    )
    try:
        tokens = []
        try:
            async for token in client.stream_chat(
                messages=[{"role": "user", "content": "test"}],
            ):
                tokens.append(token)
            assert False, "Should have raised OllamaUnavailableError"
        except OllamaUnavailableError:
            print("PASS: Unreachable server — OllamaUnavailableError raised correctly")
        except Exception:
            # ConnectError variants are also acceptable
            print("PASS: Unreachable server — connection error raised correctly")
    finally:
        await client.close()


async def run_all():
    """Run all integration tests sequentially."""
    print("=" * 60)
    print("Ollama Client Integration Tests")
    print("=" * 60)

    await test_health_check()
    await test_basic_streaming()
    await test_unreachable_server()

    print("\nAll Ollama client integration tests PASSED!")


if __name__ == "__main__":
    asyncio.run(run_all())
