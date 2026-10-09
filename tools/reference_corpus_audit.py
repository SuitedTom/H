#!/usr/bin/env python3
"""Read-only, conservative forensic inventory of Stick Nodes .stknds files.

This inventories container integrity, length-prefixed names, parseable v334 node assets,
polyfills, and audio filename strings. It deliberately does NOT claim that an embedded
asset is visible in a particular frame or that an unknown timeline record is decoded.
"""
from __future__ import annotations
import argparse, gzip, hashlib, json, math, re, struct
from collections import Counter
from pathlib import Path

MAGIC = bytes(range(1, 10))
ALLOWED = set(" _().,'&!+-[]{}#")
AUDIO_EXTS = {".mp3", ".wav", ".ogg", ".m4a", ".aac"}
TAGS = {
    "character_rig": r"\b(stickfigure|base stick|base|fighter|goku|naruto|sasuke|male|girl|zel|tricking|man|doman|freezer|vege|body base|body arm|fullbody)\b",
    "background_environment": r"\b(background|bg|void|floor|ground|city|mountain|forest|planet|house|couch|wall|room|tree|stage)\b",
    "motion_effect": r"\b(punch|impact|hit|slash|smear|dash|flash|claw|blood|sword|spark|flare|beam|energy|explosion|crack|teleport|aura|transform|electric|whoosh|dust|smoke|wind|light|effect|efecto|zoom|trail|shockwave|blast|fire|lightning|speed lines)\b",
    "prop_weapon": r"\b(sword|katana|weapon|tool|ball|rock|couch|blade|hilt|staff|gun|hand|crater)\b",
}

def node(data: bytes, pos: int, version: int = 334, depth: int = 0):
    """Parse the v334 node grammar and return (node summary, next byte)."""
    if depth > 400:
        raise ValueError("node recursion too deep")
    start = pos
    def take(fmt):
        nonlocal pos
        size = struct.calcsize(fmt)
        if pos + size > len(data):
            raise ValueError("truncated node")
        value = struct.unpack_from(fmt, data, pos)[0]
        pos += size
        return value
    typ = take(">b"); take(">i")
    take(">B"); take(">B")
    if version >= 248: take(">B")
    if version >= 252: take(">B")
    take(">B")
    if version >= 256: take(">B")
    if version >= 176: take(">B"); take(">B")
    take(">B")
    lx, ly, scale, default_len, length = [take(">f") for _ in range(5)]
    take(">i"); thick = take(">i")
    if version >= 320: take(">i")
    if version >= 256: take(">B"); take(">h")
    if version >= 300: take(">B")
    if version >= 256: take(">f"); take(">h")
    if version >= 248: take(">f")
    angle = take(">f")
    if version >= 248: take(">f")
    pos += 4
    if version >= 176: pos += 4
    if version >= 256: pos += 4
    if pos > len(data): raise ValueError("truncated node colors")
    children = take(">i")
    if not 0 <= children <= 400: raise ValueError("implausible child count")
    counts = Counter({str(typ): 1})
    for _ in range(children):
        child, pos = node(data, pos, version, depth + 1)
        counts.update(child["types"])
    return {"types": dict(counts), "length": length, "thickness": thick,
            "local_x": lx, "local_y": ly, "angle": angle, "bytes": pos-start}, pos

def parse_asset(data: bytes, pos: int):
    version = struct.unpack_from(">i", data, pos)[0]; pos += 4
    if not 160 <= version <= 402: raise ValueError("unsupported asset version")
    scale = struct.unpack_from(">f", data, pos)[0]; pos += 4
    color = list(data[pos:pos+4]); pos += 4
    root, pos = node(data, pos, version)
    poly_count = struct.unpack_from(">i", data, pos)[0]; pos += 4
    if not 0 <= poly_count <= 10000: raise ValueError("implausible polyfill count")
    for _ in range(poly_count):
        if pos + 9 > len(data): raise ValueError("truncated polyfill")
        pos += 4 + 4 + 1
        n = struct.unpack_from(">i", data, pos)[0]; pos += 4
        if not 0 <= n <= 10000: raise ValueError("implausible polyfill attachment count")
        pos += 4*n
        if pos > len(data): raise ValueError("truncated polyfill attachments")
    return {"version": version, "scale": scale, "color_bytes_rgba": color,
            "node_count": sum(root["types"].values()), "node_type_counts": root["types"],
            "polyfill_count": poly_count, "root": {k:v for k,v in root.items() if k != "types"}}, pos

def strings(data: bytes):
    for m in re.finditer(rb"[\x20-\x7e]{4,}", data):
        yield m.start(), m.group().decode("ascii", "replace")

