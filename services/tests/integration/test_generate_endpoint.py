"""Integration tests for the POST /api/v1/rag/generate endpoint.

Uses a mocked Ollama server to avoid requiring the actual LLM.
Tests SSE streaming, error handling, and authentication.

Usage:
    python tests/integration/test_generate_endpoint.py
"""
import asyncio
import json
import sys
import os
from unittest.mock import AsyncMock, patch, MagicMock

sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))


async def test_generate_endpoint_returns_sse_stream():
    """
    Verify the /generate endpoint returns a streaming response with correct
    media type and SSE event format when Ollama is mocked.
    """
    from httpx import AsyncClient, ASGITransport
    from main import app

    # Mock the auth dependency to bypass token validation
    mock_user = {"id": "test-user-uuid-001", "email": "test@example.com"}

    # Mock the Ollama client health check and streaming
    async def mock_stream_chat(*args, **kwargs):
        """Simulate Ollama yielding tokens."""
        for token in ["The ", "policy ", "states ", "that..."]:
            yield token

    with (
        patch("v1.app.auth.nexusauth_client.get_current_user", return_value=mock_user),
        patch("v1.app.rag.llm.ollama_client.OllamaClient.health_check", new_callable=AsyncMock, return_value=True),
        patch("v1.app.rag.llm.ollama_client.OllamaClient.stream_chat", side_effect=mock_stream_chat),
        patch("v1.app.rag.llm.ollama_client.OllamaClient.close", new_callable=AsyncMock),
        patch("v1.app.rag.query_engine.QueryEngine.search", new_callable=AsyncMock) as mock_search,
    ):
        # Mock the search response
        from v1.app.rag.schemas import SearchResponse
        mock_search.return_value = SearchResponse(
            query="test query",
            query_id="qry_test",
            total_results=1,
            retrieval_time_ms=10.0,
            matched_chunks=[
                {
                    "chunk_id": "chunk-001",
                    "document_id": "doc-001",
                    "document_title": "Policy.pdf",
                    "content": "The reimbursement limit is $500.",
                    "chunk_index": 0,
                    "token_count": 8,
                    "metadata": {},
                }
            ],
            scores=[
                {
                    "chunk_id": "chunk-001",
                    "vector_similarity": 0.92,
                    "keyword_score": 0.5,
                    "final_score": 0.93,
                }
            ],
            metadata={"search_strategy": "vector"},
        )

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/rag/generate",
                json={"query": "What is the reimbursement policy?"},
                headers={"Authorization": "Bearer mock-token"},
            )

            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            assert "text/event-stream" in response.headers.get("content-type", "")

            # Parse SSE events
            body = response.text
            events = [
                line.strip()
                for line in body.split("\n\n")
                if line.strip().startswith("data: ")
            ]

            assert len(events) > 0, "Should receive at least one SSE event"

            # Check last event is [DONE]
            last_event = events[-1]
            assert "[DONE]" in last_event, f"Last event should be [DONE], got: {last_event}"

            # Check token events parse correctly
            token_events = [e for e in events if "[DONE]" not in e]
            for event in token_events:
                payload = event.replace("data: ", "")
                parsed = json.loads(payload)
                assert "token" in parsed, f"Token event should have 'token' key: {parsed}"

            print(f"PASS: SSE stream — received {len(token_events)} token events + [DONE]")


async def test_generate_endpoint_ollama_unavailable():
    """Verify 503 is returned when Ollama health check fails."""
    from httpx import AsyncClient, ASGITransport
    from main import app

    mock_user = {"id": "test-user-uuid-001", "email": "test@example.com"}

    with (
        patch("v1.app.auth.nexusauth_client.get_current_user", return_value=mock_user),
        patch("v1.app.rag.llm.ollama_client.OllamaClient.health_check", new_callable=AsyncMock, return_value=False),
        patch("v1.app.rag.llm.ollama_client.OllamaClient.close", new_callable=AsyncMock),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/rag/generate",
                json={"query": "What is the policy?"},
                headers={"Authorization": "Bearer mock-token"},
            )

            assert response.status_code == 503, f"Expected 503, got {response.status_code}"
            body = response.json()
            assert "Ollama" in body.get("detail", ""), f"Error should mention Ollama: {body}"
            print("PASS: Ollama unavailable — 503 returned correctly")


async def test_generate_endpoint_invalid_query():
    """Verify 422 is returned for queries that are too short."""
    from httpx import AsyncClient, ASGITransport
    from main import app

    mock_user = {"id": "test-user-uuid-001", "email": "test@example.com"}

    with patch("v1.app.auth.nexusauth_client.get_current_user", return_value=mock_user):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/rag/generate",
                json={"query": "ab"},  # Too short (min_length=3)
                headers={"Authorization": "Bearer mock-token"},
            )

            assert response.status_code == 422, f"Expected 422, got {response.status_code}"
            print("PASS: Invalid query — 422 returned correctly")


async def run_all():
    """Run all endpoint integration tests sequentially."""
    print("=" * 60)
    print("Generate Endpoint Integration Tests (Mocked Ollama)")
    print("=" * 60)

    await test_generate_endpoint_returns_sse_stream()
    await test_generate_endpoint_ollama_unavailable()
    await test_generate_endpoint_invalid_query()

    print("\nAll generate endpoint tests PASSED!")


if __name__ == "__main__":
    asyncio.run(run_all())
