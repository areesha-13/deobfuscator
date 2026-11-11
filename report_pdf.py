"""
SaaS-style PDF report for the Deobfuscator.
- Diagonal gradient background on every page, all text white
- Cover page, contents, executive summary, per-technique analysis,
  binary profile with entropy chart, deobfuscation results,
  recommendations, methodology, appendix of extracted features
- Pure reportlab: no extra dependencies
"""
import io
import uuid
from datetime import datetime, timezone
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, NextPageTemplate, PageBreak, Paragraph,
    Spacer, Table, TableStyle, Flowable, KeepTogether, HRFlowable,
)
from reportlab.platypus.tableofcontents import TableOfContents

PAGE_W, PAGE_H = A4
M = 20 * mm
W = PAGE_W - 2 * M

WHITE = colors.white
BG_START = colors.HexColor("#690838")
BG_END = colors.HexColor("#030102")


def A(a):  # white with alpha
    return colors.Color(1, 1, 1, alpha=a)


LINE, HEAD_BG, ROW_A, ROW_B, CARD = A(0.30), A(0.16), A(0.07), A(0.03), A(0.08)

LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

TECH = {
    "packing": (
        "Packing",
        "Packers compress or encrypt a program's code and restore it in memory when the program runs, so the file on disk reveals little about real behaviour.",
        "Static tools only see the small unpacking stub. Signature scanners can miss repacked samples and disassembly of the packed section is meaningless.",
        "Unpack the sample before deeper analysis. UPX-packed files can be reversed automatically; other packers usually need a sandboxed memory dump.",
    ),
    "string_obfuscation": (
        "String Obfuscation",
        "Readable text such as URLs, commands, file paths and registry keys is encoded or encrypted and only decoded at run time.",
        "String extraction returns noise, which hides network indicators and capabilities that analysts normally find first.",
        "Review the decoded strings below, then hunt for the decoding routine to recover strings that automatic methods missed.",
    ),
    "control_flow_obfuscation": (
        "Control Flow Obfuscation",
        "The logic of the program is rearranged or inflated with extra jumps and opaque conditions so the real execution path is hard to follow.",
        "Disassemblers produce tangled graphs and decompiler output becomes unreadable, which slows every later step.",
        "Rebuild the control flow graph and look for a dispatcher block. Dynamic tracing helps recover the true execution order.",
    ),
    "junk_code": (
        "Junk Code Insertion",
        "Instructions that do nothing useful are added to inflate the binary and bury the code that matters.",
        "File size grows and signal-to-noise falls, so manual review takes longer and pattern-based tools see misleading structure.",
        "Trace execution to find the code that actually runs, and strip dead blocks before reading the logic.",
    ),
    "anti_debugging": (
        "Anti-Debugging",
        "The program checks whether it is being debugged or analysed and changes behaviour or exits when it is.",
        "Dynamic analysis may silently take a harmless path, hiding real behaviour from the analyst.",
        "Patch or hook the identified APIs, or use a debugger plug-in that hides the debugger, before dynamic analysis.",
    ),
}
TECH_ORDER = list(TECH.keys())

RISK_TEXT = {
    "LOW": "Few or weak obfuscation indicators were found. The binary looks largely readable to standard tooling.",
    "MEDIUM": "Some obfuscation is present. Standard tooling will work, but expect extra effort in places.",
    "HIGH": "Several obfuscation techniques are present. Plan for dedicated deobfuscation before reliable analysis.",
    "CRITICAL": "Heavy, layered obfuscation was found. Treat standard static results as unreliable until the sample is deobfuscated.",
}


# ---------------------------------------------------------------- page chrome
def _bg(canvas):
    canvas.linearGradient(0, PAGE_H, PAGE_W, 0, (BG_START, BG_END), extend=True)


def _on_cover(canvas, doc):
    canvas.saveState()
    _bg(canvas)
    canvas.restoreState()


def _on_body(canvas, doc):
    canvas.saveState()
    _bg(canvas)
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.4)
    canvas.line(M, M + 2 * mm, PAGE_W - M, M + 2 * mm)
    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawString(M, M - 3 * mm, "Deobfuscator  |  Obfuscation Analysis Report")
    canvas.drawRightString(PAGE_W - M, M - 3 * mm, f"Page {doc.page}")
    canvas.restoreState()


