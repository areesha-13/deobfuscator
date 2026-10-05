# Obfuscation Technique Identifier & Deobfuscator

Automatically detects and attempts to reverse obfuscation techniques in Windows PE binaries (.exe, .dll, .sys).

## Techniques Detected

| Technique | Detection Method |
|---|---|
| Packing | Entropy analysis + packer signature matching |
| String Obfuscation | String ratio, Base64 patterns, XOR brute force |
| Control Flow Obfuscation | Jump density analysis + section anomalies |
| Junk Code | File size / import ratio + jump density heuristics |
| Anti-Debugging | Import table analysis against known anti-debug APIs |

## Setup

```bash
pip install -r requirements.txt
```

## Run

```bash
python main.py
```

API will be available at: http://localhost:8000

Interactive docs at: http://localhost:8000/docs

## API Endpoints

### POST /analyze
Upload a PE binary for analysis.

**Request:** multipart/form-data with field `file`

**Response:**
```json
{
  "filename": "sample.exe",
  "file_size_bytes": 102400,
  "analysis": {
    "features": { ... },
    "detections": {
      "packing": { "confidence": 0.9, "detected": true, "explanation": "..." },
      "string_obfuscation": { "confidence": 0.7, "detected": true, "explanation": "..." },
      "control_flow_obfuscation": { "confidence": 0.3, "detected": false, "explanation": "..." },
      "junk_code": { "confidence": 0.2, "detected": false, "explanation": "..." },
      "anti_debugging": { "confidence": 0.6, "detected": true, "explanation": "..." }
    },
    "summary": {
      "detected_count": 3,
      "techniques_detected": ["packing", "string_obfuscation", "anti_debugging"],
      "risk_level": "HIGH"
    }
  },
  "deobfuscation": {
    "packing": { "status": "success", ... },
    "string_obfuscation": { "status": "completed", ... },
    "anti_debugging": { "status": "identified", ... }
  }
}
```

## Project Structure

```
deobfuscator/
├── main.py                  # FastAPI app, routes
├── requirements.txt
├── README.md
└── analyzer/
    ├── __init__.py
    ├── features.py          # Feature extraction (entropy, strings, imports, CFG)
    ├── classifier.py        # Heuristic + rule-based detection per technique
    ├── deobfuscator.py      # Deobfuscation routines
    └── pe_analyzer.py       # Orchestrates the full pipeline
```

## Optional: UPX for automatic unpacking

Download from https://upx.github.io/ and add to PATH to enable automatic unpacking of UPX-packed binaries.
