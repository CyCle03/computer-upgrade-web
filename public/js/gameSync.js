/**
 * 로그인 · 진행도 서버 동기화 헬퍼
 * 게임 진행도는 'sca_*' 키로 localStorage에 저장되며, 로그인 계정에 한해
 * 서버(PostgreSQL)와 동기화된다.
 */
(function (global) {
  const AUTH_TOKEN_KEY = 'sca_authToken';
  const SYNC_EXCLUDE = new Set([AUTH_TOKEN_KEY]);

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
      Object.keys(state).forEach((key) => {
        if (key.startsWith('sca_') && !SYNC_EXCLUDE.has(key) && typeof state[key] === 'string') {
          localStorage.setItem(key, state[key]);
        }
      });
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
        if (res.ok && data.success && data.state && data.state.sca_scaCoins != null) {
          localStorage.setItem('sca_scaCoins', String(data.state.sca_scaCoins));
        }
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

  function emitWalletSync() {
    const v = localStorage.getItem('sca_scaCoins');
    if (v == null) return;
    window.dispatchEvent(new CustomEvent('sca_wallet_sync', { detail: { scaCoins: Number(v) || 0 } }));
  }

  function scheduleServerSync() {
    if (!GameSync.getToken()) return;
    const now = Date.now();
    if (now - __scaLastSync >= SYNC_MAX_WAIT_MS) {
      if (__scaSyncTimer) { clearTimeout(__scaSyncTimer); __scaSyncTimer = null; }
      __scaLastSync = now;
      GameSync.saveToServer().then((ok) => { if (ok) emitWalletSync(); });
      return;
    }
    if (__scaSyncTimer) clearTimeout(__scaSyncTimer);
    __scaSyncTimer = setTimeout(() => {
      __scaSyncTimer = null;
      __scaLastSync = Date.now();
      GameSync.saveToServer().then((ok) => { if (ok) emitWalletSync(); });
    }, SYNC_DEBOUNCE_MS);
  }

  function flushServerSync() {
    const token = GameSync.getToken();
    if (!token) return;
    try {
      fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ state: GameSync.collectState() }),
        keepalive: true,
      }).then((res) => res.json().catch(() => ({}))).then((data) => {
        if (data.success && data.state && data.state.sca_scaCoins != null) {
          localStorage.setItem('sca_scaCoins', String(data.state.sca_scaCoins));
          emitWalletSync();
        }
      });
      __scaLastSync = Date.now();
    } catch (e) { /* best-effort */ }
  }

  window.addEventListener('pagehide', flushServerSync);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushServerSync();
  });

  global.GameSync = GameSync;
  global.scheduleServerSync = scheduleServerSync;
})(window);