# ------------------------------------------------------------------- styles
def _styles():
    def s(name, **kw):
        kw.setdefault("fontName", "Helvetica")
        kw.setdefault("fontSize", 9.5)
        kw.setdefault("leading", 14)
        return ParagraphStyle(name, textColor=WHITE, **kw)
    return {
        "cover_brand": s("cb", fontSize=11, fontName="Helvetica-Bold", leading=14, alignment=TA_CENTER, spaceAfter=4),
        "cover_title": s("ct", fontSize=30, leading=36, fontName="Helvetica-Bold", alignment=TA_CENTER, spaceAfter=6),
        "cover_sub": s("cs", fontSize=12, leading=16, alignment=TA_CENTER, spaceAfter=4),
        "cover_file": s("cf", fontSize=13, leading=18, fontName="Courier-Bold", alignment=TA_CENTER),
        "H1": s("H1", fontSize=17, leading=22, fontName="Helvetica-Bold", spaceBefore=4, spaceAfter=6),
        "H2": s("H2", fontSize=12.5, leading=16, fontName="Helvetica-Bold", spaceBefore=12, spaceAfter=4),
        "H3": s("H3", fontSize=10, leading=13, fontName="Helvetica-Bold", spaceBefore=6, spaceAfter=2),
        "body": s("body", alignment=TA_JUSTIFY, spaceAfter=6),
        "small": s("small", fontSize=8, leading=11),
        "bullet": s("bullet", leftIndent=14, bulletIndent=2, spaceAfter=3),
        "cell": s("cell", fontSize=8.5, leading=11.5),
        "cellb": s("cellb", fontSize=8.5, leading=11.5, fontName="Helvetica-Bold"),
        "cellm": s("cellm", fontSize=8, leading=11, fontName="Courier"),
        "mono": s("mono", fontSize=8, leading=11.5, fontName="Courier"),
        "kpi": s("kpi", fontSize=20, leading=24, fontName="Helvetica-Bold", alignment=TA_CENTER),
        "kpil": s("kpil", fontSize=7.5, leading=10, alignment=TA_CENTER),
    }


ST = _styles()


def P(text, style="body"):
    return Paragraph(escape(str(text)), ST[style])


def bullets(items):
    return [Paragraph(escape(str(i)), ST["bullet"], bulletText="\u2022") for i in items]


def rule(thick=0.5, after=6):
    return HRFlowable(width="100%", thickness=thick, color=A(0.6), spaceAfter=after)


def table(rows, widths, mono_cols=(), zebra=True):
    data = []
    for r, row in enumerate(rows):
        out = []
        for c, v in enumerate(row):
            st = "cellb" if r == 0 else ("cellm" if c in mono_cols else "cell")
            out.append(Paragraph(escape(str(v)), ST[st]))
        data.append(out)
    t = Table(data, colWidths=widths, repeatRows=1)
    cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), HEAD_BG),
        ("GRID", (0, 0), (-1, -1), 0.4, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7),
    ]
    if zebra:
        cmds.append(("ROWBACKGROUNDS", (0, 1), (-1, -1), [ROW_A, ROW_B]))
    t.setStyle(TableStyle(cmds))
    return t


def callout(paragraphs, width=W):
    t = Table([[paragraphs]], colWidths=[width])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), CARD), ("BOX", (0, 0), (-1, -1), 0.6, A(0.45)),
        ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t


def code_block(lines):
    t = Table([[[Paragraph(escape(l) or "&nbsp;", ST["mono"]) for l in lines]]], colWidths=[W])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.Color(0, 0, 0, alpha=0.35)),
        ("BOX", (0, 0), (-1, -1), 0.4, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 10), ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return t


# --------------------------------------------------------------- flowables
class ConfBar(Flowable):
    def __init__(self, value, width=40 * mm, height=3.2 * mm):
        super().__init__()
        try:
            v = float(value or 0)
        except (TypeError, ValueError):
            v = 0.0
        self.v, self.width, self.height = max(0, min(1, v)), width, height

    def wrap(self, aw, ah):
        return self.width, self.height

    def draw(self):
        c = self.canv
        c.setFillColor(A(0.15)); c.rect(0, 0, self.width, self.height, stroke=0, fill=1)
        c.setFillColor(A(0.85)); c.rect(0, 0, self.width * self.v, self.height, stroke=0, fill=1)


