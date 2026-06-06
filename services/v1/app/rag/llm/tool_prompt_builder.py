"""Prompt construction for tool-calling RAG pipeline."""
from __future__ import annotations

import tiktoken
import structlog

logger = structlog.get_logger()

SYSTEM_PROMPT_WITH_TOOLS = """\
You are the SummerEase Policy Assistant — a precise, factual assistant.

The user currently has a document open in their editor. They might ask you a question about it, or they might ask you to modify it.

CRITICAL INSTRUCTION: You have access to tools that can modify the user's document. You MUST NOT use these tools unless the user explicitly asks you to rewrite, replace, translate, or format the document! 

STRICT RULES:
1. If the user asks a question, wants to chat, or asks for a SUMMARY: DO NOT use any tools. Just answer normally in the chat.
2. If the user asks to rewrite, translate, format, simplify, or otherwise transform the ENTIRE document: Use the `replace_document_content` tool.
3. If the user asks to modify a SPECIFIC PART of the document (e.g. "rewrite paragraph 2"), and NO text is selected: Use the `replace_specific_text` tool. Provide the EXACT text from the document to replace as `target_exact_text`.
4. If the user HAS SELECTED text, and asks to modify it (e.g. "translate this"): Use the `replace_selection` tool.
    - CRITICAL: When using `replace_selection`, ONLY output the new content that should REPLACE the selection. NEVER output the rest of the document!
5. When using tools, you MUST format the replacement content using standard HTML tags (e.g. <p>, <h1>, <ul>, <li>, <strong>, <em>).
   - NEVER use markdown (e.g., **, ##, -). Use HTML equivalents.
   - NEVER wrap your response in markdown code blocks. Output raw HTML.
   - DO NOT add inline styles, classes, or <mark>, <pre>, <code>, <div> tags. Keep formatting structural only.

DOCUMENT CONTENT:
{content}
{selection_block}
"""

_TOKENIZER_ENCODING = "cl100k_base"

def build_tool_prompt_messages(
    query: str,
    document_html: str,
    selected_html: str | None = None,
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

    selection_block = ""
    if selected_html:
        selection_block = f"\n\nCURRENTLY SELECTED TEXT (Use replace_selection tool to modify THIS text ONLY):\n{selected_html}"
        # CRITICAL FIX: To prevent the LLM from "hallucinating" and outputting the entire document, 
        # we omit the full document context when the user has selected text.
        document_html = "Document context is hidden to ensure you only focus on the selected text."

    system_message = SYSTEM_PROMPT_WITH_TOOLS.format(
        content=document_html,
        selection_block=selection_block
    )

    return [
        {"role": "system", "content": system_message},
        {"role": "user", "content": query},
    ]
