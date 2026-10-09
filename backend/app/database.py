from supabase import create_client, Client
from app.config import settings

def get_supabase() -> Client:
    # Uses the service role key to bypass RLS for demo purposes.
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
