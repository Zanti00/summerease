import asyncio
import io
from fastapi import UploadFile

async def test():
    file_obj = io.BytesIO(b"hello")
    upload_file = UploadFile(filename="test.txt", file=file_obj, size=5)
    
    # Try awaiting
    try:
        await upload_file.seek(0)
        print("await upload_file.seek(0) SUCCEEDED")
    except Exception as e:
        print("await upload_file.seek(0) FAILED:", type(e), e)
    
    try:
        upload_file.seek(0)
        print("upload_file.seek(0) SUCCEEDED")
    except Exception as e:
        print("upload_file.seek(0) FAILED:", type(e), e)

if __name__ == "__main__":
    asyncio.run(test())
