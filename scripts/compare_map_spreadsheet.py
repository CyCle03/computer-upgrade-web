#!/usr/bin/env python3
"""Compare map-extracted numbers vs spreadsheet part prices vs income rewards."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT / "scripts" / "_vendor"))

from extract_scx_strings import decompress_scenario_chk
from mpyq import MPQArchive

PARTS: list[tuple[str, str, int]] = [
    ("CPU Intel", "1강 Core i5-760", 1),
    ("CPU Intel", "4강 Core i5-4670K", 30),
    ("CPU Intel", "7강 Core i5-7600K", 3500),
    ("CPU Intel", "10강 Core i5-10600K", 2_000_000),
    ("CPU Intel", "11강 Core i5-11600K", 40_000_000),
    ("CPU AMD", "1강 Ryzen 1600X", 25_000),
    ("CPU AMD", "3강 Ryzen 3600X", 2_000_000),
    ("GPU", "1강 GeForce 200", 10),
    ("GPU", "3강 GeForce 500", 400),
    ("GPU", "5강 GeForce 700", 50_000),
    ("GPU", "7강 GeForce 10", 20_000_000),
    ("RAM", "1강 DDR3", 5),
    ("RAM", "5강 DDR4", 1_000),
    ("RAM", "10강 DDR5", 20_000_000),
    ("Cooler", "공랭 1강", 500),
    ("Cooler", "수랭 1강", 300_000),
    ("HDD", "1강", 50_000),
    ("NVMe", "1강", 3_000_000),
    ("Mobo", "P55", 1),
    ("Mobo", "B75", 10),
    ("Mobo", "H87", 150),
    ("Mobo", "H270", 3_000),
    ("Mobo", "H370/A320", 100_000),
    ("Mobo", "Z390", 1_500_000),
    ("Mobo", "H570/B550", 20_000_000),
    ("Mobo", "Z590/X570", 300_000_000),
    ("Mobo", "H770", 5_000_000_000),
    ("Mobo", "Z790/X670E", 25_000_000_000),
    ("램슬롯", "2슬롯", 5_000),
    ("램슬롯", "4슬롯", 500_000),
]

INCOME: list[tuple[str, str, int]] = [
    ("작업 처치", "문서작업", 1),
    ("작업 처치", "PPT", 2),
    ("작업 처치", "포토샵", 5),
    ("작업 처치", "간단편집", 8),
    ("작업 처치", "2D그래픽", 10),
    ("작업 처치", "간단AI", 30),
    ("작업 처치", "3D그래픽", 50),
    ("작업 처치", "전문편집", 100),
    ("작업 처치", "고AI", 200),
    ("작업 처치", "초고그", 350),
    ("작업 처치", "렌더", 500),
    ("게임 처치", "대항해", 1),
    ("게임 처치", "심시티/SC2", 100),
    ("게임 처치", "다크소울", 2_500),
    ("게임 처치", "사이버펑크", 10_000),
    ("게임 처치", "롤", 30_000),
    ("게임 처치", "FIFA", 250_000),
    ("게임 처치", "배그", 5_000_000),
    ("파티 틱(원)", "1-1", 30),
    ("파티 틱(원)", "1-2", 300),
    ("파티 틱(원)", "1-3", 3_500),
    ("파티 틱(원)", "1-4", 50_000),
    ("파티 틱(원)", "1-5", 750_000),
    ("파티 틱(원)", "1-6", 1_500_000),
    ("파티 틱(원)", "2-1", 1),
    ("파티 틱(원)", "2-2", 100),
    ("파티 틱(원)", "2-3", 2_500),
    ("파티 틱(코인)", "1-1", 2),
    ("파티 틱(코인)", "1-2", 20),
    ("파티 틱(코인)", "1-3", 200),
    ("파티 틱(코인)", "1-4", 2_000),
    ("파티 틱(코인)", "1-5", 5_000),
    ("파티 틱(코인)", "1-6", 40_000),
    ("파티 틱(코인)", "2-1", 20),
    ("파티 틱(코인)", "2-2", 500),
    ("파티 틱(코인)", "2-3", 7_500),
]

WORK_NAMES = [
    "간단한 문서작업", "PPT 제작", "포토샵", "간단한 편집", "2D 그래픽 작업",
    "간단한 AI 작업", "3D 그래픽 작업", "전문 편집", "고사양 AI 작업",
    "초고사양 그래픽작업", "대규모 렌더링 작업",
]
GAME_NAMES = [
    "대항해시대", "심시티 2000", "스타크래프트", "다크", "사이버펑크",
    "리그 오브 레전드", "피파", "배틀그라운드",
]


def tag_context(snippet: str) -> set[str]:
    tags: set[str] = set()
    if "파티" in snippet or "파티사냥" in snippet:
        tags.add("party")
    if any(w in snippet for w in WORK_NAMES):
        tags.add("work")
    if any(g in snippet for g in GAME_NAMES) or "게이밍" in snippet or "다운로드" in snippet:
        tags.add("game")
    if "SP :" in snippet or "SP:" in snippet:
        tags.add("sca_shop")
    if re.search(r"Core i5|GeForce|DDR|HDD|인텔|AMD|쿨링|강화 확률|가용 코어", snippet):
        tags.add("part_guide")
    if "1원 단위" in snippet or "1코인 단위" in snippet:
        tags.add("ui_unit")
    if not tags:
        tags.add("unknown")
    return tags


def extract_map_amounts(text: str) -> dict[int, list[dict]]:
    found: dict[int, list[dict]] = {}
    patterns = [
        re.compile(r"(\d{1,3}(?:,\d{3})+|\d+)\s*원"),
        re.compile(r"(\d{1,3}(?:,\d{3})+|\d+)\s*코인"),
    ]
    for pat in patterns:
        for m in pat.finditer(text):
            raw = m.group(0)
            n = int(re.sub(r"[^\d]", "", m.group(1)))
            start = max(0, m.start() - 100)
            end = min(len(text), m.end() + 100)
            snip = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", " ", text[start:end])
            snip = re.sub(r" +", " ", snip).strip()
            kind = "원" if "원" in raw else "코인"
            found.setdefault(n, []).append({
                "raw": raw,
                "kind": kind,
                "tags": tag_context(snip),
                "snip": snip[:140],
            })
    return found


def classify(n: int, map_tags: set[str], has_part: bool, has_income: bool) -> str:
    if "sca_shop" in map_tags:
        return "SCA 상점 SP 가격 (부품·수입 아님)"
    if "ui_unit" in map_tags:
        return "UI 표시 단위 (재화 수치 아님)"
    if "work" in map_tags and has_income and not has_part:
        return "작업 처치 보상 (맵 근접)"
    if "game" in map_tags and has_income and not has_part:
        return "게임 처치 보상 (맵 근접)"
    if "party" in map_tags and has_income:
        return "파티 틱 수입 (맵 근접)"
    if "part_guide" in map_tags and has_part:
        return "부품 가이드/상점 (스프레드시트 부품가)"
    if has_part and has_income:
        if "party" in map_tags or "game" in map_tags or "work" in map_tags:
            return f"수입 보상 (맵 맥락 우선) — 동일 숫자가 부품가에도 존재"
        return "동일 숫자 · 맵 맥락 불명 — 부품가·수입 둘 다 가능"
    if has_part:
        return "스프레드시트 부품 구매가 (맵 문자열에 직접 없을 수 있음)"
    if has_income:
        return "수입 보상 (코드/가이드 — 맵에 N원 미부착)"
    return "부품·수입 목록 밖 (맵 전용 또는 미분류)"


def main() -> None:
    scx = next(ROOT.glob("*.scx"))
    archive = MPQArchive(str(scx), listfile=False)
    text = decompress_scenario_chk(archive).decode("cp949", errors="replace")
    map_amounts = extract_map_amounts(text)

    part_by_n: dict[int, list] = {}
    for cat, name, n in PARTS:
        part_by_n.setdefault(n, []).append((cat, name))
    income_by_n: dict[int, list] = {}
    for cat, name, n in INCOME:
        income_by_n.setdefault(n, []).append((cat, name))

    all_nums = sorted(set(map_amounts) | set(part_by_n) | set(income_by_n))

    lines: list[str] = []
    lines.append("# 맵 추출 vs 스프레드시트 부품가 vs 수입 보상 비교")
    lines.append("")
    lines.append("## 요약")
    lines.append("")
    overlap_both = []
    map_only = []
    for n in all_nums:
        in_map = n in map_amounts
        hp = n in part_by_n
        hi = n in income_by_n
        if in_map and hp and hi:
            overlap_both.append(n)
        elif in_map and not hp and not hi:
            map_only.append(n)

    lines.append(f"- 맵 SCX에서 `N원`/`N코인` 패턴으로 잡힌 고유 숫자: **{len(map_amounts)}**개")
    lines.append(f"- 스프레드시트 부품가(비영): **{len(part_by_n)}**개")
    lines.append(f"- 작업·게임·파티 수입(코드): **{len(income_by_n)}**개")
    lines.append(f"- **맵+부품+수입 삼중 겹침** (맥락 구분 필요): {', '.join(str(x) for x in overlap_both) or '없음'}")
    lines.append("")

    lines.append("## 작업 건물 — 맵에 금액 없음")
    lines.append("")
    combined = []
    pat = re.compile(
        r"(간단한 문서작업|PPT 제작|포토샵|간단한 편집|2D 그래픽 작업|간단한 AI 작업|"
        r"3D 그래픽 작업|전문 편집|고사양 AI 작업|초고사양 그래픽작업|대규모 렌더링 작업)"
        r".{0,40}(\d[\d,]*\s*(?:원|코인))"
    )
    for m in pat.finditer(text):
        s = re.sub(r"[\x00-\x1f]", " ", m.group()).strip()
        if "\ufffd" not in s:
            combined.append(s)
    if combined:
        lines.extend(f"- `{c}`" for c in combined)
    else:
        lines.append("- **맵에 `작업명 + N원` 결합 문자열 없음** — `[NGB]` RAM만 있음")
        for m in re.finditer(
            r"(간단한 문서작업|PPT 제작|포토샵|간단한 편집|2D 그래픽 작업|간단한 AI 작업|"
            r"3D 그래픽 작업|전문 편집|고사양 AI 작업|초고사양 그래픽작업|대규모 렌더링 작업)\s*\[[0-9]+GB\]",
            text,
        ):
            s = re.sub(r"[\x00-\x1f]", "", m.group()).strip()
            lines.append(f"- `{s}`")
    lines.append("")
    lines.append("→ 작업 `mineralPerUnit`(1~500)은 **스프레드시트·맵 문자열 모두 없음** (EUD/가이드 역추적)")
    lines.append("")

    lines.append("## 숫자별 상세")
    lines.append("")
    lines.append("| 숫자 | 맵 맥락 | 스프레드시트 부품 | 수입 보상 | 판정 |")
    lines.append("|------|---------|-------------------|-----------|------|")

    for n in all_nums:
        if n not in map_amounts and n not in (part_by_n.keys() & income_by_n.keys()):
            if n not in map_amounts:
                continue
        map_tags: set[str] = set()
        map_raw: list[str] = []
        for item in map_amounts.get(n, [])[:5]:
            map_tags.update(item["tags"])
            map_raw.append(f"{item['raw']}({','.join(sorted(item['tags']))})")
        hp = part_by_n.get(n, [])
        hi = income_by_n.get(n, [])
        verdict = classify(n, map_tags, bool(hp), bool(hi))
        part_s = "; ".join(f"{c} {nm}" for c, nm in hp) or "—"
        inc_s = "; ".join(f"{c} {nm}" for c, nm in hi) or "—"
        map_s = ", ".join(map_raw[:3]) if map_raw else "—"
        lines.append(f"| {n:,} | {map_s} | {part_s} | {inc_s} | {verdict} |")

    lines.append("")
    lines.append("## 맵에만 있고 스프레드시트·수입 코드에 없는 숫자")
    lines.append("")
    for n in sorted(map_amounts):
        if n not in part_by_n and n not in income_by_n:
            ex = map_amounts[n][0]
            lines.append(f"- **{n:,}** `{ex['raw']}` — tags: {', '.join(sorted(ex['tags']))}")

    out = ROOT / "scripts" / "_map_vs_spreadsheet.txt"
    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {out}")
    print("\n".join(lines[:40]))


if __name__ == "__main__":
    main()
