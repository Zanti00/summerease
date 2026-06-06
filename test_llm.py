import json
import requests

SYSTEM_PROMPT = """\
You are the SummerEase Policy Assistant — a precise, factual assistant for the School Expense and Reimbursement Management System (SERMS).

The user has the document open right now and wants to modify it.

STRICT RULES:
1. If the user asks to summarize, rewrite, translate, simplify, or otherwise transform the ENTIRE document, use the `replace_document_content` tool.
2. If the user asks to modify a SPECIFIC PART of the document (e.g. "summarize paragraph 2"), and NO text is selected, you MUST use the `replace_specific_text` tool. Provide the EXACT text from the document to replace as `target_exact_text`.
3. If the user HAS SELECTED text, and asks to modify it (e.g. "translate this"), use the `replace_selection` tool.
   - CRITICAL: When using `replace_selection`, ONLY output the new content that should REPLACE the selection. NEVER output the rest of the document!
4. The tools require HTML as input, so you must format the replacement content with standard HTML tags (e.g. <p>, <h1>, <ul>, <li>, <strong>, <em>). DO NOT output markdown.
5. If the user is just asking a question about the document and doesn't want to change it, answer normally without using tools. Keep answers concise.

DOCUMENT CONTENT:
<h1>Hello</h1><p>This is a test document to translate. It has some more text.</p>

CURRENTLY SELECTED TEXT (Use replace_selection tool for this):
This is a test document to translate.
"""

tool = {
    "type": "function",
    "function": {
        "name": "replace_selection",
        "description": "Replaces the currently selected text in the document with new HTML content.",
        "parameters": {
            "type": "object",
            "properties": {
                "new_content_html": {
                    "type": "string",
                    "description": "The new HTML content to replace the selection with. CRITICAL: NEVER output the rest of the document!"
                },
                "action_summary": {
                    "type": "string",
                    "description": "A very brief 1-sentence summary of what you changed."
                }
            },
            "required": ["new_content_html", "action_summary"]
        }
    }
}

payload = {
    "model": "llama3.2",
    "messages": [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": "translate to spanish"}
    ],
    "tools": [tool],
    "stream": False,
    "options": {"temperature": 0.1}
}

try:
    res = requests.post("http://localhost:11434/api/chat", json=payload)
    print(json.dumps(res.json(), indent=2))
except Exception as e:
    print("Error:", e)
