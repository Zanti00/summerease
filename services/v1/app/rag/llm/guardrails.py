"""Security guardrails for LLM inputs to prevent prompt injection."""
import re
import structlog
from fastapi import HTTPException

logger = structlog.get_logger()

# Common injection patterns
INJECTION_PATTERNS = [
    r"(?i)\bignore\b.*\b(?:previous|all|above|below)\b.*\b(?:instructions|prompts|rules|directions)\b",
    r"(?i)\bdisregard\b.*\b(?:previous|all|above|below)\b",
    r"(?i)\bforget\b.*\b(?:previous|all|above|below)\b",
    r"(?i)\byou are now\b",
    r"(?i)\bsystem prompt\b",
    r"(?i)\bprint your instructions\b",
    r"(?i)\bwhat model are you\b",
    r"(?i)\bwhat ai are you\b",
    r"(?i)\bwho created you\b",
    r"(?i)\boverride\b.*\b(?:instructions|rules)\b",
    r"(?i)\bbypass\b.*\b(?:security|rules)\b"
]

def check_for_prompt_injection(query: str) -> None:
    """
    Check a user query for common prompt injection heuristic patterns.
    Raises an HTTPException if an injection is detected.
    """
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, query):
            logger.warning("rag.security.prompt_injection_detected", query=query, matched_pattern=pattern)
            raise HTTPException(
                status_code=400,
                detail="Your request contains phrasing that violates security policies. Please rephrase your query."
            )
