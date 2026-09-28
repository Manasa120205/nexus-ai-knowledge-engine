"""Vercel Serverless Entrypoint for NEXUS FastAPI Backend."""
import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
backend_dir = os.path.join(root_dir, "backend")

for p in (root_dir, backend_dir, current_dir):
    if p not in sys.path:
        sys.path.insert(0, p)

os.environ.setdefault("ENVIRONMENT", "production")

try:
    from backend.app.main import app
except ImportError:
    from app.main import app

# Export ASGI app for Vercel Python runtime
app = app