def audit(path: Path):
    raw = path.read_bytes()
    out = {"file": path.name, "file_bytes": len(raw),
           "sha256": hashlib.sha256(raw).hexdigest()}
    if not raw.startswith(MAGIC):
        out["container_status"] = "bad-prefix"
        return out
    try: data = gzip.decompress(raw[9:])
    except Exception as exc:
        out.update(container_status="gzip-failed", error=str(exc))
        return out
    out.update(container_status="gzip-ok", payload_bytes=len(data),
               payload_sha256=hashlib.sha256(data).hexdigest())
    if len(data) >= 8:
        version, name_len = struct.unpack_from(">ii", data, 0)
        title = data[8:8+name_len].decode("utf8", "replace") if 0 <= name_len <= 512 else ""
        out.update(header_version_candidate=version, title_candidate=title)
    runs = list(strings(data))
    out["audio_filename_candidates"] = [s for _,s in runs if Path(s).suffix.lower() in AUDIO_EXTS]
    candidates = []
    for off in range(0, len(data)-12):
        n = struct.unpack_from(">i", data, off)[0]
        if not 1 <= n <= 160 or off+4+n+4 > len(data): continue
        raw_name = data[off+4:off+4+n]
        if not all(32 <= c <= 126 for c in raw_name): continue
        name = raw_name.decode("ascii", "replace")
        if not any(c.isalpha() for c in name) or not all(c.isalnum() or c in ALLOWED for c in name): continue
        pos = off+4+n
        if struct.unpack_from(">i", data, pos)[0] != 334: continue
        try:
            asset, end = parse_asset(data, pos)
            if end <= pos or end > len(data): continue
        except (ValueError, struct.error, OverflowError, RecursionError):
            continue
        tags = [tag for tag,pattern in TAGS.items() if re.search(pattern, name, re.I)]
        candidates.append({"label_offset": off, "name": name, "version_offset": pos,
            "end_offset": end, "bytes": end-pos, "node_count": asset["node_count"],
            "node_type_counts": asset["node_type_counts"], "polyfill_count": asset["polyfill_count"],
            "scale": asset["scale"], "color_bytes_rgba": asset["color_bytes_rgba"],
            "root_geometry": asset["root"], "name_based_tags": tags})
    # Retain candidate overlaps/nesting; do not pretend these are all unique top-level assets.
    out["asset_candidates"] = candidates
    out["asset_summary"] = {
        "parseable_candidates": len(candidates),
        "candidate_nodes_sum": sum(a["node_count"] for a in candidates),
        "candidate_polyfills_sum": sum(a["polyfill_count"] for a in candidates),
        "overlapping_candidates": sum(1 for i,a in enumerate(sorted(candidates,key=lambda x:x["label_offset"]))
            if i and a["label_offset"] < sorted(candidates,key=lambda x:x["label_offset"])[i-1]["end_offset"]),
        "name_tag_counts": dict(Counter(t for a in candidates for t in a["name_based_tags"]))}
    # Conservative scene/object header probes from ALL length-prefixed printable strings.
    # These fields remain candidates until matched against controlled frame edits.
    scene_candidates = []
    for off, name in runs:
        if off < 0 or off + 4 > len(data): continue
        n = struct.unpack_from(">i", data, off - 4)[0] if off >= 4 else -1
        if n != len(name.encode("ascii", "replace")): continue
        after = off + len(name.encode("ascii", "replace"))
        if after + 22 > len(data): continue
        try:
            a, b, c, d = struct.unpack_from(">iiii", data, after)
            count = struct.unpack_from(">H", data, after + 16)[0]
            value = struct.unpack_from(">f", data, after + 18)[0]
        except struct.error:
            continue
        plausible = (0 <= a <= 1000 and 0 <= b <= 10000 and
                     0 <= c <= 1000 and 0 <= d <= 1000 and
                     1 <= count <= 10000 and math.isfinite(value) and -100 <= value <= 100)
        if plausible:
            scene_candidates.append({"label_offset": off - 4, "name": name,
                "candidate_i32_fields": [a, b, c, d], "candidate_u16": count,
                "candidate_f32": round(value, 6),
                "interpretation": "unconfirmed scene/object header hypothesis"})
    out["scene_object_header_candidates"] = scene_candidates
    out["evidence_limit"] = "Asset candidates and scene/object header probes are hypotheses; frame/object transforms, timeline order, visibility, layer order, camera motion, and audio/effect timing are not decoded."
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("paths", nargs="*", help="files to audit; defaults to *.stknds in current directory")
    ap.add_argument("--out", default="reference_corpus_forensics.json")
    args = ap.parse_args()
    paths = [Path(x) for x in args.paths] if args.paths else sorted(Path(".").glob("*.stknds"))
    projects = [audit(p) for p in paths]
    report = {"schema_version": 1, "project_count": len(projects),
        "valid_gzip_count": sum(p.get("container_status") == "gzip-ok" for p in projects),
        "compressed_bytes_sum": sum(p.get("file_bytes",0) for p in projects),
        "payload_bytes_sum": sum(p.get("payload_bytes",0) for p in projects),
        "interpretation_policy": "Candidate counts and name-based tags are leads for investigation, not proof of visual use or motion semantics.",
        "projects": projects}
    Path(args.out).write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf8")
    print(f"Audited {len(projects)} files; valid gzip={report['valid_gzip_count']}; output={args.out}")
if __name__ == "__main__": main()
