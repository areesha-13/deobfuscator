import math
import re
import pefile


# ── Entropy ────────────────────────────────────────────────────────────────────

def calculate_entropy(data: bytes) -> float:
    """Shannon entropy of a byte string. Range: 0.0 (uniform) to 8.0 (random)."""
    if not data:
        return 0.0
    freq = [0] * 256
    for byte in data:
        freq[byte] += 1
    entropy = 0.0
    length = len(data)
    for count in freq:
        if count > 0:
            p = count / length
            entropy -= p * math.log2(p)
    return round(entropy, 4)


def get_section_entropies(pe: pefile.PE) -> list:
    """Return list of dicts with section name, entropy, and size."""
    sections = []
    for section in pe.sections:
        name = section.Name.decode(errors="replace").strip("\x00")
        data = section.get_data()
        entropy = calculate_entropy(data)
        sections.append({
            "name": name,
            "entropy": entropy,
            "virtual_size": section.Misc_VirtualSize,
            "raw_size": section.SizeOfRawData,
        })
    return sections


# ── Strings ────────────────────────────────────────────────────────────────────

def extract_strings(data: bytes, min_length: int = 4) -> list:
    """Extract printable ASCII strings from raw bytes."""
    pattern = rb"[ -~]{" + str(min_length).encode() + rb",}"
    return [s.decode("ascii", errors="ignore") for s in re.findall(pattern, data)]


def extract_wide_strings(data: bytes, min_length: int = 4) -> list:
    """Extract UTF-16LE (wide) strings — common in Windows PE files."""
    pattern = rb"(?:[ -~]\x00){" + str(min_length).encode() + rb",}"
    matches = re.findall(pattern, data)
    return [m.decode("utf-16-le", errors="ignore") for m in matches]


def string_ratio(data: bytes) -> float:
    """Ratio of printable ASCII bytes to total bytes. Low = suspicious."""
    if not data:
        return 0.0
    printable = sum(1 for b in data if 32 <= b <= 126)
    return round(printable / len(data), 4)


# ── Imports ────────────────────────────────────────────────────────────────────

ANTI_DEBUG_APIS = {
    "IsDebuggerPresent",
    "CheckRemoteDebuggerPresent",
    "NtQueryInformationProcess",
    "OutputDebugStringA",
    "OutputDebugStringW",
    "FindWindowA",
    "FindWindowW",
    "GetTickCount",
    "QueryPerformanceCounter",
    "NtSetInformationThread",
    "CloseHandle",           # used to trigger exception in debugger
    "ZwQueryInformationProcess",
}

SUSPICIOUS_APIS = {
    "VirtualAlloc",
    "VirtualProtect",
    "WriteProcessMemory",
    "CreateRemoteThread",
    "LoadLibraryA",
    "LoadLibraryW",
    "GetProcAddress",
    "ShellExecuteA",
    "ShellExecuteW",
    "WinExec",
    "CreateProcessA",
    "CreateProcessW",
}


def get_imports(pe: pefile.PE) -> dict:
    """
    Returns:
        all_imports     : flat list of all imported function names
        anti_debug_hits : imported names that match anti-debug API list
        suspicious_hits : imported names that match suspicious API list
        dll_count       : number of imported DLLs
    """
    all_imports = []
    anti_debug_hits = []
    suspicious_hits = []
    dll_count = 0

    if not hasattr(pe, "DIRECTORY_ENTRY_IMPORT"):
        return {
            "all_imports": [],
            "anti_debug_hits": [],
            "suspicious_hits": [],
            "dll_count": 0,
        }

    for entry in pe.DIRECTORY_ENTRY_IMPORT:
        dll_count += 1
        for imp in entry.imports:
            if imp.name:
                name = imp.name.decode(errors="ignore")
                all_imports.append(name)
                if name in ANTI_DEBUG_APIS:
                    anti_debug_hits.append(name)
                if name in SUSPICIOUS_APIS:
                    suspicious_hits.append(name)

    return {
        "all_imports": all_imports,
        "anti_debug_hits": anti_debug_hits,
        "suspicious_hits": suspicious_hits,
        "dll_count": dll_count,
    }


