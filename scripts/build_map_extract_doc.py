#!/usr/bin/env python3
"""Generate docs/map-extract-v1.2.9.md from scenario.chk strings only."""
from __future__ import annotations

import re
from datetime import date
from pathlib import Path

from extract_scx_strings import decompress_scenario_chk
from mpyq import MPQArchive

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "map-extract-v1.2.9.md"
SEP = "####################"


def load_text() -> tuple[str, bytes, str]:
    scx = next(ROOT.glob("*.scx"))
    archive = MPQArchive(str(scx), listfile=False)
    raw = decompress_scenario_chk(archive)
    text = raw.decode("cp949", errors="replace")
    return scx.name, raw, text


def clean(s: str) -> str:
    s = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", " ", s)
    s = re.sub(r" +", " ", s)
    return s.strip()


def is_readable_line(s: str) -> bool:
    """Drop CP949 decode garbage."""
    if not s or "\ufffd" in s:
        return False
    # Mostly printable Korean/Latin/digits/punctuation
    ok = sum(1 for c in s if c.isalnum() or c in " .,:;+-[]()/|_%#'\"가-힣")
    return ok / max(len(s), 1) >= 0.85


def unique_lines(text: str, min_len: int = 4, max_len: int = 500) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for part in re.split(r"[\x00\r\n]+", text):
        line = clean(part)
        if not line or len(line) < min_len or len(line) > max_len:
            continue
        if line in seen or not is_readable_line(line):
            continue
        seen.add(line)
        out.append(line)
    return out


def section_blocks(text: str) -> list[tuple[str, str]]:
    """Split on #### markers; return (title, body) pairs."""
    blocks: list[tuple[str, str]] = []
    for chunk in text.split(SEP):
        chunk = clean(chunk)
        if not chunk or len(chunk) < 8:
            continue
        # title = first ~80 chars or first sentence-like segment
        title = chunk[:120].split("  ")[0].strip()
        if len(title) > 80:
            title = title[:77] + "..."
        blocks.append((title, chunk))
    return blocks


def grep_lines(lines: list[str], pattern: str) -> list[str]:
    rx = re.compile(pattern)
    return [ln for ln in lines if rx.search(ln)]


def extract_sp_shop_lines(text: str) -> list[str]:
    found: list[str] = []
    for m in re.finditer(r"[^\x00]{0,40}SP\s*:\s*\d+[^\x00]{0,40}", text):
        line = clean(m.group())
        if line and line not in found:
            found.append(line)
    return found


def extract_guide_sections(text: str) -> list[str]:
    found: list[str] = []
    for m in re.finditer(r"00\s*\d+\.[^\x00]{0,200}", text):
        line = clean(m.group())
        if line and line not in found:
            found.append(line)
    return sorted(found)


def extract_stat_runs(text: str, label: str, limit: int = 30) -> list[str]:
    """Lines containing a stat label (e.g. 가용 코어)."""
    lines = unique_lines(text, min_len=10, max_len=200)
    hits = [ln for ln in lines if label in ln]
    return hits[:limit]


