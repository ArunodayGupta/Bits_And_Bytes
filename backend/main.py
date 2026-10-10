"""backend/main.py
Root entrypoint for running: uvicorn main:app
Re-exports FastAPI app from app.main.
"""

from app.main import app

__all__ = ["app"]
