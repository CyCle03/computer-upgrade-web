#!/usr/bin/env node
/**
 * Google Fonts 셀프 호스팅 벤더링 (1회성 스크립트, 빌드에는 포함되지 않음).
 * ---------------------------------------------------------------------------
 * fonts.googleapis.com CSS를 받아 woff2 파일을 public/fonts/ 로 내려받고,
 * URL을 /fonts/... 로 바꾼 @font-face 블록을 frontend/src/fonts.css 에 쓴다.
 *
 * 목적: 외부 도메인(fonts.googleapis.com / fonts.gstatic.com) 의존을 없애
 * CSP를 style-src 'self'; font-src 'self' 로 좁히기 위함. 폰트 버전을 올릴 때만
 * 다시 실행하고, 결과물(public/fonts/*.woff2, fonts.css)은 커밋한다.
 *
 *   node scripts/vendor-fonts.js
 *
 * latin / latin-ext 서브셋만 받는다. 나머지 서브셋(cyrillic·greek·vietnamese)은
 * 이 UI(한국어+영문)에서 unicode-range에 걸리지 않아 어차피 다운로드되지 않고,
 * 한글은 폰트에 글리프가 없어 sans-serif 폴백이 담당한다.
 */
const fs = require('fs');
const path = require('path');

const CSS_URL =
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Outfit:wght@400;600;800&display=swap';
// woff2를 받으려면 최신 브라우저 UA가 필요하다(구형 UA면 ttf를 준다).
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const KEEP_SUBSETS = new Set(['latin', 'latin-ext']);

const fontsDir = path.join(__dirname, '..', 'public', 'fonts');
const outCss = path.join(__dirname, '..', 'frontend', 'src', 'fonts.css');

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function main() {
  const res = await fetch(CSS_URL, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`CSS 요청 실패: ${res.status}`);
  const css = await res.text();

  fs.mkdirSync(fontsDir, { recursive: true });

  // "/* subset */\n@font-face { ... }" 단위로 자른다.
  const blocks = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g)];
  if (blocks.length === 0) throw new Error('@font-face 블록을 찾지 못함 — 응답 형식이 바뀌었을 수 있음');

  const out = [
    '/*',
    ' * 셀프 호스팅 웹폰트 — scripts/vendor-fonts.js 가 생성. 직접 편집하지 말 것.',
    ' * 원본: Google Fonts (JetBrains Mono, Outfit) / SIL Open Font License 1.1',
    ' */',
    '',
  ];
  let downloaded = 0;

  for (const [, subset, face] of blocks) {
    if (!KEEP_SUBSETS.has(subset)) continue;

    const family = /font-family:\s*'([^']+)'/.exec(face)[1];
    const weight = /font-weight:\s*(\d+)/.exec(face)[1];
    const url = /url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/.exec(face)[1];

    const file = `${slug(family)}-${weight}-${subset}.woff2`;
    const bin = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!bin.ok) throw new Error(`폰트 다운로드 실패: ${url} → ${bin.status}`);
    fs.writeFileSync(path.join(fontsDir, file), Buffer.from(await bin.arrayBuffer()));
    downloaded++;

    out.push(`/* ${family} ${weight} — ${subset} */`);
    out.push(face.replace(url, `/fonts/${file}`).trim());
    out.push('');
  }

  fs.writeFileSync(outCss, out.join('\n'));
  console.log(`[vendor-fonts] woff2 ${downloaded}개 → public/fonts/, @font-face → ${path.relative(process.cwd(), outCss)}`);
}

main().catch((e) => {
  console.error(`[vendor-fonts] 실패: ${e.message}`);
  process.exit(1);
});
