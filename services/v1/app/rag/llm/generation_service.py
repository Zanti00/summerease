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
from v1.app.rag.llm.tool_definitions import AVAILABLE_TOOLS, get_gemini_tools
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
            context_tokens=self._settings.LLM_MAX_CONTEXT_TOKENS,
        ):
            yield token

    async def generate_with_tools_stream(
        self,
        query: str,
        document_html: str,
        selected_html: str | None = None,
    ) -> AsyncIterator[dict]:
        """
        Execute generation with tools and document HTML context using Google Gemini.
        """
        import google.generativeai as genai
        from google.api_core.exceptions import ResourceExhausted
        
        genai.configure(api_key=self._settings.GOOGLE_API_KEY)
        
        messages = build_tool_prompt_messages(
            query=query,
            document_html=document_html,
            selected_html=selected_html,
            max_context_tokens=self._settings.LLM_TOOL_MAX_INPUT_TOKENS,
        )

        system_instruction = next(m["content"] for m in messages if m["role"] == "system")
        user_query = next(m["content"] for m in messages if m["role"] == "user")

        # If text is selected, strongly constrain the model to ONLY use the selection tool
        tools_subset = AVAILABLE_TOOLS
        logger.info("rag.generate_with_tools.start", has_selected_html=bool(selected_html), selected_html_preview=selected_html[:100] if selected_html else None)
        if selected_html:
            tools_subset = [t for t in AVAILABLE_TOOLS if t["function"]["name"] == "replace_selection"]

        gemini_tools = get_gemini_tools(tools_subset)
        
        models_to_try = [self._settings.GEMINI_TOOL_MODEL, self._settings.GEMINI_TOOL_MODEL_FALLBACK]

        for attempt, model_name in enumerate(models_to_try):
            tokens_yielded = False
            model = genai.GenerativeModel(
                model_name=model_name,
                system_instruction=system_instruction,
                tools=gemini_tools,
            )

            try:
                response = await model.generate_content_async(
                    user_query,
                    stream=True,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.1,
                        max_output_tokens=self._settings.LLM_TOOL_MAX_OUTPUT_TOKENS,
                    )
                )

                async for chunk in response:
                    tokens_yielded = True
                    if not chunk.parts:
                        continue
                    part = chunk.parts[0]
                    if part.function_call:
                        # Map Gemini function_call back to expected dictionary format
                        tool_call = {
                            "function": {
                                "name": part.function_call.name,
                                "arguments": dict(part.function_call.args)
                            }
                        }
                        result = process_tool_call(tool_call)
                        if result:
                            yield result
                    elif part.text:
                        yield {"type": "token", "content": part.text}
                
                # Success, no need to try the fallback model
                return

            except ResourceExhausted:
                if tokens_yielded:
                    logger.error("rag.generate_with_tools.quota_limit_mid_stream", model_name=model_name)
                    raise
                elif attempt < len(models_to_try) - 1:
                    logger.warning(
                        "rag.generate_with_tools.quota_limit_hit",
                        failed_model=model_name,
                        fallback_model=models_to_try[attempt + 1]
                    )
                    continue
                else:
                    logger.warning("rag.generate_with_tools.quota_limit_exhausted_all_models", model_name=model_name)
                    break
            except Exception as e:
                logger.error("rag.generate_with_tools.error", error=str(e), model_name=model_name)
                if not tokens_yielded and attempt == len(models_to_try) - 1:
                    break
                raise

        # Fallback to Agnes AI
        if self._settings.SAPIENS_API_KEY:
            from openai import AsyncOpenAI
            import json
            
            logger.info("rag.generate_with_tools.fallback_to_agnes")
            
            client = AsyncOpenAI(
                api_key=self._settings.SAPIENS_API_KEY,
                base_url=self._settings.SAPIENS_BASE_URL if self._settings.SAPIENS_BASE_URL else None,
            )
            
            try:
                response = await client.chat.completions.create(
                    model=self._settings.SAPIENS_MODEL if self._settings.SAPIENS_MODEL else "agnes-v1",
                    messages=messages,
                    tools=tools_subset,
                    temperature=0.1,
                    max_tokens=self._settings.LLM_TOOL_MAX_OUTPUT_TOKENS,
                    stream=True
                )
                
                tool_call_buffer = {}
                
                async for chunk in response:
                    if not chunk.choices:
                        continue
                    delta = chunk.choices[0].delta
                    if delta.tool_calls:
                        for tool_call_delta in delta.tool_calls:
                            idx = tool_call_delta.index
                            if idx not in tool_call_buffer:
                                tool_call_buffer[idx] = {
                                    "id": tool_call_delta.id or "",
                                    "type": "function",
                                    "function": {
                                        "name": tool_call_delta.function.name or "",
                                        "arguments": tool_call_delta.function.arguments or ""
                                    }
                                }
                            else:
                                if tool_call_delta.function.name:
                                    tool_call_buffer[idx]["function"]["name"] += tool_call_delta.function.name
                                if tool_call_delta.function.arguments:
                                    tool_call_buffer[idx]["function"]["arguments"] += tool_call_delta.function.arguments
                    elif delta.content:
                        yield {"type": "token", "content": delta.content}

                # Process buffered tool calls
                if tool_call_buffer:
                    for idx, tool_call in tool_call_buffer.items():
                        try:
                            tool_call["function"]["arguments"] = json.loads(tool_call["function"]["arguments"])
                            result = process_tool_call(tool_call)
                            if result:
                                yield result
                        except json.JSONDecodeError:
                            logger.error("rag.generate_with_tools.agnes_fallback.json_decode_error", args=tool_call["function"]["arguments"])
                return
            except Exception as e:
                logger.error("rag.generate_with_tools.agnes_fallback_failed", error=str(e))
                raise
        else:
            logger.error("rag.generate_with_tools.exhausted_and_no_fallback")
            raise ResourceExhausted("Gemini quota exhausted and Sapiens fallback not configured.")
