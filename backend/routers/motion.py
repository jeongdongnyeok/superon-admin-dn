from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import FileResponse
from pathlib import Path
import os
from typing import List, Dict, Any
from datetime import datetime

router = APIRouter()

# Base directory for motion assets (always relative to backend directory)
MOTION_DIR = Path(__file__).parent.parent / "assets" / "motion"
MOTION_DIR.mkdir(parents=True, exist_ok=True)

@router.get("/motions")
async def list_motion_files():
    """
    List all available motion files in the motion directory.
    """
    try:
        motion_files = []
        for file in MOTION_DIR.glob("*.mp4"):
            motion_files.append({
                "name": file.name,
                "path": file.name,
                "url": f"http://localhost:8000/assets/motion/{file.name}",
                "size": file.stat().st_size,
                "modified": datetime.fromtimestamp(file.stat().st_mtime).isoformat()
            })
        return {"files": motion_files}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list motion files: {str(e)}"
        )

@router.get("/motion/{file_name}")
async def get_motion_file(file_name: str):
    """
    Serve a motion file by its name.
    """
    # Security check to prevent directory traversal
    if ".." in file_name or "/" in file_name or "\\" in file_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file name"
        )
    
    file_path = MOTION_DIR / file_name
    
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    return FileResponse(
        file_path,
        media_type="video/mp4",
        filename=file_name
    )

@router.get("/character-responses")
async def get_character_responses(limit: int = 50):
    """
    Get recent character responses with their tags and status.
    This is a placeholder - you should implement the actual data retrieval
    based on your database schema.
    """
    try:
        # TODO: Replace with actual database query
        # Example response structure
        responses = [
            {
                "id": "1",
                "message": "안녕하세요! 오늘 기분이 어떠신가요?",
                "tags": ["greeting", "question"],
                "status": "success",
                "timestamp": datetime.now().isoformat()
            },
            {
                "id": "2",
                "message": "날씨가 정말 좋네요. 산책하러 가시는 건 어때요?",
                "tags": ["small_talk", "suggestion"],
                "status": "success",
                "timestamp": (datetime.now() - timedelta(minutes=5)).isoformat()
            }
        ]
        
        return {"responses": responses[:limit]}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch character responses: {str(e)}"
        )
