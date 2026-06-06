"""Tool executor for validating and formatting LLM tool calls."""

import json
import structlog
from typing import Dict, Any, Optional

logger = structlog.get_logger()

class ToolExecutionError(Exception):
    pass

def process_tool_call(tool_call: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Process a tool call from the LLM.
    Returns the formatted result ready for the SSE stream, or None if invalid.
    """
    function_data = tool_call.get("function", {})
    name = function_data.get("name")
    
    if name != "replace_document_content":
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
    action_summary = arguments.get("action_summary")

    if not new_content_html or not action_summary:
        logger.error("tool_executor.missing_args", arguments=arguments)
        return None

    return {
        "tool_result": {
            "action": name,
            "new_content_html": new_content_html,
            "action_summary": action_summary
        }
    }
