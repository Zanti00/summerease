import re
from .base import BaseExtractor, ExtractedDocument, SectionContent

class TextExtractor(BaseExtractor):
    def extract(self, file_bytes: bytes) -> ExtractedDocument:
        # Decode bytes with encoding detection fallback
        try:
            text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            try:
                import chardet
                detected = chardet.detect(file_bytes)
                encoding = detected.get("encoding") or "utf-8"
                text = file_bytes.decode(encoding, errors="replace")
            except ImportError:
                text = file_bytes.decode("utf-8", errors="replace")

        # Normalize line endings and whitespace
        text = re.sub(r"\r\n", "\n", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        
        # Parse headings for section hierarchy (standard Markdown style)
        sections = []
        lines = text.split("\n")
        current_section_title = "Root"
        current_section_lines = []
        heading_hierarchy = ["Root"]

        for line in lines:
            heading_match = re.match(r"^(#{1,6})\s+(.+)$", line)
            if heading_match:
                # Save the accumulated section before moving to the next heading
                if current_section_lines:
                    sections.append(SectionContent(
                        title=current_section_title,
                        text="\n".join(current_section_lines).strip(),
                        heading_hierarchy=list(heading_hierarchy)
                    ))
                    current_section_lines = []
                
                level = len(heading_match.group(1))
                title = heading_match.group(2).strip()
                current_section_title = title
                
                # Maintain the active section hierarchy path
                if level == 1:
                    heading_hierarchy = [title]
                else:
                    heading_hierarchy = heading_hierarchy[:level - 1]
                    while len(heading_hierarchy) < level - 1:
                        heading_hierarchy.append("Sub")
                    heading_hierarchy.append(title)
            else:
                current_section_lines.append(line)
        
        # Save the final section
        if current_section_lines or current_section_title != "Root":
            sections.append(SectionContent(
                title=current_section_title,
                text="\n".join(current_section_lines).strip(),
                heading_hierarchy=list(heading_hierarchy)
            ))

        return ExtractedDocument(
            full_text=text.strip(),
            sections=sections,
            metadata={
                "extraction_method": "text/markdown" if len(sections) > 1 else "text/plain",
                "char_count": len(text)
            }
        )
