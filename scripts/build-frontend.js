#!/usr/bin/env node
/**
 * 프론트엔드 번들 빌드 — esbuild(JS) + Tailwind CLI(CSS) → public/build/
 * ---------------------------------------------------------------------------
 * 예전엔 index.html이 CDN에서 React UMD + Babel standalone + Tailwind를 받아
 * 브라우저에서 JSX를 변환했다. 그래서 CSP에 'unsafe-eval'(Babel)과
 * 'unsafe-inline'(Tailwind 런타임 주입 <style>), 외부 CDN 허용이 전부 필요했다.
 * 이제 빌드 타임에 다 끝내므로 script-src 'self'; style-src 'self' 로 좁힐 수 있다.
 *
 *   node scripts/build-frontend.js           # 1회 빌드 (기본: 프로덕션, minify)
 *   node scripts/build-frontend.js --watch   # 파일 변경 감시 (개발용, minify 없음)
 *   node scripts/build-frontend.js --dev     # 개발 빌드 1회 (minify 없음, sourcemap)
 *
 * 산출물 public/build/ 는 .gitignore 대상 — 커밋하지 않고 배포 시 빌드한다.
 */
const { execFileSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const root = path.join(__dirname, '..');
const outdir = path.join(root, 'public', 'build');
const entryJs = path.join(root, 'frontend', 'src', 'app.jsx');
const entryCss = path.join(root, 'frontend', 'src', 'styles.css');
const tailwindBin = path.join(root, 'node_modules', '.bin', 'tailwindcss');

const watch = process.argv.includes('--watch');
const dev = watch || process.argv.includes('--dev');

fs.mkdirSync(outdir, { recursive: true });

/** JSX는 classic 런타임(React.createElement) — 원본 코드의 @jsxRuntime classic 을 유지한다. */
const jsOptions = {
  entryPoints: [entryJs],
  outfile: path.join(outdir, 'app.js'),
  bundle: true,
  format: 'iife',            // 전역(OMG·io·GameSync)을 그대로 참조하려면 IIFE
  target: ['es2019'],        // 구형 모바일 브라우저 여유분
  jsx: 'transform',
  minify: !dev,
  sourcemap: dev,
  legalComments: 'none',
  define: {
    // React 프로덕션 빌드 선택 — dev 빌드는 경고/스택을 살려둔다.
    'process.env.NODE_ENV': dev ? '"development"' : '"production"',
  },
  logLevel: 'info',
};

function buildCss() {
  const args = ['-c', path.join(root, 'tailwind.config.js'), '-i', entryCss, '-o', path.join(outdir, 'app.css')];
  if (!dev) args.push('--minify');
  execFileSync(tailwindBin, args, { cwd: root, stdio: 'inherit' });
}

async function main() {
  if (watch) {
    const ctx = await esbuild.context(jsOptions);
    await ctx.watch();
    // Tailwind CLI도 자체 watch 모드로 띄운다(별도 프로세스).
    const tw = spawn(
      tailwindBin,
      ['-c', path.join(root, 'tailwind.config.js'), '-i', entryCss, '-o', path.join(outdir, 'app.css'), '--watch'],
      { cwd: root, stdio: 'inherit' },
    );
    process.on('SIGINT', () => { tw.kill(); process.exit(0); });
    console.log('[build-frontend] watch 중 — public/build/ 갱신됨');
    return;
  }

  await esbuild.build(jsOptions);
  buildCss();

  const size = (f) => `${(fs.statSync(path.join(outdir, f)).size / 1024).toFixed(1)}KB`;
  console.log(`[build-frontend] ${dev ? '개발' : '프로덕션'} 빌드 완료 — app.js ${size('app.js')}, app.css ${size('app.css')}`);
}

main().catch((e) => {
  console.error(`[build-frontend] 실패: ${e.message}`);
  process.exit(1);
});
