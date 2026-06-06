import unicodedata
import re

def normalize_text(text: str) -> str:
    """Normalize extracted text for consistent chunking and embedding."""
    if not text:
        return ""
    
    # 1. Unicode normalization (NFC form)
    text = unicodedata.normalize("NFC", text)
    
    # 2. Control character removal (retains tabs, newlines, and carriage returns)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Cc" or ch in "\n\r\t")
    
    # 3. Collapse multiple spaces and horizontal tabs to a single space
    text = re.sub(r"[ \t]+", " ", text)
    
    # 4. Standardize excessive consecutive newlines to at most a double newline (paragraph break)
    text = re.sub(r"\n{3,}", "\n\n", text)
    
    return text.strip()
