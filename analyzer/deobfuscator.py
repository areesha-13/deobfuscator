"""
Deobfuscation module.

For each detected technique, applies the corresponding reversal strategy.
Returns structured results — decoded strings, unpacking status, and explanations.
Does not modify the original file.
"""

import subprocess
import shutil
import os
import re
import base64
import tempfile


# ── Master deobfuscator ────────────────────────────────────────────────────────

def deobfuscate(file_path: str, detections: dict) -> dict:
    """
    Run deobfuscation routines for every detected technique.
    Returns a dict of results keyed by technique.
    """
    results = {}

    if detections.get("packing", {}).get("detected"):
        results["packing"] = attempt_unpack(file_path)

    if detections.get("string_obfuscation", {}).get("detected"):
        with open(file_path, "rb") as f:
            raw = f.read()
        results["string_obfuscation"] = attempt_string_deobfuscation(raw)

    if detections.get("control_flow_obfuscation", {}).get("detected"):
        results["control_flow_obfuscation"] = explain_cfo_limitations()

    if detections.get("junk_code", {}).get("detected"):
        results["junk_code"] = explain_junk_code()

    if detections.get("anti_debugging", {}).get("detected"):
        with open(file_path, "rb") as f:
            raw = f.read()
        results["anti_debugging"] = attempt_anti_debug_patch(raw, file_path)

    return results


# ── Packing ────────────────────────────────────────────────────────────────────

def attempt_unpack(file_path: str) -> dict:
    """
    Attempt to unpack using UPX (most common packer).
    Tries upx -d on the file. If upx is not installed, reports it gracefully.
    """
    upx_path = shutil.which("upx")

    if not upx_path:
        return {
            "status": "skipped",
            "message": "UPX is not installed on this system. Install UPX and add it to PATH to enable automatic unpacking.",
            "manual_steps": [
                "Download UPX from https://upx.github.io/",
                "Add upx.exe to your PATH",
                "Run: upx -d <your_binary> -o <output_binary>"
            ]
        }

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".exe") as tmp_out:
            out_path = tmp_out.name

        result = subprocess.run(
            [upx_path, "-d", file_path, "-o", out_path],
            capture_output=True,
            text=True,
            timeout=30
        )

        if result.returncode == 0:
            size_before = os.path.getsize(file_path)
            size_after = os.path.getsize(out_path)
            os.unlink(out_path)
            return {
                "status": "success",
                "message": "Binary successfully unpacked with UPX.",
                "size_before_bytes": size_before,
                "size_after_bytes": size_after,
                "size_reduction_percent": round((1 - size_after / size_before) * 100, 2),
            }
        else:
            os.unlink(out_path)
            stderr = result.stderr.strip()
            return {
                "status": "failed",
                "message": f"UPX unpacking failed — binary may use a modified or non-UPX packer.",
                "upx_output": stderr,
                "manual_steps": [
                    "Try unpacking manually in a sandboxed VM",
                    "Use dynamic analysis: run the binary and dump memory after unpacking stub executes",
                    "Tools: x64dbg + Scylla for manual unpacking"
                ]
            }
    except subprocess.TimeoutExpired:
        return {"status": "timeout", "message": "UPX unpacking timed out after 30 seconds."}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ── String Deobfuscation ───────────────────────────────────────────────────────

def attempt_string_deobfuscation(raw: bytes) -> dict:
    """
    Attempt multiple string decoding strategies:
    1. XOR brute force (single-byte keys)
    2. Base64 decode
    3. ROT13
    Returns all successfully decoded strings per method.
    """
    results = {}

    results["xor_brute_force"] = xor_brute_force(raw)
    results["base64_decoded"] = base64_decode_strings(raw)
    results["rot13_decoded"] = rot13_decode_strings(raw)

    total = (
        len(results["xor_brute_force"]["decoded_strings"])
        + len(results["base64_decoded"]["decoded_strings"])
        + len(results["rot13_decoded"]["decoded_strings"])
    )

    return {
        "status": "completed",
        "total_decoded_strings": total,
        "methods": results,
    }


def xor_brute_force(raw: bytes) -> dict:
    """
    Try all 255 single-byte XOR keys.
    For each key, XOR every byte and check if result contains readable ASCII strings.
    Return strings found per key (only keys that yield readable output).
    """
    MIN_STRING_LEN = 6
    READABILITY_THRESHOLD = 0.6  # 60% printable chars to count as readable

    results = []

    for key in range(1, 256):  # skip key 0 (XOR with 0 = no change)
        decoded = bytes([b ^ key for b in raw])
        # Extract readable strings from decoded output
        pattern = rb"[ -~]{" + str(MIN_STRING_LEN).encode() + rb",}"
        strings = re.findall(pattern, decoded)
        strings = [s.decode("ascii", errors="ignore") for s in strings]

        # Filter to strings that look meaningful (not just noise)
        meaningful = [
            s for s in strings
            if sum(1 for c in s if c.isalpha()) / max(len(s), 1) >= READABILITY_THRESHOLD
        ]

        if meaningful:
            results.append({
                "key": hex(key),
                "strings_found": meaningful[:10]  # cap at 10 per key
            })

    return {
        "method": "XOR single-byte brute force",
        "keys_tried": 255,
        "keys_with_results": len(results),
        "decoded_strings": results[:20],  # cap output at 20 keys
        "note": "Results show strings found when XORing entire binary with each key. Look for keys producing the most meaningful output."
    }


