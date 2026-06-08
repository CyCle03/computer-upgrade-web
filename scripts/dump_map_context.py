#!/usr/bin/env python3
import re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts" / "_vendor"))
from extract_scx_strings import decompress_scenario_chk
from mpyq import MPQArchive

scx = next(Path(__file__).resolve().parents[1].glob("*.scx"))
text = decompress_scenario_chk(MPQArchive(str(scx), listfile=False)).decode("cp949", errors="replace")

targets = [
    "5,000원", "500,000원", "30원", "300원", "3,500원", "50,000원", "750,000원",
    "100원", "2,500원", "30,000원", "250,000원", "5,000,000원",
    "파티사냥터", "대항해", "심시티", "간단한 문서작업",
]
for t in targets:
    idx = 0
    print(f"\n=== {t} ===")
    count = 0
    while count < 3:
        i = text.find(t, idx)
        if i < 0:
            break
        snip = re.sub(r"[\x00-\x1f]", "|", text[max(0,i-120):i+len(t)+120])
        print(snip)
        idx = i + len(t)
        count += 1
