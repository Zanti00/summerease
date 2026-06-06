from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import List, Dict, Any, Optional
import re
import unicodedata

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=3, max_length=1000)
    top_k: int = Field(default=10, ge=1, le=100)
    similarity_threshold: float = Field(default=0.40, ge=0.0, le=1.0)
    file_types: Optional[List[str]] = Field(default=None)
    document_ids: Optional[List[str]] = Field(default=None)
    metadata_filters: Optional[Dict[str, Any]] = Field(default=None)

    @field_validator("query")
    @classmethod
    def sanitize_query(cls, v: str) -> str:
        # Strip control characters and excessive whitespace
        v = re.sub(r"[\x00-\x1f\x7f-\x9f]", "", v)
        v = re.sub(r"\s+", " ", v).strip()
        v = unicodedata.normalize("NFC", v)
        if len(v) < 3:
            raise ValueError("Query too short after normalization")
        return v

class RetrievedChunk(BaseModel):
    chunk_id: str
    document_id: str
    document_title: str
    content: str
    chunk_index: int
    token_count: int
    metadata: Dict[str, Any]

class ChunkScoreDetail(BaseModel):
    chunk_id: str
    vector_similarity: float
    keyword_score: float
    final_score: float

class SearchResponse(BaseModel):
    query: str
    query_id: str
    total_results: int
    retrieval_time_ms: float
    matched_chunks: List[RetrievedChunk]
    scores: List[ChunkScoreDetail]
    metadata: Dict[str, Any]

class UploadResponse(BaseModel):
    document_id: str
    file_name: str
    file_type: Optional[str] = None
    file_size: int
    upload_status: str
    processing_status: str
    created_at: datetime

class DocumentStatusProgress(BaseModel):
    chunks_total: int
    chunks_embedded: int
    percentage: int

class DocumentStatusResponse(BaseModel):
    document_id: str
    file_name: str
    file_type: Optional[str] = None
    file_size: int
    upload_status: str
    processing_status: str
    progress: DocumentStatusProgress
    processing_started_at: Optional[datetime] = None
    processing_completed_at: Optional[datetime] = None
    processing_error: Optional[str] = None

class RAGDocumentItem(BaseModel):
    id: str
    file_name: str
    file_type: Optional[str] = None
    file_size: int
    upload_status: str
    processing_status: str
    total_chunks: int
    total_tokens: int
    created_at: datetime
    processing_completed_at: Optional[datetime] = None

class DocumentListResponse(BaseModel):
    documents: List[RAGDocumentItem]
    total: int

class DeleteResponse(BaseModel):
    status: str
    document_id: str
    chunks_deleted: int
    embeddings_deleted: int
    storage_deleted: bool

class ChunkItem(BaseModel):
    chunk_id: str
    chunk_index: int
    content: str
    token_count: int
    metadata: Dict[str, Any]
    has_embedding: bool

class ChunkListResponse(BaseModel):
    document_id: str
    chunks: List[ChunkItem]
    pagination: Dict[str, Any]


class GenerateRequest(BaseModel):
    """Request body for the RAG generation endpoint."""
    query: str = Field(..., min_length=3, max_length=2000)
    document_ids: Optional[List[str]] = Field(default=None)

    @field_validator("query")
    @classmethod
    def sanitize_query(cls, v: str) -> str:
        """Strip control characters and excessive whitespace."""
        v = re.sub(r"[\x00-\x1f\x7f-\x9f]", "", v)
        v = re.sub(r"\s+", " ", v).strip()
        v = unicodedata.normalize("NFC", v)
        if len(v) < 3:
            raise ValueError("Query too short after normalization")
        return v
