#!/usr/bin/env python3
"""Find proximity between work building names and won/coin amounts in SCX."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT / "scripts" / "_vendor"))

from extract_scx_strings import decompress_scenario_chk
from mpyq import MPQArchive

WORK = [
    "간단한 문서작업", "PPT 제작", "포토샵", "간단한 편집", "2D 그래픽 작업",
    "간단한 AI 작업", "3D 그래픽 작업", "전문 편집", "고사양 AI 작업",
    "초고사양 그래픽작업", "대규모 렌더링 작업",
]
GAMES = [
    "대항해시대", "심시티 2000", "둠", "스타크래프트 8K 게이밍", "사이버펑크 2077",
    "리그 오브 레전드", "피파 온라인", "배틀그라운드", "포르자 호라이즌 5",
]
AMOUNTS = [
    "1원", "2원", "5원", "8원", "10원", "30원", "50원", "100원", "200원", "350원", "500원",
    "100원", "2,500원", "10,000원", "30,000원", "250,000원", "5,000,000원",
    "1코인", "2코인", "20코인", "500코인",
]


def find_proximity(text: str, names: list[str], window: int = 200) -> list[str]:
    out: list[str] = []
    for name in names:
        for m in re.finditer(re.escape(name), text):
            start = max(0, m.start() - window)
            end = min(len(text), m.end() + window)
            chunk = text[start:end]
            chunk_clean = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "|", chunk)
            hits = [a for a in AMOUNTS if a in chunk_clean]
            if hits:
                out.append(f"{name} -> near {hits}: ...{chunk_clean}...")
    return out


def find_combined_labels(text: str) -> list[str]:
    """Labels like '포토샵 5원' or '포토샵 +5원'."""
    out: list[str] = []
    pat = re.compile(
        r"(간단한 문서작업|PPT 제작|포토샵|간단한 편집|2D 그래픽 작업|간단한 AI 작업|"
        r"3D 그래픽 작업|전문 편집|고사양 AI 작업|초고사양 그래픽작업|대규모 렌더링 작업|"
        r"대항해시대|심시티 2000|둠|스타크래프트 8K 게이밍|사이버펑크 2077|"
        r"리그 오브 레전드|피파 온라인|배틀그라운드)"
        r".{0,30}(\d[\d,]*\s*(?:원|코인))",
    )
    for m in pat.finditer(text):
        s = re.sub(r"[\x00-\x1f]", " ", m.group()).strip()
        if "\ufffd" not in s:
            out.append(s)
    return out


def main() -> None:
    scx = next(ROOT.glob("*.scx"))
    archive = MPQArchive(str(scx), listfile=False)
    raw = decompress_scenario_chk(archive)
    text = raw.decode("cp949", errors="replace")
    lines: list[str] = []

    lines.append("=== Combined name+amount regex ===")
    combined = find_combined_labels(text)
    if combined:
        lines.extend(combined)
    else:
        lines.append("(none found)")

    lines.append("\n=== Work name within 200 chars of amount ===")
    prox = find_proximity(text, WORK, 200)
    if prox:
        lines.extend(prox[:30])
    else:
        lines.append("(none)")

    lines.append("\n=== Game name within 200 chars of amount ===")
    prox_g = find_proximity(text, GAMES, 200)
    if prox_g:
        lines.extend(prox_g[:30])
    else:
        lines.append("(none)")

    lines.append("\n=== All unique [NGB] work labels ===")
    for m in re.finditer(
        r"(간단한 문서작업|PPT 제작|포토샵|간단한 편집|2D 그래픽 작업|간단한 AI 작업|"
        r"3D 그래픽 작업|전문 편집|고사양 AI 작업|초고사양 그래픽작업|대규모 렌더링 작업)"
        r"\s*\[[0-9]+GB\]",
        text,
    ):
        s = re.sub(r"[\x00-\x1f]", "", m.group()).strip()
        if s not in lines:
            lines.append(s)

    lines.append("\n=== Map unit/location names with 원 (extended search) ===")
    seen: set[str] = set()
    for m in re.finditer(r"[^\x00\n\r]{3,80}\d[\d,]*\s*원", text):
        s = re.sub(r"[\x00-\x1f]", " ", m.group()).strip()
        if "Upgrade" in s or "Research" in s or "\ufffd" in s:
            continue
        if s in seen:
            continue
        seen.add(s)
        lines.append(s)

    out = ROOT / "scripts" / "_work_proximity.txt"
    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
