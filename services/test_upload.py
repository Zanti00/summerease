import asyncio
import uuid
import io
from fastapi import UploadFile
from v1.app.documents.service import create_document
from v1.app.core.database import async_session_maker

async def test_upload():
    async with async_session_maker() as db:
        # Create a dummy UploadFile
        content = b"test content"
        file_obj = io.BytesIO(content)
        upload_file = UploadFile(filename="test.docx", file=file_obj, size=len(content), headers={"content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"})
        
        try:
            # We need an owner_id. Let's just generate a random UUID
            owner_id = str(uuid.uuid4())
            doc = await create_document(db, owner_id, upload_file)
            print("Successfully created document:", doc.id)
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_upload())
