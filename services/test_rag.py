import asyncio
import uuid
import io
import sys
import os

# Add services root folder to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import UploadFile
from v1.app.rag.service import RAGService
from v1.app.rag.query_engine import QueryEngine
from v1.app.rag.embedding import EmbeddingClient, EmbeddingRateLimiter
from v1.app.core.database import async_session_maker
from v1.app.core.config import get_settings
from v1.app.rag.schemas import SearchRequest
from v1.app.documents.service import supabase


async def run_test():
    settings = get_settings()
    owner_id = str(uuid.uuid4())
    print(f"Starting end-to-end integration test for owner_id: {owner_id}")
    
    # 1. Create test content
    content = (
        "SummerEase is a platform that simplifies RAG (Retrieval-Augmented Generation) pipelines. "
        "It supports PDF, DOCX, TXT, and Markdown files. "
        "It uses pgvector in PostgreSQL as the vector database, google-generativeai to call text-embedding-004, "
        "and Next.js on the frontend. The project is managed by Senior Engineers."
    )
    file_bytes = content.encode("utf-8")
    file_obj = io.BytesIO(file_bytes)
    
    upload_file = UploadFile(
        filename="test_kb.txt",
        file=file_obj,
        size=len(file_bytes),
        headers={"content-type": "text/plain"}
    )
    
    async with async_session_maker() as db:
        svc = RAGService(session=db, settings=settings)
        
        # 2. Ingest document (Upload representation)
        print("Step 1: Ingesting document...")
        doc = await svc.create_document_record(
            owner_id=owner_id,
            file_name=upload_file.filename,
            file_type=upload_file.content_type,
            file_size=upload_file.size,
            file_hash=svc.compute_file_hash(file_bytes),
            storage_path=f"rag/{owner_id}/{doc_id if 'doc_id' in locals() else uuid.uuid4().hex}_{upload_file.filename}"
        )
        # Manually upload bytes to Supabase storage to simulate the endpoint's behavior
        print("Uploading mock bytes to storage bucket...")
        supabase.storage.from_("documents").upload(doc.storage_path, file_bytes)
        
        db.add(doc)
        await db.commit()
        await db.refresh(doc)
        print(f"Document record created: {doc.id}, status: {doc.processing_status}")
        
        # 3. Process document (Worker pipeline representation)
        print("Step 2: Running background ingestion pipeline...")
        await svc.run_ingestion_pipeline(db, str(doc.id))
        
        # Reload status
        status_info = await svc.get_document_status(str(doc.id), owner_id)
        print("Ingestion complete. Document Status:")
        print(status_info)
        
        assert status_info["processing_status"] == "completed", "Processing should be completed"
        assert status_info["progress"]["percentage"] == 100, "Progress should be 100%"
        
        # 4. Search Query test (QueryEngine representation)
        print("Step 3: Querying semantic search index...")
        rate_limiter = EmbeddingRateLimiter(
            requests_per_minute=settings.EMBEDDING_RPM_LIMIT,
            requests_per_day=settings.EMBEDDING_RPD_LIMIT
        )
        emb_client = EmbeddingClient(
            api_key=settings.GOOGLE_API_KEY,
            model=settings.EMBEDDING_MODEL,
            rate_limiter=rate_limiter,
            dimensions=settings.EMBEDDING_DIMENSIONS
        )
        
        engine = QueryEngine(session=db, embedding_client=emb_client)
        
        search_req = SearchRequest(
            query="What is SummerEase?",
            top_k=3,
            similarity_threshold=0.30
        )
        
        search_res = await engine.search(search_req, owner_id)
        print("Search Results:")
        print(f"Time: {search_res.retrieval_time_ms:.1f}ms, Total Matches: {search_res.total_results}")
        for match in search_res.matched_chunks:
            print(f"  - Match (Score={match.metadata.get('score', 'N/A')}): {match.content}")
            
        assert search_res.total_results > 0, "Search should return matches"
        
        # 5. List document chunks test
        print("Step 4: Listing document chunks...")
        chunks_res = await svc.list_chunks(str(doc.id), owner_id)
        print(f"Chunks Count: {len(chunks_res['chunks'])}")
        assert len(chunks_res["chunks"]) > 0, "Should return chunks"
        
        # 6. Delete document test
        print("Step 5: Deleting document and cleaning database...")
        del_res = await svc.delete_document(str(doc.id), owner_id)
        print("Delete Response:", del_res)
        assert del_res["chunks_deleted"] > 0, "Chunks should be deleted"
        
        print("\nAll RAG integration test assertions PASSED!")

if __name__ == "__main__":
    asyncio.run(run_test())