def main() -> None:
    scx_name, raw, text = load_text()
    all_lines = unique_lines(text)

    # --- curated categories (map strings only) ---
    identity = grep_lines(all_lines, r"SCA.*강화|V1\.2\.9|Ver1\.2\.9|Lukrembo")
    sca_ui = grep_lines(all_lines, r"^SCA |SCA 센터|SCA 물품|SCA 도움말|SCA 코인|SCA 상품")
    mining = grep_lines(all_lines, r"채굴|증폭|채굴봇")
    party = grep_lines(all_lines, r"파티보스|파티 사냥|파티사냥")
    rebirth = grep_lines(all_lines, r"환생|Rebirth|환생수치|환생 미네랄|시작 미네랄")
    auto_keys = grep_lines(all_lines, r"자동강화|AUTO|켜기/끄기")
    overclock = grep_lines(all_lines, r"오버클럭|OVERCLOCK|튜닝램")
    download = grep_lines(all_lines, r"다운로드|DOWNLOAD|8K|게이밍")
    party_income = grep_lines(all_lines, r"^\d+원$|^\d+코인$|^\d+,\d+원$|파티사냥터")
    sp_lines = extract_sp_shop_lines(text)
    guides = extract_guide_sections(text)
    max_level = grep_lines(all_lines, r"최고강|최고 단계|최고강입니다")
    f12_save = grep_lines(all_lines, r"F12|수동 저장|저장")
    bgm = grep_lines(all_lines, r"BGM|Lukrembo|Rose")
    coolers_mining_diff = extract_stat_runs(text, "채굴 난이도", 1)
    mining_diff_block = ""
    idx = text.find("채굴 난이도")
    if idx >= 0:
        mining_diff_block = clean(text[idx : idx + 3500])

    # Section markers containing Korean game terms
    game_sections = []
    for title, body in section_blocks(text):
        if re.search(r"채굴|파티|SCA|Weapon|환생|오버클럭|커스텀", title + body[:200]):
            if len(body) < 800:
                game_sections.append((title, body))
            else:
                game_sections.append((title, body[:600] + " …"))

    # SCA 물품 목록 region (verbatim)
    sca_list_region = ""
    a = text.find("SCA 물품 목록")
    if a < 0:
        a = text.find("SCA 상품 목록")
    if a >= 0:
        b = text.find("P1 파티보스", a)
        if b < 0:
            b = a + 2000
        sca_list_region = clean(text[a:b])

    lines: list[str] = []
    lines.append("# [SCA] 컴퓨터 강화하기 V1.2.9 — 맵 문자열 추출본")
    lines.append("")
    lines.append("> **이 문서에 들어 있는 내용은 `[SCA]컴퓨터강화하기 V1.2.9.scx`의 `staredit\\scenario.chk`를 압축 해제한 뒤, CP949로 읽을 수 있는 문자열만 정리한 것입니다.**")
    lines.append("> 패치노트·스프레드시트·웹 구현·추정 수치는 **포함하지 않습니다.**")
    lines.append("")
    lines.append("## 추출 방법")
    lines.append("")
    lines.append(f"| 항목 | 값 |")
    lines.append(f"|------|-----|")
    lines.append(f"| 원본 파일 | `{scx_name}` |")
    lines.append(f"| 대상 | `staredit\\scenario.chk` (MPQ PKWARE 0x08 섹터) |")
    lines.append(f"| 압축 해제 크기 | {len(raw):,} bytes |")
    lines.append(f"| 인코딩 | CP949 (`errors=replace`) |")
    lines.append(f"| 생성 | {date.today().isoformat()} · `scripts/build_map_extract_doc.py` |")
    lines.append("")
    lines.append("## 한계 (맵 문자열에 없는 것)")
    lines.append("")
    lines.append("- EUD/트리거에만 있는 구매 가격·확률·보상 공식")
    lines.append("- `채굴증폭기` **SCA 구매가** 문구 (정적 텍스트 미발견)")
    lines.append("- `사냥터 수입 +1%`, `게임 배속 +1프레임` 등 SCA 영구 상점 항목명 (정적 텍스트 미발견)")
    lines.append("- 블리자드 기본 유닛/업그레이드 영문 문자열(맵 에셋 잔존)")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## 1. 맵 식별 문자열")
    lines.append("")
    for ln in identity[:20]:
        lines.append(f"- `{ln}`")
    if not identity:
        lines.append("- (해당 패턴 없음)")
    lines.append("")
    lines.append("## 2. SCA · 센터 UI")
    lines.append("")
    for ln in sorted(set(sca_ui))[:40]:
        lines.append(f"- `{ln}`")
    lines.append("")
    if sca_list_region:
        lines.append("### 2.1 `SCA 물품 목록` 구간 (원문)")
        lines.append("")
        lines.append("```text")
        lines.append(sca_list_region[:2000])
        lines.append("```")
        lines.append("")
    lines.append("## 3. SCA 상점 `SP :` 표기 (맵에 박힌 가격 문구)")
    lines.append("")
    lines.append("환생 미네랄 구매 티어로 보이는 표기만 추출되었습니다.")
    lines.append("")
    for ln in sp_lines:
        lines.append(f"- `{ln}`")
    lines.append("")
    lines.append("## 4. 파티 · 채굴 관련")
    lines.append("")
    lines.append("### 4.1 섹션 제목")
    for ln in sorted(set(mining + party))[:30]:
        if SEP in ln or "채굴" in ln or "파티" in ln:
            lines.append(f"- `{ln}`")
    lines.append("")
    lines.append("### 4.2 `채굴 난이도` 블록 (원문 발췌)")
    lines.append("")
    if mining_diff_block:
        lines.append("```text")
        lines.append(mining_diff_block[:2800])
        lines.append("```")
    else:
        lines.append("- (미발견)")
    lines.append("")
    lines.append("## 5. 환생 · 환생수치")
    lines.append("")
    for ln in sorted(set(rebirth))[:35]:
        lines.append(f"- `{ln}`")
    lines.append("")
    lines.append("## 6. 자동강화 키 안내")
    lines.append("")
    for ln in sorted(set(auto_keys))[:40]:
        lines.append(f"- `{ln}`")
    lines.append("")
    lines.append("## 7. 오버클럭 · 튜닝램")
    lines.append("")
    for ln in sorted(set(overclock))[:30]:
        lines.append(f"- `{ln}`")
    lines.append("")
    lines.append("## 8. 다운로드 · 게임 해금")
    lines.append("")
    for ln in sorted(set(download))[:25]:
        lines.append(f"- `{ln}`")
    lines.append("")
    lines.append("## 9. 파티 사냥 수입 표기 (원·코인)")
    lines.append("")
    for ln in sorted(set(party_income))[:25]:
        lines.append(f"- `{ln}`")
    lines.append("")
    lines.append("## 10. 도움말 목차 (`00 N.` 패턴)")
    lines.append("")
    for ln in guides[:40]:
        lines.append(f"- `{ln}`")
    lines.append("")
    lines.append("## 11. 저장 · BGM")
    lines.append("")
    for ln in sorted(set(f12_save + bgm))[:20]:
        lines.append(f"- `{ln}`")
    lines.append("")
    lines.append("## 12. `####` 구간 — 게임 관련 발췌")
    lines.append("")
    for title, body in game_sections[:25]:
        lines.append(f"### {title}")
        lines.append("")
        lines.append("```text")
        lines.append(body[:1200])
        lines.append("```")
        lines.append("")
    lines.append("## 13. 부품 스탯 문구 샘플 (맵 가이드 텍스트)")
    lines.append("")
    lines.append("아래는 `가용 코어`·`성능수치`·`강화 확률` 등이 포함된 줄만 발췌한 것입니다.")
    lines.append("")
    stat_lines = [ln for ln in all_lines if re.search(r"가용 코어|성능수치|강화 확률|공격 딜레이|공격력 :", ln)]
    for ln in stat_lines[:60]:
        lines.append(f"- `{ln}`")
    if len(stat_lines) > 60:
        lines.append(f"- … 외 {len(stat_lines) - 60}줄")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## 재생성")
    lines.append("")
    lines.append("```bash")
    lines.append("python scripts/build_map_extract_doc.py")
    lines.append("```")
    lines.append("")

    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUT} ({len(lines)} lines)")


if __name__ == "__main__":
    main()
