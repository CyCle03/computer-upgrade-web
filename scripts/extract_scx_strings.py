#!/usr/bin/env python3
"""Extract strings from [SCA]컴퓨터강화하기 V1.2.9.scx (PKWARE DCL sectors)."""
from __future__ import annotations

import re
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts" / "_vendor"))

from mpyq import MPQArchive  # type: ignore
from pkware import pkware_decompress  # type: ignore


def decompress_scenario_chk(archive: MPQArchive) -> bytes:
    name = r"staredit\scenario.chk"
    he = archive.get_hash_table_entry(name)
    if he is None:
        raise RuntimeError("staredit\\scenario.chk not found")
    be = archive.block_table[he.block_table_index]
    offset = be.offset + archive.header["offset"]
    archive.file.seek(offset)
    file_data = archive.file.read(be.archived_size)

    sector_size = 512 << archive.header["sector_size_shift"]
    sectors = be.size // sector_size + 1
    positions = struct.unpack("<%dI" % (sectors + 1), file_data[: 4 * (sectors + 1)])

    out = bytearray()
    for i in range(sectors):
        sector = file_data[positions[i] : positions[i + 1]]
        if not sector:
            continue
        # Full-size sector without 0x08 header = stored raw (padding or incompressible block).
        if len(sector) == sector_size and sector[0] != 0x08:
            out.extend(sector)
            continue
        comp_type = sector[0]
        if comp_type == 0:
            out.extend(sector[1:])
        elif comp_type == 0x08:
            out.extend(pkware_decompress(sector[1:]))
        elif comp_type == 0x02:
            import zlib
            out.extend(zlib.decompress(sector[1:], 15))
        else:
            raise RuntimeError(f"unsupported sector compression 0x{comp_type:02x} at sector {i}")
    return bytes(out)


def find_hits(data: bytes, keywords: list[str]) -> list[str]:
    hits: list[str] = []
    for enc in ("cp949", "utf-16-le", "utf-8"):
        text = data.decode(enc, errors="ignore")
        for part in re.split(r"[\x00\r\n]+", text):
            part = part.strip()
            if not part or len(part) > 400:
                continue
            if any(k in part for k in keywords):
                hits.append(f"[{enc}] {part}")
    return hits


def main() -> None:
    scx = next(ROOT.glob("*.scx"))
    print("SCX:", scx.name)
    archive = MPQArchive(str(scx), listfile=False)
    raw = decompress_scenario_chk(archive)
    print("decompressed bytes:", len(raw))

    keywords = ["채굴", "증폭", "채굴력", "5000", "65000", "SCA", "상점", "파티"]
    hits = find_hits(raw, keywords)
    print("hits:", len(hits))
    for h in hits[:80]:
        print(h)

    # numeric context around 5000 in cp949 text blobs
    text = raw.decode("cp949", errors="ignore")
    for m in re.finditer(r".{0,40}5000.{0,40}", text):
        s = m.group().replace("\x00", " ").strip()
        if "채굴" in s or "증폭" in s or "SCA" in s or "코인" in s:
            print("CTX:", s)


if __name__ == "__main__":
    main()