# ── Packer signatures ──────────────────────────────────────────────────────────

PACKER_SIGNATURES = {
    "UPX": [b"UPX0", b"UPX1", b"UPX2", b"UPX!"],
    "MPRESS": [b"MPRESS1", b"MPRESS2"],
    "PECompact": [b"PECompact2"],
    "Themida": [b".themida"],
    "ASPack": [b".aspack", b"ASPack"],
    "FSG": [b".FSG"],
    "PESpin": [b".pespin"],
}


def detect_packer_signatures(pe: pefile.PE, raw_data: bytes) -> list:
    """Check section names and raw bytes for known packer magic bytes."""
    found = []

    # Check section names
    section_names = [
        s.Name.decode(errors="replace").strip("\x00").lower()
        for s in pe.sections
    ]

    for packer, sigs in PACKER_SIGNATURES.items():
        for sig in sigs:
            if sig.lower() in [n.encode() for n in section_names]:
                if packer not in found:
                    found.append(packer)
            if sig in raw_data:
                if packer not in found:
                    found.append(packer)

    return found


# ── Control flow heuristics ────────────────────────────────────────────────────

def jump_instruction_density(data: bytes) -> float:
    """
    Estimate jump density from raw bytes using x86 opcode patterns.
    High density suggests junk code or control flow obfuscation.
    Opcodes counted: JMP (0xEB, 0xE9), Jcc (0x70-0x7F, 0x0F 0x80-0x8F)
    """
    if not data:
        return 0.0

    jump_count = 0
    i = 0
    while i < len(data):
        b = data[i]
        # Short JMP, near JMP
        if b in (0xEB, 0xE9):
            jump_count += 1
        # Short Jcc (70-7F)
        elif 0x70 <= b <= 0x7F:
            jump_count += 1
        # Near Jcc (0F 80-8F)
        elif b == 0x0F and i + 1 < len(data) and 0x80 <= data[i + 1] <= 0x8F:
            jump_count += 1
            i += 1
        i += 1

    return round(jump_count / max(len(data), 1) * 1000, 4)  # per 1000 bytes


# ── Master feature extraction ──────────────────────────────────────────────────

def extract_all_features(file_path: str) -> dict:
    """
    Load a PE file and extract all features needed for detection.
    Returns a flat feature dict plus rich metadata for the report.
    """
    with open(file_path, "rb") as f:
        raw = f.read()

    try:
        pe = pefile.PE(data=raw)
    except pefile.PEFormatError as e:
        raise ValueError(f"Not a valid PE file: {e}")

    sections = get_section_entropies(pe)
    entropies = [s["entropy"] for s in sections]
    imports = get_imports(pe)
    strings = extract_strings(raw)
    wide_strings = extract_wide_strings(raw)
    all_strings = strings + wide_strings
    packer_sigs = detect_packer_signatures(pe, raw)
    jump_density = jump_instruction_density(raw)
    str_ratio = string_ratio(raw)

    # Numeric features for ML classifier
    features = {
        "entropy_mean": round(sum(entropies) / max(len(entropies), 1), 4),
        "entropy_max": max(entropies) if entropies else 0.0,
        "entropy_min": min(entropies) if entropies else 0.0,
        "section_count": len(sections),
        "import_count": len(imports["all_imports"]),
        "dll_count": imports["dll_count"],
        "anti_debug_count": len(imports["anti_debug_hits"]),
        "suspicious_api_count": len(imports["suspicious_hits"]),
        "string_count": len(all_strings),
        "string_ratio": str_ratio,
        "packer_signature_found": int(len(packer_sigs) > 0),
        "jump_density": jump_density,
        "file_size": len(raw),
    }

    # Rich metadata for report (not used in ML, used in output)
    metadata = {
        "sections": sections,
        "imports": imports,
        "strings_sample": all_strings[:50],  # first 50 for report
        "total_strings": len(all_strings),
        "packer_signatures": packer_sigs,
        "raw": raw,  # kept for deobfuscation step
    }

    return {"features": features, "metadata": metadata}
