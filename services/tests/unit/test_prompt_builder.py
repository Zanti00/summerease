"""Unit tests for the RAG prompt builder.

Tests prompt construction, context truncation, and edge cases.
No external dependencies required — runs offline.
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))

from v1.app.rag.schemas import RetrievedChunk
from v1.app.rag.llm.prompt_builder import build_prompt_messages, SYSTEM_PROMPT


def _make_chunk(
    content: str,
    title: str = "TestDoc.pdf",
    chunk_id: str = "chunk-001",
    document_id: str = "doc-001",
    chunk_index: int = 0,
    token_count: int = 10,
) -> RetrievedChunk:
    """Helper to create a RetrievedChunk for testing."""
    return RetrievedChunk(
        chunk_id=chunk_id,
        document_id=document_id,
        document_title=title,
        content=content,
        chunk_index=chunk_index,
        token_count=token_count,
        metadata={},
    )


def test_basic_prompt_construction():
    """Prompt should contain system message with context and user query."""
    chunks = [
        _make_chunk("The reimbursement limit is $500 per semester.", title="Policy.pdf"),
    ]
    messages = build_prompt_messages("What is the reimbursement limit?", chunks)

    assert len(messages) == 2, "Should produce system + user messages"
    assert messages[0]["role"] == "system"
    assert messages[1]["role"] == "user"
    assert messages[1]["content"] == "What is the reimbursement limit?"

    # System message should contain the passage
    sys_content = messages[0]["content"]
    assert "reimbursement limit is $500" in sys_content
    assert "Policy.pdf" in sys_content
    assert "Passage 1" in sys_content


def test_multiple_chunks_ordering():
    """Chunks should appear in order with correct passage numbering."""
    chunks = [
        _make_chunk("First passage content.", title="DocA.pdf", chunk_id="c1"),
        _make_chunk("Second passage content.", title="DocB.pdf", chunk_id="c2"),
        _make_chunk("Third passage content.", title="DocC.pdf", chunk_id="c3"),
    ]
    messages = build_prompt_messages("test query", chunks)
    sys_content = messages[0]["content"]

    assert "Passage 1" in sys_content
    assert "Passage 2" in sys_content
    assert "Passage 3" in sys_content
    assert sys_content.index("Passage 1") < sys_content.index("Passage 2")
    assert sys_content.index("Passage 2") < sys_content.index("Passage 3")


def test_context_truncation():
    """When chunks exceed the token budget, later chunks should be dropped."""
    # Create chunks with substantial content
    long_text = "word " * 500  # ~500 tokens
    chunks = [
        _make_chunk(long_text, title="Big1.pdf", chunk_id="c1"),
        _make_chunk(long_text, title="Big2.pdf", chunk_id="c2"),
        _make_chunk(long_text, title="Big3.pdf", chunk_id="c3"),
    ]
    # Budget of 600 tokens should fit only 1 chunk
    messages = build_prompt_messages("test", chunks, max_context_tokens=600)
    sys_content = messages[0]["content"]

    assert "Passage 1" in sys_content
    assert "Big1.pdf" in sys_content
    # Passage 2 and 3 should NOT appear
    assert "Passage 3" not in sys_content


def test_empty_chunks():
    """With no chunks, system prompt should indicate no passages found."""
    messages = build_prompt_messages("What is the policy?", [])
    sys_content = messages[0]["content"]

    assert "No relevant passages were found" in sys_content
    assert messages[1]["content"] == "What is the policy?"


def test_system_prompt_contains_grounding_rules():
    """System prompt template must include the critical grounding constraints."""
    assert "Answer ONLY using the CONTEXT PASSAGES" in SYSTEM_PROMPT
    assert "NEVER invent financial limits" in SYSTEM_PROMPT
    assert "I don't have enough information" in SYSTEM_PROMPT
    assert "SERMS" in SYSTEM_PROMPT


def test_source_attribution_in_passage():
    """Each passage should include the source document title."""
    chunks = [
        _make_chunk("Some policy text.", title="SchoolPolicy_2026.pdf"),
    ]
    messages = build_prompt_messages("query", chunks)
    sys_content = messages[0]["content"]

    assert "SchoolPolicy_2026.pdf" in sys_content
    assert "Source: SchoolPolicy_2026.pdf" in sys_content


if __name__ == "__main__":
    test_basic_prompt_construction()
    print("PASS: test_basic_prompt_construction")

    test_multiple_chunks_ordering()
    print("PASS: test_multiple_chunks_ordering")

    test_context_truncation()
    print("PASS: test_context_truncation")

    test_empty_chunks()
    print("PASS: test_empty_chunks")

    test_system_prompt_contains_grounding_rules()
    print("PASS: test_system_prompt_contains_grounding_rules")

    test_source_attribution_in_passage()
    print("PASS: test_source_attribution_in_passage")

    print("\nAll prompt builder unit tests PASSED!")
