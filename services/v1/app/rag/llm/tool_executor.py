"""Tool executor for validating and formatting LLM tool calls."""

import json
import structlog
from typing import Dict, Any, Optional
import re
import markdown

logger = structlog.get_logger()

class ToolExecutionError(Exception):
    pass

def process_tool_call(tool_call: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Process a tool call from the LLM.
    Returns the formatted result ready for the SSE stream, or None if invalid.
    """
    # Helper to clean up rogue markdown from LLM
    def clean_markdown(text: str) -> str:
        if not text:
            return text
            
        # Strip LLM hallucinated markdown code blocks
        text = re.sub(r'^```html\n?', '', text)
        text = re.sub(r'^```\n?', '', text)
        text = re.sub(r'\n?```$', '', text)
        
        # Strip internal code blocks wrapping sections
        text = re.sub(r'```html\n(.*?)\n```', r'\1', text, flags=re.DOTALL)
        text = re.sub(r'```(.*?)```', r'\1', text, flags=re.DOTALL)
        
        # Use markdown library to robustly convert Markdown syntax to HTML
        html_output = markdown.markdown(text, extensions=['extra', 'nl2br'])
        return html_output
    function_data = tool_call.get("function", {})
    name = function_data.get("name")
    
    allowed_tools = ["replace_document_content", "replace_specific_text", "replace_selection"]
    if name not in allowed_tools:
        logger.warning("tool_executor.unknown_tool", tool_name=name)
        return None

    arguments_raw = function_data.get("arguments", {})
    
    if isinstance(arguments_raw, dict):
        arguments = arguments_raw
    else:
        try:
            arguments = json.loads(arguments_raw)
        except (json.JSONDecodeError, TypeError):
            logger.error("tool_executor.invalid_json", arguments=arguments_raw)
            return None

    new_content_html = arguments.get("new_content_html")
    if new_content_html:
        new_content_html = clean_markdown(new_content_html)
        
    action_summary = arguments.get("action_summary")
    target_exact_text = arguments.get("target_exact_text")

    if not new_content_html or not action_summary:
        logger.error("tool_executor.missing_args", arguments=arguments)
        return None
        
    if name == "replace_specific_text" and not target_exact_text:
        logger.error("tool_executor.missing_target_text", arguments=arguments)
        return None

    result = {
        "action": name,
        "new_content_html": new_content_html,
        "action_summary": action_summary
    }
    
    if target_exact_text:
        result["target_exact_text"] = target_exact_text

    return {
        "tool_result": result
    }
