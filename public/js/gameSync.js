/**
 * 로그인 · 진행도 서버 동기화 헬퍼
 * 게임 진행도는 'sca_*' 키로 localStorage에 저장되며, 로그인 계정에 한해
 * 서버(PostgreSQL)와 동기화된다.
 *
 * 인증은 통합 로그인(auth.elcherlab.com)이 발급한 `.elcherlab.com` 도메인 쿠키다.
 * HttpOnly 라 JS 가 값을 읽을 수 없고, 같은 등록 도메인이라 이 앱으로 가는 요청에
 * 브라우저가 알아서 실어 보낸다 — Authorization 헤더를 직접 붙이지 않는다.
 *
 * 쿠키를 읽을 수 없으므로 "로그인했나"는 localStorage 의 표식으로 판단한다.
 * 이 표식은 **불필요한 요청을 줄이기 위한 힌트일 뿐**이고, 실제 판정은 항상
 * 서버가 한다(401). 그래서 401 을 받으면 표식을 지운다.
 */
(function (global) {
  const AUTH_TOKEN_KEY = 'sca_authToken'; // 예전 Bearer 토큰 — 청소 대상
  const LOGGED_IN_KEY = 'sca_loggedIn';

  /** 서버 API만 갱신 — PUT 동기화 페이로드에서 제외 */
  const SERVER_ONLY_STATE_KEYS = new Set([
    'sca_scaCoins',
    'sca_scaUpgrades',
    'sca_rebirthStat',
    'sca_rebirthCount',
    'sca_partyLastClaimMs',
    'sca_partyHuntingTier',
  ]);
  const SYNC_EXCLUDE = new Set([AUTH_TOKEN_KEY, LOGGED_IN_KEY, ...SERVER_ONLY_STATE_KEYS]);

  // 통합 인증 주소는 서버가 내려준다(하드코딩하면 개발 환경에서 어긋난다).
  /**
   * auth 에 넘길 `?lang=`. auth 가 오류 문구를 이 언어로 내려준다.
   *
   * 헤더가 아니라 쿼리인 이유: auth 는 다른 오리진이라 커스텀 헤더를 붙이면
   * 프리플라이트가 뜨는데 auth 는 Content-Type 만 허용한다(gm 이 X-Lang 을 붙였다가
   * 로그인이 통째로 막힌 적이 있다). 쿼리는 CORS 를 건드리지 않는다.
   *
   * 이 파일은 전역 스크립트라 i18n 모듈을 import 할 수 없다 — 다리(window.PcI18n)를
   * 호출 시점에 찾는다. 다리가 없으면(서버·테스트) 한국어로 둔다.
   */
  function authLangQuery() {
    try {
      const lang = window.PcI18n && window.PcI18n.lang && window.PcI18n.lang();
      return lang === 'en' ? '?lang=en' : '';
    } catch (_) {
      return '';
    }
  }

  let authOriginPromise = null;
  function authOrigin() {
    if (!authOriginPromise) {
      authOriginPromise = fetch('/api/auth/origin')
        .then((r) => r.json())
        .then((d) => d.authOrigin)
        .catch(() => {
          authOriginPromise = null; // 실패는 캐시하지 않는다
          throw new Error('인증 서버 주소를 가져오지 못했습니다.');
        });
    }
    return authOriginPromise;
  }

  /** 서버가 401을 주면 로그인 표식을 지운다(세션 만료·로그아웃 반영). */
  function noteUnauthorized(res) {
    if (res && res.status === 401) {
      try { localStorage.removeItem(LOGGED_IN_KEY); } catch (e) {}
    }
    return res;
  }

  const GameSync = {
    /** 로그인 상태 힌트. 실제 판정은 서버(401)가 한다. */
    hasSession() {
      try {
        return localStorage.getItem(LOGGED_IN_KEY) === '1';
      } catch (e) {
        return false;
      }
    },
    setAuth(userId, nickname) {
      localStorage.setItem(LOGGED_IN_KEY, '1');
      localStorage.removeItem(AUTH_TOKEN_KEY); // 예전 버전이 남긴 토큰 청소
      if (userId) localStorage.setItem('sca_myId', userId);
      if (nickname) localStorage.setItem('sca_nickname', nickname);
    },
    clearAuth() {
      localStorage.removeItem(LOGGED_IN_KEY);
      localStorage.removeItem(AUTH_TOKEN_KEY);
    },
    clearLocalGameState() {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sca_')) keys.push(key);
      }
      keys.forEach((k) => localStorage.removeItem(k));
    },
    collectState() {
      const state = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sca_') && !SYNC_EXCLUDE.has(key)) {
          const v = localStorage.getItem(key);
          if (v !== null) state[key] = v;
        }
      }
      return state;
    },
    restoreState(state) {
      if (!state || typeof state !== 'object') return;
      // 서버 → 로컬: 지갑·업그레이드 등 서버 전용 키 포함 전체 복원
      Object.keys(state).forEach((key) => {
        if (key.startsWith('sca_') && !SYNC_EXCLUDE.has(key) && typeof state[key] === 'string') {
          localStorage.setItem(key, state[key]);
        }
      });
      if (typeof state.sca_scaCoins === 'string') {
        const n = Number(state.sca_scaCoins);
        if (!Number.isNaN(n)) {
          window.dispatchEvent(new CustomEvent('sca_wallet_sync', { detail: { scaCoins: n } }));
        }
      }
    },

    /** 가입·로그인은 통합 인증이 처리하고 쿠키를 발급한다(다른 출처 → credentials 필요). */
    async _authRequest(path, username, password, extra) {
      const origin = await authOrigin();
      const res = await fetch(origin + path + authLangQuery(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, ...(extra || {}) }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '요청을 처리할 수 없습니다.');
      const u = data.user || {};
      this.setAuth(u.id, u.username);
      return { userId: u.id, nickname: u.username };
    },
    // 가입에는 만 14세 확인이 필요하다 — 체크가 없으면 통합 인증이 400 으로 막는다.
    register(username, password, ageConfirm) {
      return this._authRequest('/api/signup', username, password, { ageConfirm: ageConfirm === true });
    },
    login(username, password) {
      return this._authRequest('/api/login', username, password);
    },
    async logout() {
      // 세션 쿠키는 .elcherlab.com 도메인이라 통합 인증이 지운다.
      try {
        const origin = await authOrigin();
        await fetch(origin + '/api/logout' + authLangQuery(), { method: 'POST', credentials: 'include' });
      } catch (e) { /* best-effort */ }
      this.clearAuth();
    },

    async loadFromServer() {
      const res = noteUnauthorized(await fetch('/api/state'));
      if (res.status === 401) throw new Error('UNAUTHORIZED');
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || '진행도를 불러오지 못했습니다.');
      // 서버가 받아줬다면 세션이 살아 있다는 뜻이다.
      try { localStorage.setItem(LOGGED_IN_KEY, '1'); } catch (e) {}
      return data.state || {};
    },
    async saveToServer() {
      if (!this.hasSession()) return false;
      try {
        const res = noteUnauthorized(
          await fetch('/api/state', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state: this.collectState() }),
          })
        );
        return res.ok;
      } catch (e) {
        return false;
      }
    },
    /** 서버·로컬 게임 진행도 초기화. 로그인 상태는 유지한다. */
    async resetAccount() {
      const userId = localStorage.getItem('sca_myId');
      const nickname = localStorage.getItem('sca_nickname');
      const res = noteUnauthorized(await fetch('/api/account/reset', { method: 'POST' }));
      if (res.status === 401) throw new Error('로그인이 필요합니다.');
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || '계정 초기화에 실패했습니다.');
      }
      this.clearLocalGameState();
      this.setAuth(userId, nickname);
      return true;
    },
    /** 환생 SCA 지급 — 서버에서 보상 계산·지갑 반영 */
    async claimRebirth(parts) {
      if (!this.hasSession()) throw new Error('로그인이 필요합니다.');
      const res = noteUnauthorized(
        await fetch('/api/sca/rebirth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parts }),
        })
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || '환생 SCA 지급에 실패했습니다.');
      }
      localStorage.setItem('sca_scaCoins', String(data.scaCoins));
      localStorage.setItem('sca_rebirthStat', String(data.rebirthStat));
      localStorage.setItem('sca_rebirthCount', String(data.rebirthCount));
      window.dispatchEvent(new CustomEvent('sca_wallet_sync', { detail: { scaCoins: data.scaCoins } }));
      return data;
    },
    /** 파티 사냥 SCA 타이머 시작 */
    async startPartyHunting(tierIndex, parts) {
      if (!this.hasSession()) return null;
      const res = noteUnauthorized(
        await fetch('/api/sca/party/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tierIndex, parts }),
        })
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || '파티 타이머 시작에 실패했습니다.');
      }
      return data;
    },
    /** 오늘 레이드 마일스톤 수령 진행도 (highestClaimedFloor) */
    async fetchRaidProgress() {
      if (!this.hasSession()) return null;
      const res = noteUnauthorized(await fetch('/api/raid/progress'));
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) return null;
      return data;
    },
    /** 파티 사냥 SCA 틱 지급 */
    async claimPartyIncome(tierIndex, tickCount, parts) {
      if (!this.hasSession()) return null;
      const res = noteUnauthorized(
        await fetch('/api/sca/party/income', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tierIndex, tickCount, parts }),
        })
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || '파티 SCA 지급에 실패했습니다.');
      }
      if (data.grantedSca > 0) {
        localStorage.setItem('sca_scaCoins', String(data.scaCoins));
        window.dispatchEvent(new CustomEvent('sca_wallet_sync', { detail: { scaCoins: data.scaCoins } }));
      }
      return data;
    },
    /** SCA 상점 구매 — 서버에서 잔액 차감·업그레이드 반영 */
    async purchaseScaItem(itemId) {
      if (!this.hasSession()) throw new Error('로그인이 필요합니다.');
      const res = noteUnauthorized(
        await fetch('/api/sca/purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId }),
        })
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'SCA 상점 구매에 실패했습니다.');
      }
      localStorage.setItem('sca_scaCoins', String(data.scaCoins));
      localStorage.setItem('sca_scaUpgrades', JSON.stringify(data.scaUpgrades || {}));
      window.dispatchEvent(new CustomEvent('sca_wallet_sync', { detail: { scaCoins: data.scaCoins } }));
      return data;
    },
    /**
     * Socket.io handshake auth 페이로드.
     * 세션은 쿠키로 실려 가므로 넘길 것이 없다(핸드셰이크가 같은 출처).
     */
    getSocketAuth() {
      return {};
    },
  };

  const SYNC_DEBOUNCE_MS = 1500;
  const SYNC_MAX_WAIT_MS = 5000;
  let __scaSyncTimer = null;
  let __scaLastSync = 0;

  function scheduleServerSync() {
    if (!GameSync.hasSession()) return;
    const now = Date.now();
    if (now - __scaLastSync >= SYNC_MAX_WAIT_MS) {
      if (__scaSyncTimer) { clearTimeout(__scaSyncTimer); __scaSyncTimer = null; }
      __scaLastSync = now;
      GameSync.saveToServer();
      return;
    }
    if (__scaSyncTimer) clearTimeout(__scaSyncTimer);
    __scaSyncTimer = setTimeout(() => {
      __scaSyncTimer = null;
      __scaLastSync = Date.now();
      GameSync.saveToServer();
    }, SYNC_DEBOUNCE_MS);
  }

  function flushServerSync() {
    if (!GameSync.hasSession()) return;
    if (__scaSyncTimer) {
      clearTimeout(__scaSyncTimer);
      __scaSyncTimer = null;
    }
    try {
      fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: GameSync.collectState() }),
        keepalive: true,
      });
      __scaLastSync = Date.now();
    } catch (e) { /* best-effort */ }
  }

  window.addEventListener('pagehide', flushServerSync);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushServerSync();
  });

  GameSync.flushServerSync = flushServerSync;

  global.GameSync = GameSync;
  global.scheduleServerSync = scheduleServerSync;
  global.flushServerSync = flushServerSync;
})(window);
