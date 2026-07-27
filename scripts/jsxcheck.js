#!/usr/bin/env node
/**
 * 프론트엔드 JSX 구문 게이트 (frontend/src/app.jsx).
 * ---------------------------------------------------------------------------
 * 프론트는 타입체크가 없다(esbuild는 트랜스파일만 함). 이 스크립트는 TypeScript
 * 파서로 JSX를 파싱해 "구문 오류"만 빠르게 잡아준다(타입 오류는 무시).
 *
 * 참고: 이제 `npm run build:frontend`(esbuild)가 더 엄격한 게이트다 — 구문 오류가
 * 있으면 번들이 아예 안 만들어진다. 이 스크립트는 빌드 없이 파일 하나만 초 단위로
 * 훑고 싶을 때 쓰는 보조 도구다.
 *
 *   node scripts/jsxcheck.js            # frontend/src/app.jsx 검사
 *   node scripts/jsxcheck.js path.jsx   # 다른 파일 검사 (.html 이면 <script type="text/babel"> 블록 추출)
 *
 * exit 0 = 구문 OK, exit 1 = 구문 오류(파일:라인:열 + 메시지 출력).
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const target = process.argv[2] || path.join(__dirname, '..', 'frontend', 'src', 'app.jsx');
const abs = path.resolve(target);

if (!fs.existsSync(abs)) {
  console.error(`[jsxcheck] 파일을 찾을 수 없음: ${abs}`);
  process.exit(2);
}

const source = fs.readFileSync(abs, 'utf8');
const rel = path.relative(process.cwd(), abs) || abs;

// .html 이면 예전 방식대로 babel 블록을 추출하고, 그 외에는 파일 전체를 그대로 검사한다.
let blocks;
if (abs.endsWith('.html')) {
  const re = /<script\s+type="text\/babel"[^>]*>([\s\S]*?)<\/script>/g;
  blocks = [];
  let m;
  while ((m = re.exec(source)) !== null) {
    blocks.push({ code: m[1], startLine: source.slice(0, m.index).split('\n').length });
  }
  if (blocks.length === 0) {
    console.error(`[jsxcheck] ${rel}: <script type="text/babel"> 블록이 없음`);
    process.exit(2);
  }
} else {
  blocks = [{ code: source, startLine: 1 }];
}

let totalErrors = 0;
blocks.forEach((b, i) => {
  const sf = ts.createSourceFile(`block${i}.tsx`, b.code, ts.ScriptTarget.ES2019, true, ts.ScriptKind.TSX);
  const diags = sf.parseDiagnostics || [];
  console.log(`[jsxcheck] block ${i}: 시작 ~${rel}:${b.startLine}, 길이 ${b.code.length}자, parseDiagnostics=${diags.length}`);
  diags.forEach((d) => {
    totalErrors++;
    const pos = d.start != null ? sf.getLineAndCharacterOfPosition(d.start) : { line: -1, character: -1 };
    const line = b.startLine + pos.line;
    const msg = ts.flattenDiagnosticMessageText(d.messageText, '\n');
    console.error(`  구문 오류 @ ${rel}:${line}:${pos.character + 1} — ${msg}`);
  });
});

if (totalErrors === 0) {
  console.log('[jsxcheck] OK — JSX 구문 오류 없음(파스 통과).');
  process.exit(0);
} else {
  console.error(`[jsxcheck] FAIL — 구문 오류 ${totalErrors}개`);
  process.exit(1);
}
