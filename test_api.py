import requests
import json
import sys

url = "http://localhost:8000/api/v1/rag/generate-with-tools"
headers = {"Content-Type": "application/json"}
payload = {
    "query": "translate to spanish",
    "document_content_html": "<h1>Hello</h1><p>This is a test document to translate.</p>",
    "selected_text_html": "This is a test document"
}
try:
    response = requests.post(url, headers=headers, json=payload, stream=True)
    for line in response.iter_lines():
        if line:
            print(line.decode("utf-8"))
except Exception as e:
    print(f"Error: {e}")
