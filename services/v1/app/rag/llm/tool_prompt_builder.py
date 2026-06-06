"""Prompt construction for tool-calling RAG pipeline."""
from __future__ import annotations

import tiktoken
import structlog

logger = structlog.get_logger()

SYSTEM_PROMPT_WITH_TOOLS = """\
You are the SummerEase Policy Assistant — a precise, factual assistant for the \
School Expense and Reimbursement Management System (SERMS).

The user has the document open right now and wants to modify it.

STRICT RULES:
1. If the user asks to summarize, rewrite, translate, simplify, or otherwise transform the entire document, you MUST use the `replace_document_content` tool.
2. The tool requires HTML as input, so you must format the replacement content with standard HTML tags (e.g. <p>, <h1>, <ul>, <li>, <strong>, <em>). DO NOT output markdown.
3. If the user is just asking a question about the document and doesn't want to change it, answer normally without using the tool. Keep answers concise.
4. Do not invent facts or financial limits. Stick to the context provided.

DOCUMENT CONTENT:
{content}
"""

_TOKENIZER_ENCODING = "cl100k_base"

def build_tool_prompt_messages(
    query: str,
    document_html: str,
    max_context_tokens: int = 3000,
) -> list[dict[str, str]]:
    """
    Assemble the chat messages array for Ollama with tool calling context.
    """
    encoder = tiktoken.get_encoding(_TOKENIZER_ENCODING)

    if not document_html:
        document_html = "(No document open)"
    else:
        # Check token budget
        content_tokens = len(encoder.encode(document_html))
        if content_tokens > max_context_tokens:
            logger.warning("rag.prompt.tool_context_truncated", tokens=content_tokens, max=max_context_tokens)
            # Truncate roughly
            ratio = max_context_tokens / content_tokens
            approx_chars = int(len(document_html) * ratio)
            document_html = document_html[:approx_chars] + "\n\n...[TRUNCATED DUE TO SIZE]..."

    system_message = SYSTEM_PROMPT_WITH_TOOLS.format(content=document_html)

    return [
        {"role": "system", "content": system_message},
        {"role": "user", "content": query},
    ]
