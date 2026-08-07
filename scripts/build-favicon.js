/**
 * public/favicon.svg 와 같은 그림을 32x32 로 래스터화해 public/favicon.ico 를 만든다.
 *
 * SVG 만 두면 대부분의 브라우저는 <link rel="icon"> 을 따라가지만, 링크를 못 읽는
 * 클라이언트·크롤러는 여전히 /favicon.ico 를 때린다. 그 404 를 없애려고 둔다.
 * ICO 는 Vista 이후 PNG 페이로드를 그대로 담을 수 있어서 별도 인코더가 필요 없다.
 *
 * 의존성 없이 zlib 만 쓴다(이 저장소엔 이미지 라이브러리가 없다).
 * 아이콘 모양을 바꿨다면 favicon.svg 와 이 파일을 함께 고치고 다시 돌린 뒤 결과물을 커밋할 것.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 32;
const px = Buffer.alloc(SIZE * SIZE * 4); // RGBA, 0 = 투명

const EMERALD = [0x10, 0xb9, 0x81, 0xff];
const DIE = [0x02, 0x2c, 0x22, 0xff];
const ACCENT = [0x6e, 0xe7, 0xb7, 0xff];

function put(x, y, c) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  const i = (y * SIZE + x) * 4;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = c[3];
}

/** 모서리 반경을 반영한 사각형 채우기(픽셀 중심 기준). */
function rect(x, y, w, h, c, r = 0) {
  for (let py = Math.floor(y); py < Math.ceil(y + h); py++) {
    for (let pxi = Math.floor(x); pxi < Math.ceil(x + w); pxi++) {
      const cx = pxi + 0.5, cy = py + 0.5;
      if (cx < x || cx > x + w || cy < y || cy > y + h) continue;
      if (r > 0) {
        const dx = Math.max(x + r - cx, 0, cx - (x + w - r));
        const dy = Math.max(y + r - cy, 0, cy - (y + h - r));
        if (dx * dx + dy * dy > r * r) continue;
      }
      put(pxi, py, c);
    }
  }
}

/** 다각형 채우기 — 픽셀 중심 기준 홀짝 판정. */
function poly(pts, c) {
  for (let py = 0; py < SIZE; py++) {
    for (let pxi = 0; pxi < SIZE; pxi++) {
      const cx = pxi + 0.5, cy = py + 0.5;
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > cy) !== (yj > cy) && cx < ((xj - xi) * (cy - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) put(pxi, py, c);
    }
  }
}

// ── favicon.svg 와 같은 좌표 ──
for (const x of [11, 15, 19]) { rect(x, 3, 2, 4, EMERALD, 1); rect(x, 25, 2, 4, EMERALD, 1); }
for (const y of [11, 15, 19]) { rect(3, y, 4, 2, EMERALD, 1); rect(25, y, 4, 2, EMERALD, 1); }
rect(6, 6, 20, 20, EMERALD, 3);
rect(10, 10, 12, 12, DIE, 2);
poly([[16, 12.5], [20, 17.5], [17.4, 17.5], [17.4, 20], [14.6, 20], [14.6, 17.5], [12, 17.5]], ACCENT);

// ── PNG 인코딩 ──
function crc32(buf) {
  let c, table = crc32.t;
  if (!table) {
    table = crc32.t = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;   // bit depth
ihdr[9] = 6;   // color type: RGBA
// 10~12: compression/filter/interlace = 0

const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0; // filter: none
  px.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

// ── ICO 래핑(PNG 페이로드 1장) ──
const dir = Buffer.alloc(6);
dir.writeUInt16LE(0, 0);  // reserved
dir.writeUInt16LE(1, 2);  // type: icon
dir.writeUInt16LE(1, 4);  // 이미지 1장
const entry = Buffer.alloc(16);
entry[0] = SIZE; entry[1] = SIZE;  // 폭·높이
entry[2] = 0; entry[3] = 0;        // 팔레트 없음 / reserved
entry.writeUInt16LE(1, 4);         // color planes
entry.writeUInt16LE(32, 6);        // bpp
entry.writeUInt32BE(0, 8);
entry.writeUInt32LE(png.length, 8);
entry.writeUInt32LE(6 + 16, 12);   // 데이터 오프셋

const out = path.join(__dirname, '..', 'public', 'favicon.ico');
fs.writeFileSync(out, Buffer.concat([dir, entry, png]));
console.log(`[build-favicon] favicon.ico 생성 — ${SIZE}x${SIZE}, ${(png.length / 1024).toFixed(1)}KB PNG 페이로드`);
