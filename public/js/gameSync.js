/**
 * 로그인 · 진행도 서버 동기화 헬퍼
 * 게임 진행도는 'sca_*' 키로 localStorage에 저장되며, 로그인 계정에 한해
 * 서버(PostgreSQL)와 동기화된다.
 */
(function (global) {
  const AUTH_TOKEN_KEY = 'sca_authToken';
  /** 서버 API만 갱신 — PUT 동기화 페이로드에서 제외 */
  const SERVER_ONLY_STATE_KEYS = new Set([
    'sca_scaCoins',
    'sca_scaUpgrades',
    'sca_rebirthStat',
    'sca_rebirthCount',
    'sca_partyLastClaimMs',
    'sca_partyHuntingTier',
  ]);
  const SYNC_EXCLUDE = new Set([AUTH_TOKEN_KEY, ...SERVER_ONLY_STATE_KEYS]);

  const GameSync = {
    getToken() {
      return localStorage.getItem(AUTH_TOKEN_KEY);
    },
    setAuth(token, userId, nickname) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      if (userId) localStorage.setItem('sca_myId', userId);
      if (nickname) localStorage.setItem('sca_nickname', nickname);
    },
    clearAuth() {
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
        if (key.startsWith('sca_') && key !== AUTH_TOKEN_KEY && typeof state[key] === 'string') {
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
    async _authRequest(path, username, password) {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || '요청을 처리할 수 없습니다.');
      }
      return data;
    },
    register(username, password) {
      return this._authRequest('/api/auth/register', username, password);
    },
    login(username, password) {
      return this._authRequest('/api/auth/login', username, password);
    },
    async loadFromServer() {
      const token = this.getToken();
      if (!token) throw new Error('NO_TOKEN');
      const res = await fetch('/api/state', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) throw new Error('UNAUTHORIZED');
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || '진행도를 불러오지 못했습니다.');
      return data.state || {};
    },
    async saveToServer() {
      const token = this.getToken();
      if (!token) return false;
      try {
        const res = await fetch('/api/state', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ state: this.collectState() }),
        });
        const data = await res.json().catch(() => ({}));
        return res.ok;
      } catch (e) {
        return false;
      }
    },
    async logout() {
      const token = this.getToken();
      if (token) {
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch (e) { /* best-effort */ }
      }
    },
    /** 서버·로컬 게임 진행도 초기화. 로그인 토큰은 유지한다. */
    async resetAccount() {
      const token = this.getToken();
      const userId = localStorage.getItem('sca_myId');
      const nickname = localStorage.getItem('sca_nickname');
      if (!token) throw new Error('로그인이 필요합니다.');
      const res = await fetch('/api/account/reset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || '계정 초기화에 실패했습니다.');
      }
      this.clearLocalGameState();
      this.setAuth(token, userId, nickname);
      return true;
    },
    /** 환생 SCA 지급 — 서버에서 보상 계산·지갑 반영 */
    async claimRebirth(parts) {
      const token = this.getToken();
      if (!token) throw new Error('로그인이 필요합니다.');
      const res = await fetch('/api/sca/rebirth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ parts }),
      });
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
      const token = this.getToken();
      if (!token) return null;
      const res = await fetch('/api/sca/party/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tierIndex, parts }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || '파티 타이머 시작에 실패했습니다.');
      }
      return data;
    },
    /** 파티 사냥 SCA 틱 지급 */
    async claimPartyIncome(tierIndex, tickCount, parts) {
      const token = this.getToken();
      if (!token) return null;
      const res = await fetch('/api/sca/party/income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tierIndex, tickCount, parts }),
      });
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
      const token = this.getToken();
      if (!token) throw new Error('로그인이 필요합니다.');
      const res = await fetch('/api/sca/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ itemId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'SCA 상점 구매에 실패했습니다.');
      }
      localStorage.setItem('sca_scaCoins', String(data.scaCoins));
      localStorage.setItem('sca_scaUpgrades', JSON.stringify(data.scaUpgrades || {}));
      window.dispatchEvent(new CustomEvent('sca_wallet_sync', { detail: { scaCoins: data.scaCoins } }));
      return data;
    },
    /** Socket.io handshake auth 페이로드 */
    getSocketAuth() {
      const token = this.getToken();
      return token ? { token } : {};
    },
  };

  const SYNC_DEBOUNCE_MS = 1500;
  const SYNC_MAX_WAIT_MS = 5000;
  let __scaSyncTimer = null;
  let __scaLastSync = 0;

  function scheduleServerSync() {
    if (!GameSync.getToken()) return;
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
    const token = GameSync.getToken();
    if (!token) return;
    if (__scaSyncTimer) {
      clearTimeout(__scaSyncTimer);
      __scaSyncTimer = null;
    }
    try {
      fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
