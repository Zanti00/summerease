import io
from docx import Document as DocxDoc
from .base import BaseExtractor, ExtractedDocument, ParagraphContent

class DOCXExtractor(BaseExtractor):
    def extract(self, file_bytes: bytes) -> ExtractedDocument:
        try:
            doc = DocxDoc(io.BytesIO(file_bytes))
            paragraphs = []
            
            for i, para in enumerate(doc.paragraphs):
                text_content = para.text.strip()
                if text_content:
                    style_name = para.style.name if para.style else "Normal"
                    is_heading = style_name.startswith("Heading") if style_name else False
                    paragraphs.append(ParagraphContent(
                        index=i,
                        text=text_content,
                        style=style_name,
                        is_heading=is_heading
                    ))
            
            full_text = "\n\n".join(p.text for p in paragraphs)
            
            return ExtractedDocument(
                full_text=full_text,
                paragraphs=paragraphs,
                metadata={
                    "total_paragraphs": len(paragraphs),
                    "extraction_method": "python-docx"
                }
            )
        except Exception as e:
            raise RuntimeError(f"Failed to extract DOCX: {str(e)}") from e
