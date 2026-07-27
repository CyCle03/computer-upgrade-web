/**
 * Tailwind v3 설정 — CDN(cdn.tailwindcss.com)을 대체하는 빌드 타임 설정.
 *
 * CDN 시절엔 별도 설정 없이 기본값으로 동작했으므로 theme/plugins도 기본값 그대로 둔다.
 * content 스캔 대상만 정확히 잡으면 결과 CSS가 CDN JIT과 같아진다.
 *
 * 주의: Tailwind는 파일을 "텍스트"로 훑어 클래스 후보를 뽑는다. 즉
 * `${cond ? 'text-emerald-300' : 'text-rose-300'}` 처럼 **완성된 클래스 문자열**이
 * 소스에 그대로 있으면 잡히지만, `text-${color}-300` 처럼 **쪼개서 조합**하면 못 잡는다.
 * 새 클래스를 동적으로 만들 땐 반드시 완성형 문자열 분기로 쓸 것.
 */
module.exports = {
  content: [
    './public/index.html',   // <body class="...">
    './frontend/src/**/*.{js,jsx}',
    './public/js/**/*.js',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
