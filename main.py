"""FastAPI deployment entry point; keep backend imports in their package."""
from backend.main import app

__all__ = ["app"]