def base64_decode_strings(raw: bytes) -> dict:
    """
    Find Base64-like patterns in the binary and attempt to decode them.
    """
    pattern = re.compile(rb"[A-Za-z0-9+/]{20,}={0,2}")
    candidates = re.findall(pattern, raw)
    decoded = []

    for candidate in candidates:
        try:
            # Pad if needed
            padded = candidate + b"=" * (4 - len(candidate) % 4) if len(candidate) % 4 else candidate
            result = base64.b64decode(padded)
            # Only keep if result looks like readable text or contains strings
            text = result.decode("ascii", errors="ignore")
            if len(text) >= 6 and sum(1 for c in text if c.isprintable()) / len(text) > 0.7:
                decoded.append({
                    "encoded": candidate.decode("ascii", errors="ignore"),
                    "decoded": text
                })
        except Exception:
            continue

    return {
        "method": "Base64 decoding",
        "candidates_found": len(candidates),
        "decoded_strings": decoded[:30],
    }


def rot13_decode_strings(raw: bytes) -> dict:
    """
    Extract ASCII strings then apply ROT13. Filters for meaningful output.
    ROT13 is rare in malware but appears in script-based stagers.
    """
    import codecs
    ascii_strings = re.findall(rb"[A-Za-z]{6,}", raw)
    decoded = []

    for s in ascii_strings:
        try:
            text = s.decode("ascii")
            rot = codecs.encode(text, "rot_13")
            if rot.lower() != text.lower():  # skip if ROT13 of itself
                decoded.append({"original": text, "decoded": rot})
        except Exception:
            continue

    return {
        "method": "ROT13 decoding",
        "decoded_strings": decoded[:20],
    }


# ── Control Flow Obfuscation ───────────────────────────────────────────────────

def explain_cfo_limitations() -> dict:
    """
    Full automated CFG normalisation requires a disassembler engine.
    Return actionable manual guidance instead.
    """
    return {
        "status": "manual_required",
        "message": "Control flow obfuscation reversal requires dynamic disassembly and CFG reconstruction, which needs an external engine (radare2/Ghidra).",
        "what_was_detected": "High jump instruction density and/or section anomalies consistent with control flow flattening or opaque predicates.",
        "manual_steps": [
            "Open the binary in Ghidra or Cutter (free Ghidra alternative)",
            "Use Ghidra's decompiler — it partially reconstructs flattened control flow",
            "Look for a central dispatcher function (large switch/case routing execution)",
            "Use the plugin 'D-Flat' for Ghidra to automate control flow deflattening",
            "For radare2: run 'aaa' then 'agf' to generate and view the CFG"
        ]
    }


# ── Junk Code ─────────────────────────────────────────────────────────────────

def explain_junk_code() -> dict:
    """
    Junk code removal requires semantic analysis — explain what was found and how to proceed.
    """
    return {
        "status": "manual_required",
        "message": "Automatic junk code removal requires semantic analysis beyond static byte inspection.",
        "what_was_detected": "File size, import count, and jump density ratios are consistent with junk/dead code insertion.",
        "manual_steps": [
            "Open binary in Ghidra and use the decompiler to identify unreachable blocks",
            "Look for NOP sleds (sequences of 0x90 bytes) — these are pure padding",
            "Unreachable branches (always-false conditions) appear as dead code in the decompiler",
            "Use binary diffing against a known clean version if available"
        ]
    }


# ── Anti-Debugging Patch ───────────────────────────────────────────────────────

def attempt_anti_debug_patch(raw: bytes, file_path: str) -> dict:
    """
    Patch known anti-debug API calls by replacing them with NOPs or stub returns.
    This is done on a copy — original file is never modified.

    Strategy: find import table entries for known anti-debug APIs.
    Rather than binary patching (risky without disassembler), we report
    exactly what was found and provide patch guidance.
    """
    import pefile

    try:
        pe = pefile.PE(data=raw)
    except Exception as e:
        return {"status": "error", "message": str(e)}

    found_apis = []
    if hasattr(pe, "DIRECTORY_ENTRY_IMPORT"):
        for entry in pe.DIRECTORY_ENTRY_IMPORT:
            for imp in entry.imports:
                if imp.name:
                    name = imp.name.decode(errors="ignore")
                    from analyzer.features import ANTI_DEBUG_APIS
                    if name in ANTI_DEBUG_APIS:
                        found_apis.append({
                            "api": name,
                            "dll": entry.dll.decode(errors="ignore"),
                            "address": hex(imp.address) if imp.address else "N/A"
                        })

    if not found_apis:
        return {
            "status": "none_found",
            "message": "No patchable anti-debug API imports found in import table."
        }

    return {
        "status": "identified",
        "message": f"Found {len(found_apis)} anti-debug API import(s). Automatic NOP-patching is not applied (requires disassembler to locate call sites safely).",
        "identified_apis": found_apis,
        "patch_guidance": [
            "Load the binary in x64dbg",
            "Set breakpoints on each identified API",
            "When breakpoint hits, NOP out the call instruction (replace bytes with 0x90)",
            "Alternatively: use x64dbg's 'Patch' feature to permanently patch the executable",
            "For IsDebuggerPresent: patch the return value to always return 0 (not debugging)"
        ]
    }
