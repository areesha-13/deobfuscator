"""
PE Analyzer — orchestrates feature extraction and classification.
Called by main.py for every uploaded binary.
"""

from analyzer.features import extract_all_features
from analyzer.classifier import classify


def analyze_pe(file_path: str) -> dict:
    """
    Full analysis pipeline:
    1. Extract features from PE file
    2. Classify obfuscation techniques
    3. Return structured report

    Returns:
        {
            "features": { ... numeric features ... },
            "detections": { technique: { confidence, detected, explanation } },
            "summary": { detected_count, techniques_detected, risk_level }
        }
    """
    # Step 1: Feature extraction
    extracted = extract_all_features(file_path)
    features = extracted["features"]
    metadata = extracted["metadata"]

    # Step 2: Classification
    detections = classify(features, metadata)

    # Step 3: Build summary
    detected_techniques = [
        name for name, result in detections.items() if result["detected"]
    ]
    detected_count = len(detected_techniques)

    # Risk level based on number and type of detections
    if detected_count == 0:
        risk_level = "LOW"
    elif detected_count <= 2:
        risk_level = "MEDIUM"
    elif detected_count <= 4:
        risk_level = "HIGH"
    else:
        risk_level = "CRITICAL"

    # Build readable section report
    section_report = [
        {
            "name": s["name"],
            "entropy": s["entropy"],
            "raw_size": s["raw_size"],
            "entropy_flag": s["entropy"] >= 7.0
        }
        for s in metadata["sections"]
    ]

    return {
        "features": features,
        "detections": detections,
        "metadata": {
            "sections": section_report,
            "import_count": features["import_count"],
            "dll_count": features["dll_count"],
            "packer_signatures": metadata["packer_signatures"],
            "anti_debug_imports": metadata["imports"]["anti_debug_hits"],
            "suspicious_imports": metadata["imports"]["suspicious_hits"],
            "total_strings_found": metadata["total_strings"],
            "strings_sample": metadata["strings_sample"][:20],
        },
        "summary": {
            "detected_count": detected_count,
            "techniques_detected": detected_techniques,
            "risk_level": risk_level,
        }
    }
