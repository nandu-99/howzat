import json
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from .compiler.pipeline import compile_events, phase_manifest
from .language import EXAMPLES, language_reference
from .version import API_VERSION, COMPILER_VERSION

app = FastAPI(title="Howzat", version=COMPILER_VERSION)

class CompileRequest(BaseModel):
    source: str = Field(min_length=1, max_length=50_000)

@app.get("/api/health")
def health():
    return {"status": "ok", "api_version": API_VERSION,
            "compiler_version": COMPILER_VERSION, "phases": phase_manifest()}

@app.get("/api/examples")
def examples():
    return EXAMPLES

@app.get("/api/language")
def language():
    return language_reference()

@app.post("/api/compile")
def compile_program(request: CompileRequest):
    def stream():
        for event in compile_events(request.source):
            yield json.dumps(event) + "\n"
    return StreamingResponse(stream(), media_type="application/x-ndjson",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")
    @app.get("/")
    @app.get("/language")
    def frontend():
        return FileResponse(DIST / "index.html")
