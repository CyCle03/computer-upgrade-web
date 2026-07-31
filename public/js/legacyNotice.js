/**
 * 구 duckdns 주소 종료 안내.
 *
 * computer-upgrade-web.duckdns.org 는 현재 pc.elcherlab.com 으로 301 리다이렉트되지만
 * 2026-08-07 에 끊는다. 그 전까지 북마크를 바꾸라고 알린다.
 *
 * 기한이 지나면 스스로 사라지므로 나중에 이 파일을 걷어내는 걸 잊어도 문제가 없다.
 * (CSP 가 script-src 'self' 라 인라인 스크립트를 못 쓴다 → 별도 파일)
 */
(function () {
  'use strict';

  var CUTOFF = Date.UTC(2026, 7, 7); // 2026-08-07 (월은 0부터)
  var KEY = 'legacyDomainNoticeDismissed';

  function init() {
    var el = document.getElementById('legacyNotice');
    if (!el) return;
    if (Date.now() >= CUTOFF) return; // 기한이 지나면 안내를 멈춘다

    try {
      if (window.localStorage.getItem(KEY) === '1') return;
    } catch (e) {
      /* 프라이빗 모드 등 — 그냥 보여준다 */
    }

    // hidden 과 flex 는 둘 다 Tailwind display 유틸리티라, 한 요소에 같이 두면
    // 생성된 CSS 의 순서에 결과가 좌우된다. 초기엔 hidden 만 두고 여기서 바꿔 단다.
    el.classList.remove('hidden');
    el.classList.add('flex');
    var close = document.getElementById('legacyNoticeClose');
    if (close) {
      close.addEventListener('click', function () {
        el.classList.remove('flex');
        el.classList.add('hidden');
        try {
          window.localStorage.setItem(KEY, '1');
        } catch (e) {}
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
