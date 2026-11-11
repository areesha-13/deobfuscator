from report_pdf import build_report_pdf
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import uvicorn
import tempfile
import os
import io
from analyzer.pe_analyzer import analyze_pe
from analyzer.deobfuscator import deobfuscate

app = FastAPI(
    title="Obfuscation Technique Identifier & Deobfuscator",
    description="Detects and reverses obfuscation techniques in PE binaries.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_EXTENSIONS = {".exe", ".dll", ".sys"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@app.get("/")
def root():
    return {"message": "Deobfuscator API is running. POST a binary to /analyze"}


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {ALLOWED_EXTENSIONS}"
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Max size is 10MB.")

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        analysis_result = analyze_pe(tmp_path)
        deobfuscation_result = deobfuscate(tmp_path, analysis_result["detections"])

        return {
            "filename": file.filename,
            "file_size_bytes": len(contents),
            "analysis": analysis_result,
            "deobfuscation": deobfuscation_result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    finally:
        os.unlink(tmp_path)

@app.post("/report")
async def generate_report(data: dict):
       """Generate a PDF report from analysis results and return it as a download."""
       try:
           buffer = build_report_pdf(data)
           filename = data.get("filename", "unknown")
           return StreamingResponse(
               buffer,
               media_type="application/pdf",
               headers={"Content-Disposition": f'attachment; filename="deobfuscator_report_{filename}.pdf"'}
           )
       except Exception as e:
           raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
