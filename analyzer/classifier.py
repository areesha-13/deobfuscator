"""
Classifier module.

Uses a hybrid approach:
  1. Hard rules for high-confidence detections (packer signatures, known APIs)
  2. Heuristic scoring for probabilistic detections (entropy, jump density, string ratio)

Each technique returns a confidence score 0.0 - 1.0 and an explanation.
Threshold for positive detection: >= 0.5
"""


def classify(features: dict, metadata: dict) -> dict:
    """
    Run all detectors and return a detections dict keyed by technique name.
    Each value: { "confidence": float, "detected": bool, "explanation": str }
    """
    detections = {}

    detections["packing"] = detect_packing(features, metadata)
    detections["string_obfuscation"] = detect_string_obfuscation(features, metadata)
    detections["control_flow_obfuscation"] = detect_control_flow_obfuscation(features)
    detections["junk_code"] = detect_junk_code(features)
    detections["anti_debugging"] = detect_anti_debugging(features, metadata)

    return detections


# ── Packing ────────────────────────────────────────────────────────────────────

def detect_packing(features: dict, metadata: dict) -> dict:
    score = 0.0
    reasons = []

    # Hard rule: known packer signature found
    if features["packer_signature_found"]:
        score += 0.6
        sigs = metadata["packer_signatures"]
        reasons.append(f"Known packer signature(s) detected: {', '.join(sigs)}.")

    # High mean entropy strongly suggests compression/encryption
    if features["entropy_mean"] >= 7.0:
        score += 0.3
        reasons.append(f"Mean section entropy is {features['entropy_mean']} (≥7.0 indicates packing).")
    elif features["entropy_mean"] >= 6.5:
        score += 0.15
        reasons.append(f"Elevated mean section entropy: {features['entropy_mean']}.")

    # Very few imports = packer resolves them at runtime
    if features["import_count"] < 5:
        score += 0.1
        reasons.append(f"Only {features['import_count']} imports found — packed binaries resolve imports dynamically.")

    score = min(score, 1.0)
    detected = score >= 0.5

    return {
        "confidence": round(score, 2),
        "detected": detected,
        "explanation": " ".join(reasons) if reasons else "No significant packing indicators found.",
    }


# ── String Obfuscation ─────────────────────────────────────────────────────────

def detect_string_obfuscation(features: dict, metadata: dict) -> dict:
    score = 0.0
    reasons = []

    # Low readable string ratio
    if features["string_ratio"] < 0.05:
        score += 0.35
        reasons.append(f"Very low readable string ratio ({features['string_ratio']}) — strings likely encoded.")
    elif features["string_ratio"] < 0.1:
        score += 0.2
        reasons.append(f"Low readable string ratio ({features['string_ratio']}).")

    # Few strings relative to file size
    expected_strings = features["file_size"] / 5000
    if features["string_count"] < expected_strings * 0.2:
        score += 0.25
        reasons.append(
            f"Only {features['string_count']} strings found for a {features['file_size']} byte file — suspiciously low."
        )

    # High entropy in combination with low strings = encrypted strings
    if features["entropy_max"] >= 7.5 and features["string_ratio"] < 0.1:
        score += 0.2
        reasons.append("High max entropy combined with low string ratio suggests encrypted string storage.")

    # Check for Base64 patterns in extracted strings
    import re
    b64_pattern = re.compile(r"^[A-Za-z0-9+/]{20,}={0,2}$")
    b64_hits = [s for s in metadata["strings_sample"] if b64_pattern.match(s)]
    if b64_hits:
        score += 0.2
        reasons.append(f"Found {len(b64_hits)} potential Base64-encoded string(s) in binary.")

    score = min(score, 1.0)
    detected = score >= 0.5

    return {
        "confidence": round(score, 2),
        "detected": detected,
        "explanation": " ".join(reasons) if reasons else "No significant string obfuscation indicators found.",
    }


# ── Control Flow Obfuscation ───────────────────────────────────────────────────

