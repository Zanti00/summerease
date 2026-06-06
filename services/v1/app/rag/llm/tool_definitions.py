"""Tool definitions for Ollama native tool calling."""

REPLACE_DOCUMENT_CONTENT_TOOL = {
    "type": "function",
    "function": {
        "name": "replace_document_content",
        "description": "Replace the entire content of the currently open document with new content. Use this when the user asks to rewrite, translate, format, simplify, or otherwise transform the document. DO NOT use this for summaries.",
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

REPLACE_SPECIFIC_TEXT_TOOL = {
    "type": "function",
    "function": {
        "name": "replace_specific_text",
        "description": "Replace a specific part of the document with new content. Use this when the user asks to modify or rewrite a specific paragraph, sentence, or section.",
        "parameters": {
            "type": "object",
            "properties": {
                "target_exact_text": {
                    "type": "string",
                    "description": "The exact text or HTML from the document that should be replaced. This MUST exactly match the source document text so it can be found and replaced."
                },
                "new_content_html": {
                    "type": "string",
                    "description": "The new HTML content to replace the target text with."
                },
                "action_summary": {
                    "type": "string",
                    "description": "A brief summary of what was done (e.g., 'Summarized the second paragraph')"
                }
            },
            "required": ["target_exact_text", "new_content_html", "action_summary"]
        }
    }
}

REPLACE_SELECTION_TOOL = {
    "type": "function",
    "function": {
        "name": "replace_selection",
        "description": "Replace the text that the user has currently highlighted/selected. Only use this if the system prompt indicates the user has selected text.",
        "parameters": {
            "type": "object",
            "properties": {
                "new_content_html": {
                    "type": "string",
                    "description": "The new HTML content to replace the user's selection with. CRITICAL: ONLY output the translated/modified selection here. DO NOT include the rest of the document!"
                },
                "action_summary": {
                    "type": "string",
                    "description": "A brief summary of what was done (e.g., 'Translated selection to French')"
                }
            },
            "required": ["new_content_html", "action_summary"]
        }
    }
}

AVAILABLE_TOOLS = [REPLACE_DOCUMENT_CONTENT_TOOL, REPLACE_SPECIFIC_TEXT_TOOL, REPLACE_SELECTION_TOOL]

def get_gemini_tools(tools_subset=None):
    """
    Convert Ollama/OpenAI style JSON schemas to Gemini FunctionDeclarations.
    """
    tools_to_convert = tools_subset if tools_subset is not None else AVAILABLE_TOOLS
    
    function_declarations = []
    for tool in tools_to_convert:
        func = tool["function"]
        properties = {}
        for prop_name, prop_val in func["parameters"]["properties"].items():
            properties[prop_name] = {
                "type": "STRING",
                "description": prop_val.get("description", "")
            }
            
        function_declarations.append({
            "name": func["name"],
            "description": func["description"],
            "parameters": {
                "type": "OBJECT",
                "properties": properties,
                "required": func["parameters"].get("required", [])
            }
        })
        
    return [{"function_declarations": function_declarations}]
