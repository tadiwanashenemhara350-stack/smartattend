from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse, Response
from database import engine, Base
from routes import auth, users, attendance, analytics, admin, notifications, feedback

# Create the database tables automatically
Base.metadata.create_all(bind=engine)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIST_DIR = PROJECT_ROOT / "frontend" / "dist"
INDEX_FILE = FRONTEND_DIST_DIR / "index.html"

import os
import threading
from ml.seed_system import run_seed

app = FastAPI(title="Attendance Management System API")

@app.on_event("startup")
def startup_event():
    # Run seeding in a background thread to avoid blocking the port binding
    # Render kills the deploy if the port isn't opened quickly.
    if os.getenv("FORCE_RESEED") == "true":
        print("FORCE_RESEED detected. Starting background seeding...")
        thread = threading.Thread(target=run_seed)
        thread.daemon = True
        thread.start()
    else:
        print("Background seeding skipped (FORCE_RESEED not set).")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(attendance.router)
app.include_router(analytics.router)
app.include_router(admin.router)
app.include_router(notifications.router)
app.include_router(feedback.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/robots.txt", include_in_schema=False)
def robots_txt(request: Request):
    body = "\n".join([
        "User-agent: *",
        "Allow: /",
        f"Sitemap: {request.base_url}sitemap.xml",
    ])
    return PlainTextResponse(body)

@app.get("/sitemap.xml", include_in_schema=False)
def sitemap_xml(request: Request):
    base = str(request.base_url).rstrip("/")
    urls = [
        f"{base}/",
        f"{base}/login",
    ]
    items = "".join(
        f"<url><loc>{url}</loc></url>"
        for url in urls
    )
    content = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        f"{items}"
        "</urlset>"
    )
    return Response(content=content, media_type="application/xml")

@app.get("/{full_path:path}", include_in_schema=False)
def serve_frontend(full_path: str):
    if not FRONTEND_DIST_DIR.exists() or not INDEX_FILE.exists():
        return JSONResponse(
            {"message": "Frontend build not found. Build the frontend before serving the app."},
            status_code=503,
        )

    requested_path = FRONTEND_DIST_DIR / full_path

    if full_path and requested_path.exists() and requested_path.is_file():
        return FileResponse(requested_path)

    return FileResponse(INDEX_FILE)