def detect_control_flow_obfuscation(features: dict) -> dict:
    score = 0.0
    reasons = []

    # High jump density
    if features["jump_density"] >= 15.0:
        score += 0.45
        reasons.append(
            f"Jump instruction density is {features['jump_density']} per 1000 bytes — significantly elevated, suggesting control flow flattening or junk jumps."
        )
    elif features["jump_density"] >= 8.0:
        score += 0.25
        reasons.append(f"Elevated jump density: {features['jump_density']} per 1000 bytes.")

    # Many sections with high entropy = fragmented/obfuscated code layout
    if features["section_count"] >= 8:
        score += 0.15
        reasons.append(f"Unusually high section count ({features['section_count']}) may indicate code splitting.")

    # High entropy + high jump density together = strong signal
    if features["entropy_mean"] >= 6.5 and features["jump_density"] >= 8.0:
        score += 0.2
        reasons.append("Combination of high entropy and high jump density is consistent with control flow obfuscation.")

    score = min(score, 1.0)
    detected = score >= 0.5

    return {
        "confidence": round(score, 2),
        "detected": detected,
        "explanation": " ".join(reasons) if reasons else "No significant control flow obfuscation indicators found.",
    }


# ── Junk Code ─────────────────────────────────────────────────────────────────

def detect_junk_code(features: dict) -> dict:
    score = 0.0
    reasons = []

    # Junk code inflates file size relative to actual imports/functionality
    if features["file_size"] > 500_000 and features["import_count"] < 10:
        score += 0.35
        reasons.append(
            f"Large file ({features['file_size']} bytes) with very few imports ({features['import_count']}) — size may be inflated by junk code."
        )

    # High jump density without corresponding high entropy (entropy would be high if packed)
    # Low-entropy high-jump = junk NOPs / dead branches, not compression
    if features["jump_density"] >= 10.0 and features["entropy_mean"] < 6.0:
        score += 0.4
        reasons.append(
            f"High jump density ({features['jump_density']}) with moderate entropy ({features['entropy_mean']}) — pattern consistent with inserted junk/dead code."
        )

    # Many sections with low per-section entropy = padding/junk sections
    if features["section_count"] >= 6 and features["entropy_mean"] < 5.5:
        score += 0.2
        reasons.append(f"Many sections ({features['section_count']}) with low average entropy may indicate junk padding sections.")

    score = min(score, 1.0)
    detected = score >= 0.5

    return {
        "confidence": round(score, 2),
        "detected": detected,
        "explanation": " ".join(reasons) if reasons else "No significant junk code indicators found.",
    }


# ── Anti-Debugging ─────────────────────────────────────────────────────────────

def detect_anti_debugging(features: dict, metadata: dict) -> dict:
    score = 0.0
    reasons = []

    anti_debug_hits = metadata["imports"]["anti_debug_hits"]

    if len(anti_debug_hits) >= 3:
        score += 0.6
        reasons.append(f"Multiple anti-debug APIs imported: {', '.join(anti_debug_hits)}.")
    elif len(anti_debug_hits) >= 1:
        score += 0.35
        reasons.append(f"Anti-debug API(s) imported: {', '.join(anti_debug_hits)}.")

    # Timing-based anti-debug: GetTickCount or QueryPerformanceCounter
    timing_apis = {"GetTickCount", "QueryPerformanceCounter", "GetTickCount64"}
    timing_hits = [a for a in anti_debug_hits if a in timing_apis]
    if timing_hits:
        score += 0.15
        reasons.append(f"Timing-based anti-debug API(s) found: {', '.join(timing_hits)} — used to detect single-stepping.")

    # Suspicious API combo: VirtualAlloc + WriteProcessMemory = likely injection
    suspicious = metadata["imports"]["suspicious_hits"]
    if "VirtualAlloc" in suspicious and "WriteProcessMemory" in suspicious:
        score += 0.1
        reasons.append("VirtualAlloc + WriteProcessMemory combination found — possible code injection to evade analysis.")

    score = min(score, 1.0)
    detected = score >= 0.5

    return {
        "confidence": round(score, 2),
        "detected": detected,
        "explanation": " ".join(reasons) if reasons else "No anti-debugging indicators found.",
    }
