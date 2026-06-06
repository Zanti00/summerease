"""Tool definitions for Ollama native tool calling."""

REPLACE_DOCUMENT_CONTENT_TOOL = {
    "type": "function",
    "function": {
        "name": "replace_document_content",
        "description": "Replace the entire content of the currently open document with new content. Use this when the user asks to summarize, rewrite, translate, simplify, or otherwise transform the document.",
        "parameters": {
            "type": "object",
            "properties": {
                "new_content_html": {
                    "type": "string",
                    "description": "The new HTML content to replace the document with. Maintain appropriate HTML formatting."
                },
                "action_summary": {
                    "type": "string",
                    "description": "A brief summary of what was done (e.g., 'Summarized the 3-page paper into key points')"
                }
            },
            "required": ["new_content_html", "action_summary"]
        }
    }
}

AVAILABLE_TOOLS = [REPLACE_DOCUMENT_CONTENT_TOOL]
