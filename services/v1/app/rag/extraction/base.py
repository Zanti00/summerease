from abc import ABC, abstractmethod
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class PageContent(BaseModel):
    page_num: int
    text: str
    metadata: Dict[str, Any] = {}

class ParagraphContent(BaseModel):
    index: int
    text: str
    style: Optional[str] = None
    is_heading: bool = False

class SectionContent(BaseModel):
    title: str
    text: str
    heading_hierarchy: List[str]

class ExtractedDocument(BaseModel):
    full_text: str
    pages: List[PageContent] = []
    paragraphs: List[ParagraphContent] = []
    sections: List[SectionContent] = []
    metadata: Dict[str, Any] = {}

class BaseExtractor(ABC):
    @abstractmethod
    def extract(self, file_bytes: bytes) -> ExtractedDocument:
        """Extract text and structure from file bytes."""
        pass
