"""app/database.py
Backwards compatibility shim re-exporting get_supabase from app.utils.db.
All database access is centralized in app.utils.db.
"""

from app.utils.db import get_supabase

__all__ = ["get_supabase"]
