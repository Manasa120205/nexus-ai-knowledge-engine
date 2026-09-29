"""Vercel Serverless Entrypoint for NEXUS FastAPI Backend."""
import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
for p in (root_dir, current_dir):
    if p not in sys.path:
        sys.path.insert(0, p)

os.environ.setdefault("ENVIRONMENT", "production")

from fastapi import Request
from fastapi.responses import JSONResponse
from backend.app.main import app as backend_app

# Top-level ASGI app for Vercel
app = backend_app

@app.middleware("http")
async def path_inspector(request: Request, call_next):
    # If the requested path is exactly /api/index.py or /api, return debug info on GET
    path = request.scope.get("path", "")
    if request.method == "GET" and path in ("/api/index.py", "/api/index", "/api", "/api/"):
        return JSONResponse({
            "status": "online",
            "scope_path": path,
            "headers": dict(request.headers),
        })
    
    # Restore original path if rewritten by Vercel
    if path in ("/api/index.py", "/api/index"):
        matched = (
            request.headers.get("x-matched-path")
            or request.headers.get("x-vercel-matched-path")
            or request.headers.get("x-forwarded-uri")
        )
        if matched and matched not in ("/api/index.py", "/api/index"):
            request.scope["path"] = matched

    return await call_next(request)