class Gauge(Flowable):
    def __init__(self, level, width=W, height=14 * mm):
        super().__init__()
        self.level, self.width, self.height = level, width, height

    def wrap(self, aw, ah):
        return self.width, self.height

    def draw(self):
        c = self.canv
        n, gap = len(LEVELS), 3 * mm
        seg = (self.width - gap * (n - 1)) / n
        active = LEVELS.index(self.level) if self.level in LEVELS else -1
        for i, name in enumerate(LEVELS):
            x = i * (seg + gap)
            on = i <= active
            c.setFillColor(A(0.12 + 0.12 * (i + 1)) if on else A(0.05))
            c.setStrokeColor(A(0.9 if i == active else 0.35))
            c.setLineWidth(1.6 if i == active else 0.5)
            c.rect(x, 0, seg, self.height, stroke=1, fill=1)
            c.setFillColor(WHITE)
            c.setFont("Helvetica-Bold" if i == active else "Helvetica", 9)
            c.drawCentredString(x + seg / 2, self.height / 2 - 3, name)


class EntropyChart(Flowable):
    def __init__(self, sections, width=W):
        super().__init__()
        self.sections, self.width = sections, width
        self.row = 7 * mm
        self.height = self.row * len(sections) + 10 * mm

    def wrap(self, aw, ah):
        return self.width, self.height

    def draw(self):
        c = self.canv
        label_w, right = 30 * mm, 14 * mm
        plot_w = self.width - label_w - right
        top = self.height - 2 * mm
        c.setStrokeColor(A(0.25)); c.setLineWidth(0.3)
        c.setFont("Helvetica", 7); c.setFillColor(WHITE)
        for t in range(0, 9, 2):
            x = label_w + plot_w * t / 8
            c.line(x, 4 * mm, x, top)
            c.drawCentredString(x, 0.5 * mm, str(t))
        for i, s in enumerate(self.sections):
            y = top - (i + 1) * self.row + 1.5 * mm
            try:
                e = float(s.get("entropy", 0))
            except (TypeError, ValueError):
                e = 0.0
            flagged = bool(s.get("entropy_flag"))
            c.setFillColor(WHITE); c.setFont("Courier", 8)
            c.drawString(0, y + 1, str(s.get("name", ""))[:14])
            c.setFillColor(A(0.9) if flagged else A(0.35))
            c.rect(label_w, y, plot_w * max(0, min(8, e)) / 8, 4 * mm, stroke=0, fill=1)
            c.setFillColor(WHITE); c.setFont("Helvetica", 7.5)
            c.drawString(label_w + plot_w * max(0, min(8, e)) / 8 + 2, y + 1, f"{e:.2f}")


# ---------------------------------------------------------------- doc class
class ReportDoc(BaseDocTemplate):
    def __init__(self, buf):
        super().__init__(buf, pagesize=A4, leftMargin=M, rightMargin=M, topMargin=M, bottomMargin=M,
                         title="Deobfuscator Analysis Report", author="Deobfuscator")
        f = Frame(M, M + 4 * mm, W, PAGE_H - 2 * M - 4 * mm, leftPadding=0, rightPadding=0,
                  topPadding=0, bottomPadding=0, id="main")
        self.addPageTemplates([
            PageTemplate(id="cover", frames=[f], onPage=_on_cover),
            PageTemplate(id="body", frames=[f], onPage=_on_body),
        ])

    def afterFlowable(self, fl):
        if isinstance(fl, Paragraph):
            name = fl.style.name
            if name in ("H1", "H2"):
                key = f"h-{self.seq.nextf('toc')}"
                self.canv.bookmarkPage(key)
                self.notify("TOCEntry", (0 if name == "H1" else 1, fl.getPlainText(), self.page, key))


