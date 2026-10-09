import time
from fastapi import HTTPException, Request

_rate_limits = {}

def rate_limit(requests: int = 10, window: int = 60):
    def dependency(request: Request):
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        
        if client_ip not in _rate_limits:
            _rate_limits[client_ip] = []
            
        _rate_limits[client_ip] = [t for t in _rate_limits[client_ip] if t > now - window]
        
        if len(_rate_limits[client_ip]) >= requests:
            raise HTTPException(status_code=429, detail="Too Many Requests")
            
        _rate_limits[client_ip].append(now)
        return True
    return dependency
