#!/usr/bin/env python3
"""Extract work/gaming building income strings from SCX scenario.chk."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT / "scripts" / "_vendor"))

from extract_scx_strings import decompress_scenario_chk  # noqa: E402
from mpyq import MPQArchive  # noqa: E402

BLIZZARD_NOISE = (
    "Upgrade", "Research", "Evolve", "Develop", "Infantry", "Vehicle", "Ship",
    "Flyer", "Ground", "Air", "Plasma", "Khaydarin", "Moebius", "Apollo",
    "Colossus", "Singularity", "Gravitic", "Sensor Array", "Metabolic",
    "Adrenal", "Muscular", "Grooved", "Gamete", "Metasynaptic", "Carapace",
    "Plating", "Thrusters", "Burst Lasers", "Titan Reactor", "Ocular",
    "Ventral", "Antennae", "Pneumatized", "Scarab", "Overlord", "Hydralisk",
    "Zergling", "Dragoon", "Zealot", "Observer", "Shuttle", "Reaver",
    "Battlecruiser", "Wraith", "Ghost", "Science Vessel", "Vulture", "Marine",
)


def is_readable(s: str) -> bool:
    if not s or "\ufffd" in s:
        return False
    ok = sum(1 for c in s if c.isalnum() or c in " .,:;+-[]()/|_%#'\"가-힣원코인GB")
    return ok / max(len(s), 1) >= 0.7


def main() -> None:
    scx = next(ROOT.glob("*.scx"))
    archive = MPQArchive(str(scx), listfile=False)
    raw = decompress_scenario_chk(archive)
    text = raw.decode("cp949", errors="replace")
    out = ROOT / "scripts" / "_work_extract.txt"
    lines: list[str] = []
    lines.append(f"SCX: {scx.name}")
    lines.append(f"bytes: {len(raw)}")

    keywords = [
        "작업", "문서", "PPT", "포토", "편집", "그래픽", "AI", "렌더", "게이밍",
        "사냥", "대항해", "심시티", "스타크래", "다크", "사이버", "리그", "FIFA",
        "배틀", "Mining", "Work", "Gaming", "8K",
    ]
    lines.append("\n=== Lines: keyword + digit ===")
    seen: set[str] = set()
    for part in re.split(r"[\x00\r\n]+", text):
        p = part.strip()
        if len(p) < 3 or len(p) > 300:
            continue
        if not any(k in p for k in keywords):
            continue
        if not re.search(r"\d", p):
            continue
        if not is_readable(p):
            continue
        if p in seen:
            continue
        seen.add(p)
        lines.append(p)

    lines.append("\n=== won / coin patterns ===")
    seen2: set[str] = set()
    for m in re.finditer(
        r"[^\x00]{2,100}\d[\d,]*\s*원|[^\x00]{2,100}\d[\d,]*\s*코인",
        text,
    ):
        s = re.sub(r"\s+", " ", m.group().replace("\x00", " ")).strip()
        if any(x in s for x in BLIZZARD_NOISE):
            continue
        if not is_readable(s):
            continue
        if s in seen2:
            continue
        seen2.add(s)
        lines.append(s)
    lines.append(f"total won/coin hits: {len(seen2)}")

    for marker in ("00 2. 작업 과 게이밍", "작업 과 게이밍", "00 2.", "작업 / 게이밍"):
        idx = text.find(marker)
        if idx >= 0:
            lines.append(f"\n=== Block after: {marker} ===")
            block = text[idx : idx + 12000]
            block = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "\n", block)
            for ln in block.split("\n"):
                ln = ln.strip()
                if ln and is_readable(ln) and len(ln) < 250:
                    lines.append(ln)
            break

    lines.append("\n=== Context around work/game names ===")
    work_names = [
        "간단한 문서", "PPT", "포토", "편집", "그래픽", "AI 작업", "렌더",
        "대항해", "심시티", "스타크래", "다크 소울", "사이버", "리그",
        "FIFA", "배그", "배틀그", "문서작업", "2D", "3D",
    ]
    for name in work_names:
        count = 0
        for m in re.finditer(re.escape(name), text):
            ctx = text[max(0, m.start() - 100) : m.start() + 150]
            ctx = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "|", ctx)
            if is_readable(ctx):
                lines.append(f"[{name}] {ctx}")
                count += 1
            if count >= 5:
                break

    lines.append("\n=== Standalone N원 / N코인 (short) ===")
    for m in re.finditer(r"(?<![\d])(\d{1,3}(?:,\d{3})*)\s*원(?!\w)", text):
        val = m.group(0).strip()
        if val not in seen2 and len(val) < 20:
            lines.append(val)
    for m in re.finditer(r"(?<![\d])(\d{1,3}(?:,\d{3})*)\s*코인(?!\w)", text):
        val = m.group(0).strip()
        if val not in seen2 and len(val) < 20:
            lines.append(val)

    lines.append("\n=== UTF-16-LE search: 작업 ===")
    text16 = raw.decode("utf-16-le", errors="ignore")
    for part in re.split(r"[\x00\r\n]+", text16):
        p = part.strip()
        if "작업" in p or "문서" in p or "포토" in p:
            if re.search(r"\d", p) and len(p) < 200:
                lines.append(f"[utf16] {p}")

    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {out} ({len(lines)} lines)")


if __name__ == "__main__":
    main()
