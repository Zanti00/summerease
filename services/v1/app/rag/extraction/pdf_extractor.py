import tempfile
import os
from .base import BaseExtractor, ExtractedDocument, PageContent

class PDFExtractor(BaseExtractor):
    def extract(self, file_bytes: bytes) -> ExtractedDocument:
        # Write bytes to a temp file since pymupdf4llm operates on file paths
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_file:
            temp_file.write(file_bytes)
            temp_path = temp_file.name

        try:
            import pymupdf4llm
            
            # Extract markdown text
            md_text = pymupdf4llm.to_markdown(temp_path)
            
            # Extract page chunks
            pages_data = pymupdf4llm.to_markdown(temp_path, page_chunks=True)
            
            pages = []
            for idx, p in enumerate(pages_data):
                page_meta = p.get("metadata", {})
                # Get page number (usually 1-indexed, fallback to idx + 1)
                page_num = page_meta.get("page", idx + 1)
                pages.append(PageContent(
                    page_num=page_num,
                    text=p.get("text", ""),
                    metadata=page_meta
                ))
            
            return ExtractedDocument(
                full_text=md_text,
                pages=pages,
                metadata={
                    "total_pages": len(pages),
                    "extraction_method": "pymupdf4llm"
                }
            )
        except Exception as e:
            raise RuntimeError(f"Failed to extract PDF: {str(e)}") from e
        finally:
            # Ensure cleanup of the temporary file
            try:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
            except Exception:
                pass
