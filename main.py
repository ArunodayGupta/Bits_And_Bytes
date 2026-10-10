"""Repository root uvicorn entrypoint shim."""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.main import app

__all__ = ["app"]