# -------------------------------------------------------------- helpers
def _num(v, default=0):
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def _flatten(d, prefix="", out=None, depth=0):
    out = {} if out is None else out
    for k, v in (d or {}).items():
        key = f"{prefix}{k}"
        if isinstance(v, dict) and depth < 2:
            _flatten(v, key + ".", out, depth + 1)
        elif isinstance(v, (int, float, str, bool)) or v is None:
            out[key] = v
        elif isinstance(v, (list, tuple)):
            out[key] = f"{len(v)} item(s)"
    return out


def _fmt(v):
    if isinstance(v, bool):
        return "Yes" if v else "No"
    if isinstance(v, float):
        return f"{v:.3f}"
    return str(v)


def build_report_pdf(data: dict) -> io.BytesIO:
    analysis = data.get("analysis", {}) or {}
    deob = data.get("deobfuscation", {}) or {}
    summary = analysis.get("summary", {}) or {}
    detections = analysis.get("detections", {}) or {}
    meta = analysis.get("metadata", {}) or {}
    features = analysis.get("features", {}) or {}
    sections = meta.get("sections", []) or []
    filename = data.get("filename", "unknown")
    size_kb = _num(data.get("file_size_bytes", 0)) / 1024
    risk = str(summary.get("risk_level", "UNKNOWN")).upper()
    detected = [k for k in TECH_ORDER if (detections.get(k) or {}).get("detected")]
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    report_id = uuid.uuid4().hex[:8].upper()
    flagged_sections = [s for s in sections if s.get("entropy_flag")]

    story = []

    # ============================ COVER
    story += [
        Spacer(1, 55 * mm),
        Paragraph("DEOBFUSCATOR", ST["cover_brand"]),
        Spacer(1, 6 * mm),
        Paragraph("Obfuscation Analysis Report", ST["cover_title"]),
        Paragraph("Technique identification and deobfuscation findings for a Windows PE binary", ST["cover_sub"]),
        Spacer(1, 14 * mm),
        HRFlowable(width="40%", thickness=1, color=WHITE, hAlign="CENTER", spaceAfter=10),
        Paragraph(escape(filename), ST["cover_file"]),
        Spacer(1, 12 * mm),
        Gauge(risk, width=110 * mm),
        Spacer(1, 40 * mm),
    ]
    meta_rows = [["Report ID", report_id], ["Generated", now],
                 ["File size", f"{size_kb:.1f} KB"], ["Overall risk", risk]]
    mt = Table([[Paragraph(a, ST["cellb"]), Paragraph(escape(b), ST["cell"])] for a, b in meta_rows],
               colWidths=[35 * mm, 60 * mm], hAlign="CENTER")
    mt.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.4, LINE), ("BACKGROUND", (0, 0), (0, -1), HEAD_BG),
                            ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
    story += [mt, NextPageTemplate("body"), PageBreak()]

    # ============================ CONTENTS
    toc = TableOfContents()
    toc.levelStyles = [
        ParagraphStyle("toc0", textColor=WHITE, fontName="Helvetica-Bold", fontSize=10.5, leading=20, leftIndent=0),
        ParagraphStyle("toc1", textColor=WHITE, fontName="Helvetica", fontSize=9, leading=14, leftIndent=14),
    ]
    toc.dotsMinLevel = 0
    story += [Paragraph("Contents", ParagraphStyle("ct2", parent=ST["body"], fontSize=17, leading=22,
                                                   fontName="Helvetica-Bold", spaceAfter=10)),
              rule(1, 10), toc, PageBreak()]

    # ============================ 1. EXECUTIVE SUMMARY
    story += [Paragraph("1. Executive Summary", ST["H1"]), rule(1, 8)]
    kpis = [
        (risk, "OVERALL RISK"),
        (f"{len(detected)} / {len(TECH_ORDER)}", "TECHNIQUES DETECTED"),
        (str(meta.get("import_count", 0)), "IMPORTED FUNCTIONS"),
        (f"{len(flagged_sections)} / {len(sections)}", "HIGH-ENTROPY SECTIONS"),
    ]
    kt = Table([[Paragraph(escape(v), ST["kpi"]) for v, _ in kpis],
                [Paragraph(l, ST["kpil"]) for _, l in kpis]], colWidths=[W / 4] * 4)
    kt.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), CARD), ("BOX", (0, 0), (-1, -1), 0.5, LINE),
                            ("LINEAFTER", (0, 0), (-2, -1), 0.4, LINE), ("TOPPADDING", (0, 0), (-1, 0), 12),
                            ("BOTTOMPADDING", (0, 1), (-1, 1), 10), ("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
    story += [kt, Spacer(1, 8 * mm), Gauge(risk), Spacer(1, 6 * mm)]

    if detected:
        names = ", ".join(TECH[k][0] for k in detected)
        verdict = (f"The file {filename} was assessed as {risk} risk. {len(detected)} of {len(TECH_ORDER)} "
                   f"obfuscation techniques were flagged: {names}.")
    else:
        verdict = f"The file {filename} was assessed as {risk} risk. None of the five techniques were flagged."
    story.append(callout([P(verdict), P(RISK_TEXT.get(risk, "Risk level could not be determined."))]))
    story.append(Spacer(1, 4 * mm))

    story.append(Paragraph("Technique overview", ST["H2"]))
    data_rows = [[Paragraph("Technique", ST["cellb"]), Paragraph("Status", ST["cellb"]),
                  Paragraph("Confidence", ST["cellb"]), Paragraph("Level", ST["cellb"])]]
    for k in TECH_ORDER:
        d = detections.get(k) or {}
        data_rows.append([Paragraph(TECH[k][0], ST["cell"]),
                          Paragraph("DETECTED" if d.get("detected") else "Not detected",
                                    ST["cellb" if d.get("detected") else "cell"]),
                          Paragraph(f"{_num(d.get('confidence')) * 100:.0f}%", ST["cell"]),
                          ConfBar(d.get("confidence"), width=W - 106 * mm - 14)])
    ov = Table(data_rows, colWidths=[52 * mm, 28 * mm, 26 * mm, W - 106 * mm], repeatRows=1)
    ov.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), HEAD_BG), ("GRID", (0, 0), (-1, -1), 0.4, LINE),
                            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [ROW_A, ROW_B]), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                            ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                            ("LEFTPADDING", (0, 0), (-1, -1), 7)]))
    story.append(ov)

    story.append(Paragraph("Key findings", ST["H2"]))
    findings = []
    for k in detected:
        e = (detections.get(k) or {}).get("explanation")
        findings.append(f"{TECH[k][0]}: {e}" if e else f"{TECH[k][0]} was detected.")
    if flagged_sections:
        findings.append("High entropy in section(s): " + ", ".join(str(s.get("name")) for s in flagged_sections) + ".")
    if meta.get("packer_signatures"):
        findings.append("Packer signature(s) matched: " + ", ".join(map(str, meta["packer_signatures"])) + ".")
    if meta.get("anti_debug_imports"):
        findings.append(f"{len(meta['anti_debug_imports'])} anti-debugging import(s) found.")
    story += bullets(findings or ["No significant obfuscation indicators were found."])
    story.append(PageBreak())

    # ============================ 2. DETECTION ANALYSIS
    story += [Paragraph("2. Detection Analysis", ST["H1"]), rule(1, 6),
              P("Each technique below was scored by the detection engine from features extracted from the binary. "
                "Confidence is a heuristic score between 0 and 100 percent and is advisory.")]
    for i, k in enumerate(TECH_ORDER, 1):
        name, what, why, action = TECH[k]
        d = detections.get(k) or {}
        block = [
            Paragraph(f"2.{i} {name}", ST["H2"]),
            Table([[Paragraph("DETECTED" if d.get("detected") else "NOT DETECTED", ST["cellb"]),
                    Paragraph(f"Confidence {_num(d.get('confidence')) * 100:.0f}%", ST["cell"]),
                    ConfBar(d.get("confidence"), width=60 * mm)]],
                  colWidths=[34 * mm, 34 * mm, 66 * mm], style=[
                      ("BACKGROUND", (0, 0), (-1, -1), CARD), ("BOX", (0, 0), (-1, -1), 0.4, LINE),
                      ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("TOPPADDING", (0, 0), (-1, -1), 6),
                      ("BOTTOMPADDING", (0, 0), (-1, -1), 6), ("LEFTPADDING", (0, 0), (-1, -1), 8)], hAlign="LEFT"),
            Spacer(1, 3 * mm),
            Paragraph("Engine explanation", ST["H3"]),
            P(d.get("explanation") or "No explanation was provided by the engine."),
            Paragraph("What it is", ST["H3"]), P(what),
            Paragraph("Why it matters", ST["H3"]), P(why),
            Paragraph("Recommended response", ST["H3"]), P(action),
        ]
        story.append(KeepTogether(block))
    story.append(PageBreak())

    # ============================ 3. BINARY PROFILE
    story += [Paragraph("3. Binary Profile", ST["H1"]), rule(1, 6),
              Paragraph("3.1 File and import summary", ST["H2"]),
              table([["Property", "Value"],
                     ["File name", filename], ["File size", f"{size_kb:.1f} KB"],
                     ["Imported functions", meta.get("import_count", 0)],
                     ["Imported DLLs", meta.get("dll_count", 0)],
                     ["Sections", len(sections)],
                     ["Packer signatures", ", ".join(map(str, meta.get("packer_signatures", []))) or "None"]],
                    [55 * mm, W - 55 * mm])]
    for key, title in [("anti_debug_imports", "Anti-debugging imports"), ("suspicious_imports", "Suspicious imports")]:
        items = meta.get(key) or []
        story.append(Paragraph(f"3.{2 if key == 'anti_debug_imports' else 3} {title}", ST["H2"]))
        if items:
            story.append(table([["#", "API"]] + [[i + 1, x] for i, x in enumerate(items)],
                               [14 * mm, W - 14 * mm], mono_cols=(1,)))
        else:
            story.append(P("None found."))
    story.append(Paragraph("3.4 Section entropy", ST["H2"]))
    if sections:
        story += [P("Shannon entropy ranges from 0 to 8 bits per byte. Values near 8 indicate compressed or encrypted data. "
                    "Bright bars are sections the engine flagged as high entropy."),
                  EntropyChart(sections), Spacer(1, 4 * mm),
                  table([["Section", "Entropy", "Raw size (bytes)", "Flag"]] +
                        [[s.get("name", ""), s.get("entropy", ""), s.get("raw_size", ""),
                          "HIGH ENTROPY" if s.get("entropy_flag") else "Normal"] for s in sections],
                        [40 * mm, 30 * mm, 45 * mm, W - 115 * mm], mono_cols=(0, 1, 2))]
    else:
        story.append(P("No section data was returned for this file."))
    story.append(PageBreak())

    # ============================ 4. DEOBFUSCATION RESULTS
    story += [Paragraph("4. Deobfuscation Results", ST["H1"]), rule(1, 6),
              P("Where a technique was detected, the engine attempted the reversal routine that applies. "
                "Statuses distinguish a completed reversal from identification only.")]
    out_rows = [["Technique", "Detected", "Routine status"]]
    for k in TECH_ORDER:
        det = bool((detections.get(k) or {}).get("detected"))
        dk = deob.get(k) or (deob.get("unpacking") if k == "packing" else None) or {}
        out_rows.append([TECH[k][0], "Yes" if det else "No",
                         str(dk.get("status", "attempted")) if det and dk else ("not run" if det else "not required")])
    story += [Paragraph("4.1 Outcome by technique", ST["H2"]), table(out_rows, [60 * mm, 30 * mm, W - 90 * mm])]

    n = 2
    handled = {"string_obfuscation", "anti_debugging", "control_flow_obfuscation", "junk_code"}
    sd = deob.get("string_obfuscation") or {}
    if sd:
        story.append(Paragraph(f"4.{n} String deobfuscation", ST["H2"])); n += 1
        story.append(P(f"{sd.get('total_decoded_strings', 0)} string(s) were recovered."))
        methods = sd.get("methods", {}) or {}
        b64 = (methods.get("base64_decoded") or {}).get("decoded_strings", []) or []
        if b64:
            story += [Paragraph("Base64 decoded strings", ST["H3"]),
                      code_block([f'-> "{e.get("decoded", "")}"' for e in b64[:15]])]
        xor = (methods.get("xor_brute_force") or {}).get("decoded_strings", []) or []
        if xor:
            lines = []
            for e in xor[:8]:
                for s in (e.get("strings_found") or [])[:3]:
                    lines.append(f'key {e.get("key")}: "{s}"')
            story += [Paragraph("Single-byte XOR brute force", ST["H3"]), code_block(lines or ["(no readable results)"])]
    ad = deob.get("anti_debugging") or {}
    if ad:
        story.append(Paragraph(f"4.{n} Anti-debugging", ST["H2"])); n += 1
        apis = ad.get("identified_apis") or []
        if apis:
            story.append(table([["API", "DLL", "Address"]] +
                               [[a.get("api"), a.get("dll"), a.get("address")] for a in apis],
                               [60 * mm, 55 * mm, W - 115 * mm], mono_cols=(0, 1, 2)))
        if ad.get("patch_guidance"):
            story += [Paragraph("Patch guidance", ST["H3"])] + bullets(ad["patch_guidance"])
    for key, label in [("control_flow_obfuscation", "Control flow obfuscation"), ("junk_code", "Junk code")]:
        item = deob.get(key) or {}
        if item:
            story.append(Paragraph(f"4.{n} {label}", ST["H2"])); n += 1
            if item.get("message"):
                story.append(P(item["message"]))
            if item.get("manual_steps"):
                story += [Paragraph("Manual steps", ST["H3"])] + bullets(item["manual_steps"])
    for key, item in deob.items():
        if key in handled or not isinstance(item, dict):
            continue
        story.append(Paragraph(f"4.{n} {key.replace('_', ' ').title()}", ST["H2"])); n += 1
        flat = _flatten(item)
        story.append(table([["Field", "Value"]] + [[k, _fmt(v)] for k, v in flat.items()],
                           [55 * mm, W - 55 * mm], mono_cols=(0,)) if flat else P("No details returned."))
    story.append(PageBreak())

    # ============================ 5. RECOMMENDATIONS
    story += [Paragraph("5. Recommendations", ST["H1"]), rule(1, 6),
              P("Suggested next steps, ordered by the techniques that were detected in this sample.")]
    if detected:
        rec = [["Priority", "Technique", "Action"]]
        for i, k in enumerate(detected, 1):
            rec.append([i, TECH[k][0], TECH[k][3]])
        story.append(table(rec, [18 * mm, 42 * mm, W - 60 * mm]))
    else:
        story.append(P("No techniques were detected. Proceed with standard static and dynamic analysis."))
    story += [Paragraph("General guidance", ST["H2"])] + bullets([
        "Always analyse unknown binaries inside an isolated virtual machine without network access.",
        "Re-run the analysis on any unpacked or deobfuscated output to find layered techniques.",
        "Treat results as leads to verify, not final verdicts.",
    ])

    # ============================ 6. METHODOLOGY
    story += [Paragraph("6. Methodology and Limitations", ST["H1"]), rule(1, 6),
              Paragraph("6.1 How the analysis works", ST["H2"]),
              P("The uploaded file is parsed as a Windows Portable Executable. Features such as section entropy, "
                "printable string ratio, import table contents and jump density are extracted. A rule-based "
                "classifier converts those features into a detected flag, a confidence score and an explanation for "
                "each technique. A deobfuscation module then runs the routines that apply to each detected technique. "
                "The file is analysed statically and is never executed."),
              Paragraph("6.2 Limitations", ST["H2"])] + bullets([
        "Detection is heuristic. False positives and false negatives are possible.",
        "Only simple packers such as UPX are unpacked automatically.",
        "String recovery covers Base64 and single-byte XOR only.",
        "Control flow obfuscation and junk code are flagged but not reversed automatically.",
        "Behaviour that only appears at run time cannot be observed by static analysis.",
    ])
    story.append(PageBreak())

    # ============================ APPENDIX
    story += [Paragraph("Appendix A. Extracted Features", ST["H1"]), rule(1, 6),
              P("Raw measurements extracted from the binary and used by the detection engine.")]
    flat = _flatten(features)
    if flat:
        story.append(table([["Feature", "Value"]] + [[k, _fmt(v)] for k, v in flat.items()],
                           [75 * mm, W - 75 * mm], mono_cols=(0, 1)))
    else:
        story.append(P("No feature data was returned."))

    buf = io.BytesIO()
    ReportDoc(buf).multiBuild(story)
    buf.seek(0)
    return buf