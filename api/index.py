"""Vercel Serverless Entrypoint for NEXUS FastAPI Backend."""
import os
import sys
from urllib.parse import parse_qs

current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
for p in (root_dir, current_dir):
    if p not in sys.path:
        sys.path.insert(0, p)

os.environ.setdefault("ENVIRONMENT", "production")

from backend.app.main import app as backend_app

class VercelPathRewriter:
    """ASGI middleware that intercepts Vercel rewrites and restores target route."""
    def __init__(self, asgi_app):
        self.asgi_app = asgi_app

    async def __call__(self, scope, receive, send):
        if scope.get("type") == "http":
            query_string = scope.get("query_string", b"").decode("utf-8")
            if "__route=" in query_string:
                params = parse_qs(query_string)
                if "__route" in params and params["__route"]:
                    route = params["__route"][0].lstrip("/")
                    scope["path"] = f"/{route}"
                    scope["raw_path"] = f"/{route}".encode("utf-8")

        await self.asgi_app(scope, receive, send)

# Assign ASGI entrypoint for Vercel
app = VercelPathRewriter(backend_app)
