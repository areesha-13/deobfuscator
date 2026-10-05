from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import uvicorn
import tempfile
import os
import io
from analyzer.pe_analyzer import analyze_pe
from analyzer.deobfuscator import deobfuscate
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.enums import TA_LEFT, TA_CENTER

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
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=20 * mm,
            leftMargin=20 * mm,
            topMargin=20 * mm,
            bottomMargin=20 * mm,
        )

        # ── Styles ──────────────────────────────────────────────────────────
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'Title', fontSize=20, textColor=colors.HexColor('#FF0080'),
            fontName='Helvetica-Bold', alignment=TA_CENTER, spaceAfter=6
        )
        subtitle_style = ParagraphStyle(
            'Subtitle', fontSize=10, textColor=colors.HexColor('#888888'),
            fontName='Helvetica', alignment=TA_CENTER, spaceAfter=12
        )
        heading_style = ParagraphStyle(
            'Heading', fontSize=12, textColor=colors.HexColor('#FF0080'),
            fontName='Helvetica-Bold', spaceBefore=12, spaceAfter=4
        )
        body_style = ParagraphStyle(
            'Body', fontSize=8, textColor=colors.HexColor('#CCCCCC'),
            fontName='Helvetica', leading=13, spaceAfter=4
        )
        mono_style = ParagraphStyle(
            'Mono', fontSize=7.5, textColor=colors.HexColor('#AAAAAA'),
            fontName='Courier', leading=12, spaceAfter=2
        )

        story = []

        # ── Title ────────────────────────────────────────────────────────────
        story.append(Paragraph("DEOBFUSCATOR", title_style))
        story.append(Paragraph("Obfuscation Analysis Report", subtitle_style))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#FF0080'), spaceAfter=12))

        # ── File info ────────────────────────────────────────────────────────
        filename = data.get("filename", "unknown")
        file_size = data.get("file_size_bytes", 0)
        summary = data.get("analysis", {}).get("summary", {})
        risk = summary.get("risk_level", "UNKNOWN")
        detected_count = summary.get("detected_count", 0)
        techniques = summary.get("techniques_detected", [])

        risk_color_map = {
            "CRITICAL": "#FF0000", "HIGH": "#FF6600",
            "MEDIUM": "#FFAA00", "LOW": "#00FF88"
        }
        risk_hex = risk_color_map.get(risk, "#FFFFFF")

        info_data = [
            ["File", filename],
            ["Size", f"{file_size / 1024:.1f} KB"],
            ["Risk Level", risk],
            ["Techniques Detected", str(detected_count)],
        ]
        info_table = Table(info_data, colWidths=[45 * mm, 120 * mm])
        info_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#FF0080')),
            ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#CCCCCC')),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.HexColor('#1A001A'), colors.HexColor('#0D000D')]),
            ('GRID', (0, 0), (-1, -1), 0.3, colors.HexColor('#330033')),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(info_table)
        story.append(Spacer(1, 8 * mm))

        # ── Detection results ────────────────────────────────────────────────
        story.append(Paragraph("DETECTION RESULTS", heading_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#440022'), spaceAfter=6))

        detections = data.get("analysis", {}).get("detections", {})
        det_data = [["Technique", "Status", "Confidence", "Explanation"]]
        for name, det in detections.items():
            label = name.replace("_", " ").title()
            status = "DETECTED" if det.get("detected") else "CLEAN"
            conf = f"{det.get('confidence', 0) * 100:.0f}%"
            explanation = det.get("explanation", "")[:80] + ("..." if len(det.get("explanation", "")) > 80 else "")
            det_data.append([label, status, conf, explanation])

        det_table = Table(det_data, colWidths=[38 * mm, 22 * mm, 20 * mm, 85 * mm])
        det_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 7.5),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#FF0080')),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#CCCCCC')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#1A001A'), colors.HexColor('#0D000D')]),
            ('GRID', (0, 0), (-1, -1), 0.3, colors.HexColor('#330033')),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2D0020')),
        ]))
        story.append(det_table)
        story.append(Spacer(1, 8 * mm))

        # ── Metadata ─────────────────────────────────────────────────────────
        meta = data.get("analysis", {}).get("metadata", {})
        story.append(Paragraph("BINARY METADATA", heading_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#440022'), spaceAfter=6))

        story.append(Paragraph(f"Imports: {meta.get('import_count', 0)} functions from {meta.get('dll_count', 0)} DLL(s)", body_style))

        if meta.get("anti_debug_imports"):
            story.append(Paragraph(f"Anti-debug APIs: {', '.join(meta['anti_debug_imports'])}", body_style))
        if meta.get("suspicious_imports"):
            story.append(Paragraph(f"Suspicious APIs: {', '.join(meta['suspicious_imports'])}", body_style))
        if meta.get("packer_signatures"):
            story.append(Paragraph(f"Packer signatures: {', '.join(meta['packer_signatures'])}", body_style))

        sections = meta.get("sections", [])
        if sections:
            story.append(Spacer(1, 3 * mm))
            sec_data = [["Section", "Entropy", "Raw Size", "Flag"]]
            for s in sections:
                flag = "⚠ HIGH" if s.get("entropy_flag") else ""
                sec_data.append([s.get("name", ""), str(s.get("entropy", "")), str(s.get("raw_size", "")), flag])
            sec_table = Table(sec_data, colWidths=[40 * mm, 30 * mm, 40 * mm, 55 * mm])
            sec_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 1), (-1, -1), 'Courier'),
                ('FONTSIZE', (0, 0), (-1, -1), 7.5),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#FF0080')),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#AAAAAA')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#1A001A'), colors.HexColor('#0D000D')]),
                ('GRID', (0, 0), (-1, -1), 0.3, colors.HexColor('#330033')),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2D0020')),
            ]))
            story.append(sec_table)

        story.append(Spacer(1, 8 * mm))

        # ── Deobfuscation output ─────────────────────────────────────────────
        deobfuscation = data.get("deobfuscation", {})
        if deobfuscation:
            story.append(Paragraph("DEOBFUSCATION OUTPUT", heading_style))
            story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#440022'), spaceAfter=6))

            # String deobfuscation
            string_data = deobfuscation.get("string_obfuscation", {})
            if string_data:
                story.append(Paragraph(f"String Deobfuscation — {string_data.get('total_decoded_strings', 0)} strings decoded", body_style))
                methods = string_data.get("methods", {})

                b64 = methods.get("base64_decoded", {}).get("decoded_strings", [])
                if b64:
                    story.append(Paragraph("Base64 decoded strings:", body_style))
                    for entry in b64[:10]:
                        story.append(Paragraph(f'  → "{entry.get("decoded", "")}"', mono_style))

                xor = methods.get("xor_brute_force", {}).get("decoded_strings", [])
                if xor:
                    story.append(Paragraph(f"XOR brute force — top results:", body_style))
                    for entry in xor[:5]:
                        for s in entry.get("strings_found", [])[:3]:
                            story.append(Paragraph(f'  Key {entry["key"]}: "{s}"', mono_style))

            # Anti-debug
            anti_debug = deobfuscation.get("anti_debugging", {})
            if anti_debug and anti_debug.get("identified_apis"):
                story.append(Spacer(1, 3 * mm))
                story.append(Paragraph("Anti-Debug APIs Identified:", body_style))
                for api in anti_debug["identified_apis"]:
                    story.append(Paragraph(f'  • {api.get("api")} ({api.get("dll")}) @ {api.get("address")}', mono_style))
                if anti_debug.get("patch_guidance"):
                    story.append(Paragraph("Patch guidance:", body_style))
                    for step in anti_debug["patch_guidance"]:
                        story.append(Paragraph(f'  • {step}', mono_style))

            # CFO / Junk
            for key, label in [("control_flow_obfuscation", "Control Flow"), ("junk_code", "Junk Code")]:
                item = deobfuscation.get(key, {})
                if item:
                    story.append(Spacer(1, 3 * mm))
                    story.append(Paragraph(f"{label}:", body_style))
                    story.append(Paragraph(item.get("message", ""), mono_style))
                    for step in item.get("manual_steps", []):
                        story.append(Paragraph(f'  • {step}', mono_style))

        # ── Build PDF ────────────────────────────────────────────────────────
        doc.build(story)
        buffer.seek(0)

        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="deobfuscator_report_{filename}.pdf"'}
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
