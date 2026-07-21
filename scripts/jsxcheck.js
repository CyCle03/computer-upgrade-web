#!/usr/bin/env node
/**
 * index.html 의 <script type="text/babel"> 블록 구문 게이트.
 * ---------------------------------------------------------------------------
 * 프론트는 Babel 인-브라우저 변환이라 타입체크가 없고, 구문 오류가 나면 블록
 * 전체가 컴파일 실패해 앱이 아예 안 뜬다(부분 실패 없음). 이 스크립트는 그 babel
 * 블록을 TypeScript 파서로 JSX 파싱해 "구문 오류"만 빠르게 잡아준다(타입 오류는 무시).
 * index.html 을 편집한 뒤 실제 브라우저 로드 전에 1차 게이트로 사용한다.
 *
 *   node scripts/jsxcheck.js            # public/index.html 검사
 *   node scripts/jsxcheck.js path.html  # 다른 파일 검사
 *
 * exit 0 = 구문 OK, exit 1 = 구문 오류(파일:라인:열 + 메시지 출력).
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const target = process.argv[2] || path.join(__dirname, '..', 'public', 'index.html');
const abs = path.resolve(target);

if (!fs.existsSync(abs)) {
  console.error(`[jsxcheck] 파일을 찾을 수 없음: ${abs}`);
  process.exit(2);
}

const html = fs.readFileSync(abs, 'utf8');
const rel = path.relative(process.cwd(), abs) || abs;

// 모든 text/babel 스크립트 블록 추출(현재는 1개지만 방어적으로 전부 순회)
const re = /<script\s+type="text\/babel"[^>]*>([\s\S]*?)<\/script>/g;
const blocks = [];
let m;
while ((m = re.exec(html)) !== null) {
  const startLine = html.slice(0, m.index).split('\n').length;
  blocks.push({ code: m[1], startLine });
}

if (blocks.length === 0) {
  console.error(`[jsxcheck] ${rel}: <script type="text/babel"> 블록이 없음`);
  process.exit(2);
}

let totalErrors = 0;
blocks.forEach((b, i) => {
  const sf = ts.createSourceFile(`block${i}.tsx`, b.code, ts.ScriptTarget.ES2019, true, ts.ScriptKind.TSX);
  const diags = sf.parseDiagnostics || [];
  console.log(`[jsxcheck] block ${i}: 시작 ~${rel}:${b.startLine}, 길이 ${b.code.length}자, parseDiagnostics=${diags.length}`);
  diags.forEach((d) => {
    totalErrors++;
    const pos = d.start != null ? sf.getLineAndCharacterOfPosition(d.start) : { line: -1, character: -1 };
    const htmlLine = b.startLine + pos.line;
    const msg = ts.flattenDiagnosticMessageText(d.messageText, '\n');
    console.error(`  구문 오류 @ ${rel}:${htmlLine}:${pos.character + 1} — ${msg}`);
  });
});

if (totalErrors === 0) {
  console.log('[jsxcheck] OK — babel 블록 구문 오류 없음(파스 통과).');
  process.exit(0);
} else {
  console.error(`[jsxcheck] FAIL — 구문 오류 ${totalErrors}개`);
  process.exit(1);
}
