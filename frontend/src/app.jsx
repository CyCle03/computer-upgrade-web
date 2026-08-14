/**
 * '컴퓨터 강화하기' 프론트엔드 엔트리 (React 18 + JSX).
 * ---------------------------------------------------------------------------
 * 원래 public/index.html 의 <script type="text/babel"> 블록에 있던 코드를 그대로
 * 옮겨온 것이다. 이제 esbuild가 빌드 타임에 번들링하므로 브라우저 Babel 변환도,
 * CDN 스크립트도 필요 없다 → CSP에서 'unsafe-eval'/'unsafe-inline'을 뺄 수 있다.
 *
 * 빌드: npm run build:frontend  → public/build/app.js
 *
 * 전역 의존(번들에 포함되지 않고 index.html이 먼저 로드하는 스크립트들):
 *   window.OriginalMapGame (public/originalMapData.js — 백엔드도 eval로 공유)
 *   window.GameSync / scheduleServerSync / flushServerSync (public/js/gameSync.js)
 *   window.AutoSimulator 계열 (public/js/autoSimulator.js)
 *   io (socket.io 클라이언트, 서버가 /socket.io/socket.io.js 로 서빙)
 * 번들은 IIFE라 위 전역들은 런타임에 window에서 그대로 해석된다.
 */
import React from 'react';
import * as ReactDOM from 'react-dom/client';
import { t, tOr, getLang, setLang, toggleLang, useLang, mineral, translateServerError } from './i18n.js';

/**
 * 개발용 로그. 배포본에서는 아무 것도 찍지 않는다.
 *
 * **켜는 조건을 적는다** — 끄는 조건을 적으면 배포처가 늘 때마다 뒤집혀
 * 그대로 새어 나간다(사이버 클리커에서 실제로 그렇게 DEBUG 콘솔이 나갔다).
 * 로컬(localhost·127.0.0.1)에서 자동으로 켜지고, 배포본에서는 ?debug=1 로 연다.
 *
 * console.error 는 이걸 쓰지 않는다. 진짜 오류는 배포본에서도 남아야
 * 이용자가 콘솔을 캡처해 보내줄 수 있다.
 */
const DEBUG_ENABLED = (() => {
  if (typeof window === 'undefined' || !window.location) return false;
  const { hostname, search } = window.location;
  if (new URLSearchParams(search || '').get('debug') === '1') return true;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
})();

const debugLog = (...args) => { if (DEBUG_ENABLED) console.log(...args); };

    /** @jsxRuntime classic */
    const { useState, useEffect, useMemo, useRef } = React;
    const OMG = window.OriginalMapGame;
    const GameSync = window.GameSync;
    const scheduleServerSync = window.scheduleServerSync;
    const flushServerSync = window.flushServerSync;

    function loadJsonStorage(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        if (raw === null) return fallback;
        return JSON.parse(raw);
      } catch (e) {
        console.warn('[storage] 손상된 저장값 제거:', key, e);
        localStorage.removeItem(key);
        return fallback;
      }
    }

    /**
     * 이름 사전 찾기.
     * 데이터 표(originalMapData.js)는 한국어 원문을 그대로 들고 있고 세이브에도 그
     * 값이 들어간다(메인보드·다운로드 대상). 그래서 표를 번역하지 않고 **화면에 낼
     * 때만** index/id 로 사전을 찾는다 — 사전에 없으면 원문이 그대로 나온다.
     */
    const workTaskName = (task) => (task ? tOr('omg.work.' + task.taskIndex, task.name) : '');
    const gameName = (g) => (g ? tOr('omg.game.' + g.gameIndex, g.name) : '');
    const partyTierName = (idx, tier) => tOr('omg.party.' + idx, (tier && tier.name) || '');
    const boardName = (name) => {
      const i = (OMG.MOTHERBOARDS || []).findIndex((b) => b.name === name);
      return i >= 0 ? tOr('omg.mb.' + i, name) : name;
    };

    /** 로그 인자 자리에 들어가는 이름 — 그릴 때 옮기도록 표식으로 넘긴다. */
    const gameNameVar = (g) => ({ $k: 'key', key: 'omg.game.' + g.gameIndex, fallback: g.name });
    const partyTierVar = (idx) => ({
      $k: 'key',
      key: 'omg.party.' + idx,
      fallback: (OMG.PARTY_HUNTING_TIERS[idx] && OMG.PARTY_HUNTING_TIERS[idx].name) || ('T' + (idx + 1)),
    });

    /** 로그·피드는 {k, v} 로 쌓아 두고 그릴 때 옮긴다(언어를 바꾸면 옛 줄도 따라온다). */
    const renderLog = (entry) => (typeof entry === 'string' ? entry : t(entry.k, entry.v));

    if (!OMG || !OMG.WORK_TASKS) {
      document.getElementById('root').innerHTML = (
        '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem;font-family:monospace;color:#fca5a5;text-align:center">'
        + '<div><p style="font-size:1.1rem;margin-bottom:0.5rem">' + t('boot.fail') + '</p>'
        + '<p style="color:#94a3b8;font-size:0.85rem">' + t('boot.failHint') + '</p></div></div>'
      );
      throw new Error('OriginalMapGame is not available');
    }

    class ErrorBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { error: null };
      }
      static getDerivedStateFromError(error) {
        return { error };
      }
      render() {
        if (this.state.error) {
          return (
            <div className="min-h-screen flex items-center justify-center p-6">
              <div className="max-w-lg w-full bg-rose-950/40 border border-rose-500/40 rounded-xl p-6 space-y-3 font-mono text-sm">
                <p className="text-rose-300 font-bold">{t('err.render')}</p>
                <p className="text-slate-300 break-words">{String(this.state.error && this.state.error.message || this.state.error)}</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 rounded bg-rose-500/20 border border-rose-500/50 text-rose-200"
                >
                  {t('err.reload')}
                </button>
              </div>
            </div>
          );
        }
        return this.props.children;
      }
    }

    // ======================================================================
    // 2D 사냥 전투 씬 (유즈맵풍 비주얼) — 기존 상태값을 읽어 그리기만 함
    //   props: units(교전 유닛), totalUnits(배치), monsterName, killTimeSec,
    //          attackSpeedSec, damage, respawning, active, accent
    //   게임 로직/밸런스는 전혀 건드리지 않는 순수 시각 레이어.
    // ======================================================================
    const HUNT_SCENE_ACCENTS = {
      cyan: { unit: '#22d3ee', edge: '#0e7490', bullet: '#a5f3fc', muzzle: '#ecfeff', glow: 'rgba(34,211,238,0.20)' },
      emerald: { unit: '#34d399', edge: '#047857', bullet: '#a7f3d0', muzzle: '#ecfdf5', glow: 'rgba(52,211,153,0.20)' },
    };
    const HUNT_SCENE_MOBS = ['👾', '🐛', '🦠', '👹', '🤖', '💀', '🐙', '👻', '🎃', '🐉'];

    function HuntScene({ units, totalUnits, monsterName, mobSeed, killTimeSec, attackSpeedSec, damage, respawning, active, accent }) {
      const canvasRef = useRef(null);
      const stateRef = useRef(null);
      const propsRef = useRef({});
      propsRef.current = { units, totalUnits, monsterName, mobSeed, killTimeSec, attackSpeedSec, damage, respawning, active, accent };

      useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const S = stateRef.current || (stateRef.current = {
          t: 0, w: 320, h: 150,
          bullets: [], particles: [], floats: [],
          monHp: 1, monHitFlash: 0, monShake: 0,
          dead: false, respawnT: 0, kills: 0, fireAcc: 0,
        });

        // 몹 이모지는 이름 해시로 고르는데, 언어를 바꿔도 같은 몹이 나오도록
        // 번역된 이름이 아니라 원문 이름(mobSeed)으로 해시한다.
        function mobFor(name) {
          if (!name) return '🏆';
          let hsum = 0;
          for (let i = 0; i < name.length; i++) hsum = (hsum + name.charCodeAt(i)) % 997;
          return HUNT_SCENE_MOBS[hsum % HUNT_SCENE_MOBS.length];
        }

        function resize() {
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const w = canvas.clientWidth || 320;
          const h = canvas.clientHeight || 150;
          canvas.width = Math.floor(w * dpr);
          canvas.height = Math.floor(h * dpr);
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          S.w = w; S.h = h;
        }
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(canvas);

        let raf = 0;
        let last = performance.now();

        function frame(now) {
          const dt = Math.min(0.05, (now - last) / 1000);
          last = now;
          S.t += dt;
          const p = propsRef.current;
          const col = HUNT_SCENE_ACCENTS[p.accent] || HUNT_SCENE_ACCENTS.cyan;
          const w = S.w, h = S.h;

          const drawnTotal = Math.max(0, Math.min(24, Math.round(p.totalUnits || 0)));
          const engaged = Math.max(0, Math.min(drawnTotal, Math.round(p.units || 0)));
          const alive = !!p.active && !!p.monsterName;
          const killSec = Math.max(0.4, p.killTimeSec || 2);
          const atkSec = Math.max(0.15, p.attackSpeedSec || 0.5);

          // 몬스터 위치(둥실둥실) — 처치 사이클
          const monX = w * 0.80;
          const monY = h * 0.48 + Math.sin(S.t * 1.6) * 4;

          // 유닛 대형 좌표 (좌측)
          const cols = 4;
          const rows = Math.max(1, Math.ceil(drawnTotal / cols));
          const bandL = 14, bandR = w * 0.34;
          const cellW = (bandR - bandL) / cols;
          const topY = 20, botY = h - 18;
          const cellH = rows > 1 ? (botY - topY) / (rows - 1) : 0;
          function unitPos(i) {
            const cx = i % cols, cy = Math.floor(i / cols);
            return {
              x: bandL + cx * cellW + cellW * 0.4 + Math.sin(S.t * 2 + i) * 1.2,
              y: topY + cy * cellH + Math.cos(S.t * 1.7 + i) * 1.2,
            };
          }

          // --- 업데이트 ---
          if (alive && !S.dead) {
            S.monHp -= dt / killSec;
            // 발사 (교전 유닛 수 / 공격속도)
            S.fireAcc += (engaged / atkSec) * dt;
            let guard = 0;
            while (S.fireAcc >= 1 && guard < 6) {
              S.fireAcc -= 1; guard++;
              const src = unitPos(Math.floor(Math.random() * Math.max(1, engaged)));
              const ang = Math.atan2(monY - src.y, monX - src.x);
              const spd = 460 + Math.random() * 120;
              S.bullets.push({ x: src.x + 8, y: src.y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life: 0.8 });
            }
            if (S.monHp <= 0) {
              S.monHp = 0; S.dead = true; S.respawnT = 0.55; S.kills++;
              for (let k = 0; k < 20; k++) {
                const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 180;
                S.particles.push({ x: monX, y: monY, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + Math.random() * 0.35, r: 1.5 + Math.random() * 2.5 });
              }
              S.floats.push({ x: monX, y: monY - 18, txt: t('scene.kill'), life: 0.9, col: '#fca5a5' });
            }
          } else if (S.dead) {
            S.respawnT -= dt;
            if (S.respawnT <= 0) { S.dead = false; S.monHp = 1; }
          }

          // 총알 이동/피격
          for (let i = S.bullets.length - 1; i >= 0; i--) {
            const b = S.bullets[i];
            b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
            if (!S.dead && b.x >= monX - 10 && Math.abs(b.y - monY) < 16) {
              S.monHitFlash = 1; S.monShake = 3;
              for (let k = 0; k < 3; k++) {
                const a = Math.random() * Math.PI * 2, s = 30 + Math.random() * 60;
                S.particles.push({ x: monX - 8, y: b.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.25, r: 1 + Math.random() * 1.5 });
              }
              S.bullets.splice(i, 1); continue;
            }
            if (b.life <= 0 || b.x > w + 20) S.bullets.splice(i, 1);
          }
          if (S.bullets.length > 120) S.bullets.splice(0, S.bullets.length - 120);
          for (let i = S.particles.length - 1; i >= 0; i--) {
            const pt = S.particles[i];
            pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 140 * dt; pt.life -= dt;
            if (pt.life <= 0) S.particles.splice(i, 1);
          }
          for (let i = S.floats.length - 1; i >= 0; i--) {
            const f = S.floats[i]; f.y -= 24 * dt; f.life -= dt;
            if (f.life <= 0) S.floats.splice(i, 1);
          }
          S.monHitFlash = Math.max(0, S.monHitFlash - dt * 6);
          S.monShake = Math.max(0, S.monShake - dt * 18);

          // --- 렌더 ---
          ctx.clearRect(0, 0, w, h);
          // 배경
          const bg = ctx.createLinearGradient(0, 0, 0, h);
          bg.addColorStop(0, '#020617'); bg.addColorStop(1, '#0b1220');
          ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
          // 바닥 그리드
          ctx.strokeStyle = 'rgba(148,163,184,0.06)'; ctx.lineWidth = 1;
          for (let gx = 0; gx <= w; gx += 26) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke(); }
          ctx.strokeStyle = 'rgba(148,163,184,0.10)';
          ctx.beginPath(); ctx.moveTo(0, h - 12); ctx.lineTo(w, h - 12); ctx.stroke();

          // 유닛
          for (let i = 0; i < drawnTotal; i++) {
            const u = unitPos(i);
            const on = i < engaged && alive;
            ctx.save();
            ctx.translate(u.x, u.y);
            if (on) { ctx.shadowColor = col.glow; ctx.shadowBlur = 8; }
            ctx.fillStyle = on ? col.unit : 'rgba(100,116,139,0.5)';
            ctx.strokeStyle = on ? col.edge : 'rgba(71,85,105,0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(6, 0); ctx.lineTo(-5, -4); ctx.lineTo(-2, 0); ctx.lineTo(-5, 4);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.restore();
          }

          // 총알
          ctx.fillStyle = col.bullet;
          for (const b of S.bullets) {
            ctx.globalAlpha = Math.max(0.3, Math.min(1, b.life * 2));
            ctx.beginPath(); ctx.arc(b.x, b.y, 2.2, 0, Math.PI * 2); ctx.fill();
          }
          ctx.globalAlpha = 1;

          // 몬스터
          if (p.monsterName) {
            const sx = (Math.random() - 0.5) * S.monShake;
            const mx = monX + sx, my = monY;
            if (!S.dead) {
              ctx.save();
              ctx.font = '30px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
              ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              if (S.monHitFlash > 0.02) { ctx.shadowColor = '#fecaca'; ctx.shadowBlur = 16 * S.monHitFlash; }
              ctx.fillText(mobFor(p.mobSeed || p.monsterName), mx, my);
              ctx.restore();
              // HP 바
              const bw = 54, bh = 6, bx = monX - bw / 2, by = monY - 26;
              ctx.fillStyle = 'rgba(2,6,23,0.85)'; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
              ctx.fillStyle = 'rgba(148,163,184,0.25)'; ctx.fillRect(bx, by, bw, bh);
              ctx.fillStyle = '#f43f5e';
              ctx.fillRect(bx, by, bw * Math.max(0, S.monHp), bh);
            }
          } else {
            ctx.save();
            ctx.font = '28px "Segoe UI Emoji", sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.globalAlpha = 0.5;
            ctx.fillText('🏆', monX, monY);
            ctx.restore();
          }

          // 파티클
          for (const pt of S.particles) {
            ctx.globalAlpha = Math.max(0, Math.min(1, pt.life * 2.2));
            ctx.fillStyle = '#fb923c';
            ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); ctx.fill();
          }
          ctx.globalAlpha = 1;

          // 플로팅 텍스트
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.font = 'bold 12px ui-monospace, monospace';
          for (const f of S.floats) {
            ctx.globalAlpha = Math.max(0, Math.min(1, f.life * 1.4));
            ctx.fillStyle = f.col; ctx.fillText(f.txt, f.x, f.y);
          }
          ctx.globalAlpha = 1;

          // HUD 텍스트
          ctx.textAlign = 'left'; ctx.textBaseline = 'top';
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillStyle = 'rgba(226,232,240,0.9)';
          ctx.fillText((p.monsterName || t('scene.idle')) + '  ⚔ ' + t('scene.units', { a: engaged, b: drawnTotal }), 10, 8);
          ctx.textAlign = 'right';
          ctx.fillStyle = 'rgba(148,163,184,0.85)';
          ctx.fillText(t('scene.kills', { n: S.kills }) + (p.respawning > 0 ? t('scene.respawn', { n: p.respawning }) : ''), w - 10, 8);
          if (!alive && p.monsterName) {
            ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(148,163,184,0.7)';
            ctx.font = '11px ui-monospace, monospace';
            ctx.fillText(p.active === false ? t('scene.huntPaused') : '⏳', w / 2, h - 26);
          }

          raf = requestAnimationFrame(frame);
        }
        raf = requestAnimationFrame(frame);
        return () => { cancelAnimationFrame(raf); ro.disconnect(); };
      }, []);

      return (
        <canvas
          ref={canvasRef}
          className="w-full rounded-md border border-slate-800 bg-slate-950"
          style={{ height: '150px', display: 'block' }}
        />
      );
    }

    // ======================================================================
    // 2D 작업 씬 (유즈맵풍 비주얼) — 작업 유닛이 작업 건물을 두들겨 조립/완성.
    //   작업 건물은 반격하지 않음(유닛 사망 없음). 돌아가는 톱니(기계 작동감)로 사냥 씬과 차별화.
    //   props: units(교전), totalUnits(배치), taskName, cycleTimeSec, attackSpeedSec,
    //          respawning, active, accent — 게임 로직/밸런스는 건드리지 않는 순수 시각 레이어.
    // ======================================================================
    function WorkScene({ units, totalUnits, taskName, cycleTimeSec, attackSpeedSec, respawning, active, accent }) {
      const canvasRef = useRef(null);
      const stateRef = useRef(null);
      const propsRef = useRef({});
      propsRef.current = { units, totalUnits, taskName, cycleTimeSec, attackSpeedSec, respawning, active, accent };

      useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const S = stateRef.current || (stateRef.current = {
          t: 0, w: 320, h: 150,
          bolts: [], particles: [], floats: [],
          prog: 0, hitFlash: 0, shake: 0, done: false, doneT: 0, cycles: 0, fireAcc: 0, gear: 0,
        });

        function resize() {
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const w = canvas.clientWidth || 320;
          const h = canvas.clientHeight || 150;
          canvas.width = Math.floor(w * dpr);
          canvas.height = Math.floor(h * dpr);
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          S.w = w; S.h = h;
        }
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(canvas);

        function roundRect(x, y, ww, hh, r) {
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.arcTo(x + ww, y, x + ww, y + hh, r);
          ctx.arcTo(x + ww, y + hh, x, y + hh, r);
          ctx.arcTo(x, y + hh, x, y, r);
          ctx.arcTo(x, y, x + ww, y, r);
          ctx.closePath();
        }

        function gear(cx, cy, R, teeth, ang, fill, stroke) {
          const inner = R * 0.72;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(ang);
          ctx.beginPath();
          const steps = teeth * 2;
          for (let i = 0; i <= steps; i++) {
            const a = (i / steps) * Math.PI * 2;
            const rr = (i % 2 === 0) ? R : inner;
            const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fillStyle = fill; ctx.fill();
          ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke();
          ctx.beginPath(); ctx.arc(0, 0, R * 0.30, 0, Math.PI * 2);
          ctx.fillStyle = '#020617'; ctx.fill(); ctx.stroke();
          ctx.restore();
        }

        let raf = 0;
        let last = performance.now();

        function frame(now) {
          const dt = Math.min(0.05, (now - last) / 1000);
          last = now;
          S.t += dt;
          const p = propsRef.current;
          const col = HUNT_SCENE_ACCENTS[p.accent] || HUNT_SCENE_ACCENTS.emerald;
          const w = S.w, h = S.h;

          const drawnTotal = Math.max(0, Math.min(24, Math.round(p.totalUnits || 0)));
          const engaged = Math.max(0, Math.min(drawnTotal, Math.round(p.units || 0)));
          const working = !!p.active && !!p.taskName && engaged > 0;
          const cycleSec = Math.max(0.4, p.cycleTimeSec || 2);
          const atkSec = Math.max(0.15, p.attackSpeedSec || 0.5);

          const bx = w * 0.80;
          const by = h * 0.50;

          const cols = 4;
          const rows = Math.max(1, Math.ceil(drawnTotal / cols));
          const bandL = 14, bandR = w * 0.34;
          const cellW = (bandR - bandL) / cols;
          const topY = 20, botY = h - 18;
          const cellH = rows > 1 ? (botY - topY) / (rows - 1) : 0;
          function unitPos(i) {
            const cx = i % cols, cy = Math.floor(i / cols);
            return {
              x: bandL + cx * cellW + cellW * 0.4 + Math.sin(S.t * 2 + i) * 1.2,
              y: topY + cy * cellH + Math.cos(S.t * 1.7 + i) * 1.2,
            };
          }

          // 톱니 회전(작동감) — 작업 중이면 빠르게
          S.gear += dt * (working ? 3.2 : 0.5);

          // --- 업데이트 ---
          if (working && !S.done) {
            S.prog += dt / cycleSec;
            S.fireAcc += (engaged / atkSec) * dt;
            let guard = 0;
            while (S.fireAcc >= 1 && guard < 6) {
              S.fireAcc -= 1; guard++;
              const src = unitPos(Math.floor(Math.random() * Math.max(1, engaged)));
              const ang = Math.atan2(by - src.y, bx - src.x);
              const spd = 420 + Math.random() * 120;
              S.bolts.push({ x: src.x + 8, y: src.y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life: 0.8 });
            }
            if (S.prog >= 1) {
              S.prog = 1; S.done = true; S.doneT = 0.5; S.cycles++;
              for (let k = 0; k < 18; k++) {
                const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 150;
                S.particles.push({ x: bx, y: by, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + Math.random() * 0.3, r: 1.5 + Math.random() * 2 });
              }
              S.floats.push({ x: bx, y: by - 26, txt: t('scene.done'), life: 0.9, col: col.bullet });
            }
          } else if (S.done) {
            S.doneT -= dt;
            if (S.doneT <= 0) { S.done = false; S.prog = 0; }
          }

          // 볼트 이동/피격
          for (let i = S.bolts.length - 1; i >= 0; i--) {
            const b = S.bolts[i];
            b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
            if (!S.done && b.x >= bx - 16 && Math.abs(b.y - by) < 20) {
              S.hitFlash = 1; S.shake = 2.5;
              for (let k = 0; k < 3; k++) {
                const a = Math.random() * Math.PI * 2, s = 30 + Math.random() * 60;
                S.particles.push({ x: bx - 14, y: b.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.22, r: 1 + Math.random() * 1.3 });
              }
              S.bolts.splice(i, 1); continue;
            }
            if (b.life <= 0 || b.x > w + 20) S.bolts.splice(i, 1);
          }
          if (S.bolts.length > 120) S.bolts.splice(0, S.bolts.length - 120);
          for (let i = S.particles.length - 1; i >= 0; i--) {
            const pt = S.particles[i];
            pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 130 * dt; pt.life -= dt;
            if (pt.life <= 0) S.particles.splice(i, 1);
          }
          for (let i = S.floats.length - 1; i >= 0; i--) {
            const f = S.floats[i]; f.y -= 24 * dt; f.life -= dt;
            if (f.life <= 0) S.floats.splice(i, 1);
          }
          S.hitFlash = Math.max(0, S.hitFlash - dt * 6);
          S.shake = Math.max(0, S.shake - dt * 16);

          // --- 렌더 ---
          ctx.clearRect(0, 0, w, h);
          const bgg = ctx.createLinearGradient(0, 0, 0, h);
          bgg.addColorStop(0, '#020617'); bgg.addColorStop(1, '#0b1220');
          ctx.fillStyle = bgg; ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = 'rgba(148,163,184,0.06)'; ctx.lineWidth = 1;
          for (let gx = 0; gx <= w; gx += 26) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke(); }
          ctx.strokeStyle = 'rgba(148,163,184,0.10)';
          ctx.beginPath(); ctx.moveTo(0, h - 12); ctx.lineTo(w, h - 12); ctx.stroke();

          // 유닛
          for (let i = 0; i < drawnTotal; i++) {
            const u = unitPos(i);
            const on = i < engaged && working;
            ctx.save();
            ctx.translate(u.x, u.y);
            if (on) { ctx.shadowColor = col.glow; ctx.shadowBlur = 8; }
            ctx.fillStyle = on ? col.unit : 'rgba(100,116,139,0.5)';
            ctx.strokeStyle = on ? col.edge : 'rgba(71,85,105,0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(6, 0); ctx.lineTo(-5, -4); ctx.lineTo(-2, 0); ctx.lineTo(-5, 4);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.restore();
          }

          // 볼트
          ctx.fillStyle = col.bullet;
          for (const b of S.bolts) {
            ctx.globalAlpha = Math.max(0.3, Math.min(1, b.life * 2));
            ctx.beginPath(); ctx.arc(b.x, b.y, 2.2, 0, Math.PI * 2); ctx.fill();
          }
          ctx.globalAlpha = 1;

          // 작업 건물(본체 타워 + 맞물려 도는 톱니 2개)
          const shakeX = (Math.random() - 0.5) * S.shake;
          const tx = bx + shakeX;
          const twW = 34, twH = 46, twX = tx - twW / 2, twY = by - twH / 2 + 6;
          ctx.save();
          if (S.hitFlash > 0.02) { ctx.shadowColor = col.muzzle; ctx.shadowBlur = 14 * S.hitFlash; }
          ctx.fillStyle = 'rgba(15,23,42,0.95)';
          ctx.strokeStyle = col.edge; ctx.lineWidth = 1.5;
          roundRect(twX, twY, twW, twH, 4); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = 'rgba(148,163,184,0.25)'; ctx.lineWidth = 1;
          for (let sy = twY + 8; sy < twY + twH - 4; sy += 7) { ctx.beginPath(); ctx.moveTo(twX + 4, sy); ctx.lineTo(twX + twW - 4, sy); ctx.stroke(); }
          ctx.restore();
          gear(tx - 6, twY - 4, 9, 8, S.gear, col.unit, col.edge);
          gear(tx + 9, twY - 1, 6, 7, -S.gear * 1.3, col.edge, col.unit);

          // 작업 진행 바
          const pw = 54, ph = 6, pbx = bx - pw / 2, pby = by + 30;
          ctx.fillStyle = 'rgba(2,6,23,0.85)'; ctx.fillRect(pbx - 1, pby - 1, pw + 2, ph + 2);
          ctx.fillStyle = 'rgba(148,163,184,0.25)'; ctx.fillRect(pbx, pby, pw, ph);
          ctx.fillStyle = col.unit;
          ctx.fillRect(pbx, pby, pw * Math.max(0, Math.min(1, S.prog)), ph);

          // 파티클
          for (const pt of S.particles) {
            ctx.globalAlpha = Math.max(0, Math.min(1, pt.life * 2.2));
            ctx.fillStyle = col.bullet;
            ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); ctx.fill();
          }
          ctx.globalAlpha = 1;

          // 플로팅 텍스트
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.font = 'bold 12px ui-monospace, monospace';
          for (const f of S.floats) {
            ctx.globalAlpha = Math.max(0, Math.min(1, f.life * 1.4));
            ctx.fillStyle = f.col; ctx.fillText(f.txt, f.x, f.y);
          }
          ctx.globalAlpha = 1;

          // HUD
          ctx.textAlign = 'left'; ctx.textBaseline = 'top';
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillStyle = 'rgba(226,232,240,0.9)';
          ctx.fillText((p.taskName || t('scene.workIdle')) + '  🔧 ' + t('scene.units', { a: engaged, b: drawnTotal }), 10, 8);
          ctx.textAlign = 'right';
          ctx.fillStyle = 'rgba(148,163,184,0.85)';
          ctx.fillText(t('scene.cycles', { n: S.cycles }) + (p.respawning > 0 ? t('scene.respawn', { n: p.respawning }) : ''), w - 10, 8);
          if (!working && p.taskName) {
            ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(148,163,184,0.7)';
            ctx.fillText(p.active === false ? t('scene.workPaused') : '⏳', w / 2, h - 26);
          }

          raf = requestAnimationFrame(frame);
        }
        raf = requestAnimationFrame(frame);
        return () => { cancelAnimationFrame(raf); ro.disconnect(); };
      }, []);

      return (
        <canvas
          ref={canvasRef}
          className="w-full rounded-md border border-slate-800 bg-slate-950"
          style={{ height: '150px', display: 'block' }}
        />
      );
    }

    // 실시간 100층 보스 레이드 오버레이 모달 (App에서 분리 — 순수 프레젠테이션)
    function RaidModal({ raidState, myId, todayHighestClaimedFloor, rewardMessage, errorMessage, toggleReady, leaveRaidRoom, getRaidBossName, formatRemainingRewardRange, raidResult, onCloseResult }) {
      return (
            <div role="dialog" aria-modal="true" aria-label={t('raid.title')} className="fixed inset-0 bg-slate-950/90 flex items-end sm:items-center justify-center p-2 sm:p-4 z-50 backdrop-blur-sm">
              <div className="bg-slate-950 border border-cyan-500/30 rounded-2xl w-full max-w-4xl p-4 sm:p-6 neon-border-cyan flex flex-col space-y-4 sm:space-y-6 max-h-[92vh] sm:max-h-[90vh] overflow-y-auto min-w-0">

                <div className="flex justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shrink-0"></span>
                    <h2 className="text-sm sm:text-lg font-bold text-cyan-400 uppercase tracking-widest font-mono break-words">{t('raid.title')}</h2>
                  </div>
                  <button
                    aria-label={t('raid.leave')}
                    onClick={leaveRaidRoom}
                    className="p-2 hover:bg-slate-900 border border-slate-800 hover:border-rose-500/40 rounded-lg text-slate-400 hover:text-rose-500 transition"
                  >
                    <span aria-hidden="true" className="text-sm">❌</span>
                  </button>
                </div>

                {raidResult && (
                  <div className="flex flex-col items-center justify-center py-8 space-y-5 text-center">
                    <div className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-wider ${raidResult.won ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {raidResult.won ? t('raid.won') : t('raid.lost')}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl">
                      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
                        <div className="text-[11px] text-slate-500 font-mono uppercase tracking-wider">{t('raid.floorReached')}</div>
                        <div className="text-xl font-bold text-cyan-300 font-mono mt-1">{t('raid.floorN', { n: raidResult.floor })}</div>
                      </div>
                      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
                        <div className="text-[11px] text-slate-500 font-mono uppercase tracking-wider">{t('raid.thisRun')}</div>
                        <div className="text-xl font-bold text-amber-300 font-mono mt-1">SCA +{(raidResult.reward || 0).toLocaleString()}</div>
                      </div>
                      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
                        <div className="text-[11px] text-slate-500 font-mono uppercase tracking-wider">{t('raid.todayTop')}</div>
                        <div className="text-xl font-bold text-emerald-300 font-mono mt-1">{t('raid.floorN', { n: todayHighestClaimedFloor })}</div>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono">{t('raid.dailyNote', { range: formatRemainingRewardRange(todayHighestClaimedFloor) })}</p>
                    <button
                      type="button"
                      onClick={onCloseResult}
                      className="px-8 py-3 bg-cyan-500 hover:bg-cyan-400 active:scale-95 transition text-slate-950 font-bold rounded-lg font-mono text-sm shadow-lg shadow-cyan-500/20"
                    >
                      {t('raid.toLobby')}
                    </button>
                  </div>
                )}

                {errorMessage && (
                  <div className="p-3.5 bg-rose-950/20 border border-rose-500/50 rounded-lg text-xs font-mono text-rose-400 animate-pulse">
                    {t('raid.errorDetected', { msg: errorMessage })}
                  </div>
                )}

                {rewardMessage && (
                  <div className="p-4 bg-emerald-950/30 border border-emerald-400/50 rounded-lg text-center text-sm font-bold font-mono text-emerald-400 neon-border-emerald animate-bounce">
                    🎉 {rewardMessage}
                  </div>
                )}

                {!raidResult && raidState && raidState.status === 'waiting' && (
                  <div className="flex flex-col items-center justify-center py-10 space-y-6">
                    <p className="text-slate-400 font-mono text-center">
                      {t('raid.lobbyEnter')} <strong className="text-cyan-400">carry-room-100</strong><br />
                      <span className="text-slate-500">{t('raid.noCounter')}</span><br />
                      {t('raid.allReadyNote')}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                      {raidState.players.map((p) => {
                        const isMe = p.userId === myId;
                        return (
                          <div key={p.userId} className={`p-4 rounded-lg border ${isMe ? 'bg-cyan-950/10 border-cyan-500/40 neon-border-cyan' : 'bg-slate-900/40 border-slate-800'} flex flex-col justify-between items-center text-center space-y-3`}>
                            <div className="flex flex-col items-center">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isMe ? 'bg-cyan-500/10 text-cyan-400' : 'bg-slate-800 text-slate-400'} border border-slate-700`}>
                                <span className="text-lg">👤</span>
                              </div>
                              <span className="text-xs font-bold text-slate-200 mt-2 truncate max-w-[120px]">{p.nickname} {isMe && t('raid.me')}</span>
                              <span className="text-[11px] text-slate-500 font-mono">DPS: {p.dpsContribution.toLocaleString()}</span>
                            </div>

                            <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${p.isReady ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20' : 'bg-rose-950/40 text-rose-400 border border-rose-500/20'}`}>
                              {p.isReady ? t('raid.ready') : t('raid.waiting')}
                            </span>
                          </div>
                        );
                      })}

                      {Array.from({ length: 4 - raidState.players.length }).map((_, idx) => (
                        <div key={idx} className="p-4 bg-slate-950/20 border border-slate-900 border-dashed rounded-lg flex flex-col items-center justify-center text-center text-slate-700 min-h-[120px]">
                          <span className="text-lg text-slate-700">➕</span>
                          <span className="text-[11px] font-mono mt-1">{t('raid.emptySlot')}</span>
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={toggleReady}
                      className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition text-slate-950 font-bold rounded-lg font-mono text-sm shadow-lg shadow-emerald-500/20"
                    >
                      {raidState.players.find(p => p.userId === myId)?.isReady ? t('raid.cancelReady') : t('raid.setReady')}
                    </button>
                  </div>
                )}

                {!raidResult && raidState && (raidState.status === 'fighting' || raidState.status === 'won' || raidState.status === 'lost') && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    <div className="lg:col-span-2 flex flex-col space-y-6">
                      
                      <div className="bg-slate-950/80 border border-cyan-500/30 p-6 rounded-xl text-center neon-border-cyan flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="absolute top-2 left-3 text-[11px] font-mono text-cyan-500/40 uppercase">LIVE COMPUTE COMBAT MONITOR</div>
                        
                        <div className="text-xs font-mono uppercase tracking-widest text-slate-500">BOSS RAID STAGE</div>
                        <div className="text-2xl sm:text-4xl font-extrabold text-cyan-300 font-mono tracking-wider mt-1.5">
                          FLOOR {raidState.currentFloor} <span className="text-base sm:text-lg text-slate-500">/ 100</span>
                        </div>
                        <div className="text-xs font-bold text-rose-400 font-mono mt-2 animate-pulse uppercase tracking-wider">
                          {t('raid.target', { name: getRaidBossName(raidState.currentFloor) })}
                        </div>

                        {raidState.status === 'won' ? (
                          <span className="mt-3 text-xs font-bold text-emerald-400 uppercase tracking-widest font-mono border border-emerald-500/30 bg-emerald-950/20 px-3 py-1 rounded">{t('raid.statusWon')}</span>
                        ) : raidState.status === 'lost' ? (
                          <span className="mt-3 text-xs font-bold text-rose-400 uppercase tracking-widest font-mono border border-rose-500/30 bg-rose-950/20 px-3 py-1 rounded">{t('raid.statusLost')}</span>
                        ) : (
                          <span className="mt-3 text-xs font-bold text-cyan-400 uppercase tracking-widest font-mono border border-cyan-500/30 bg-cyan-950/20 px-3 py-1 rounded animate-pulse">{t('raid.statusFighting')}</span>
                        )}
                      </div>

                      <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-xl space-y-3 flex flex-col">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 text-xs">
                          <span className="font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1 shrink-0">
                            <span className="text-rose-500 text-sm">💀</span>
                            <span>{t('raid.bossHp')}</span>
                          </span>
                          <span className="text-rose-400 font-mono font-bold text-[11px] sm:text-xs break-all text-right">
                            {raidState.bossCurrentHp.toLocaleString()} / {raidState.bossMaxHp.toLocaleString()} ({Math.round((raidState.bossCurrentHp / raidState.bossMaxHp) * 100)}%)
                          </span>
                        </div>

                        <div className="w-full bg-slate-950 rounded-full h-5 overflow-hidden border border-slate-800 p-0.5">
                          <div 
                            className="bg-rose-500 h-full rounded-full transition-all duration-300 flex justify-end items-center pr-2 relative"
                            style={{ width: `${(raidState.bossCurrentHp / raidState.bossMaxHp) * 100}%` }}
                          >
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-xs font-mono pt-1 text-slate-500">
                          <span>{t('raid.timeLeft')}</span>
                          <span className={`font-bold ${raidState.timeLeft <= 10 ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`}>{t('raid.sec', { n: raidState.timeLeft })}</span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${raidState.timeLeft <= 10 ? 'bg-rose-500' : 'bg-slate-600'}`}
                            style={{ width: `${(raidState.timeLeft / 30) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-6">
                      
                      <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-xl flex flex-col space-y-4">
                        <h3 className="text-xs text-slate-400 font-bold uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center space-x-1">
                          <span className="text-cyan-400 text-sm mr-1">📊</span>
                          <span>{t('raid.contrib')}</span>
                        </h3>

                        <div className="space-y-4">
                          {raidState.players.map((p) => {
                            const isMe = p.userId === myId;
                            const share = raidState.totalDps > 0 ? (p.dpsContribution / raidState.totalDps) * 100 : 0;
                            return (
                              <div key={p.userId} className="space-y-1">
                                <div className="flex justify-between text-xs font-mono">
                                  <span className={`truncate max-w-[140px] ${isMe ? 'text-cyan-300 font-bold' : 'text-slate-300'}`}>
                                    {p.nickname} {isMe && t('raid.me')} {p.isDead && t('raid.dead')}
                                  </span>
                                  <span className="text-slate-500 font-bold">{p.dpsContribution.toLocaleString()} DPS</span>
                                </div>
                                
                                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-900">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-300 ${p.isDead ? 'bg-rose-500' : isMe ? 'bg-cyan-400' : 'bg-slate-700'}`}
                                    style={{ width: `${p.isDead ? 100 : share}%` }}
                                  ></div>
                                </div>
                                <div className="flex justify-between text-[11px] font-mono text-slate-500">
                                  <span>{p.isDead ? t('raid.unitDestroyed') : t('raid.share', { p: Math.round(share) })}</span>
                                  {p.currentHp !== undefined && (
                                    <span>HP: {p.currentHp} / {p.maxHp}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs font-mono">
                          <span className="text-slate-500">{t('raid.totalDps')}</span>
                          <span className="text-cyan-400 font-bold">{raidState.totalDps.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-xl flex flex-col space-y-3 font-mono">
                        <h3 className="text-xs text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center space-x-1">
                          <span className="text-cyan-300 text-sm mr-1">🏆</span>
                          <span>{t('raid.rewardLeft')}</span>
                        </h3>
                        <div className="flex flex-col space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500">{t('raid.milestones')}</span>
                            <span className="text-cyan-300 font-bold">{t('raid.milestoneRange')}</span>
                          </div>
                          <div className="flex justify-between text-sm text-slate-400">
                            <span>{t('raid.claimedTop')}</span>
                            <span className="text-cyan-300 font-bold">{t('raid.floorN', { n: todayHighestClaimedFloor })}</span>
                          </div>
                          <div className="flex justify-between text-sm text-slate-400">
                            <span>{t('raid.remainRange')}</span>
                            <span className="text-emerald-400 font-bold">
                              {formatRemainingRewardRange(todayHighestClaimedFloor)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-2 border-t border-slate-900 pt-2 leading-relaxed">
                            {t('raid.note1')}
                            <br />
                            {t('raid.note2')}
                          </p>
                        </div>
                      </div>

                    </div>

                  </div>
                )}

              </div>
            </div>
      );
    }

    // SettingsModal — App에서 분리한 순수 프레젠테이션 컴포넌트
    function SettingsModal({ isResettingAccount, setIsSettingsOpen, handleAccountReset }) {
      return (
            <div className="fixed inset-0 bg-slate-950/80 flex items-end sm:items-center justify-center p-3 sm:p-4 z-50 backdrop-blur-sm">
              <div className="bg-slate-950 border border-slate-700 rounded-2xl w-full max-w-md p-4 sm:p-6 flex flex-col space-y-5 shadow-xl max-h-[92vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest font-mono">{t('settings.title')}</h2>
                  <button
                    type="button"
                    onClick={() => !isResettingAccount && setIsSettingsOpen(false)}
                    disabled={isResettingAccount}
                    className="p-1.5 hover:bg-slate-900 border border-slate-800 rounded text-slate-400 hover:text-slate-200 disabled:opacity-40"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">{t('settings.account')}</h3>
                  <p className="text-xs text-slate-500 font-mono leading-relaxed">
                    {t('settings.resetDesc')}
                  </p>
                  <button
                    type="button"
                    onClick={handleAccountReset}
                    disabled={isResettingAccount}
                    className="w-full px-4 py-2.5 bg-rose-950/40 border border-rose-500/50 rounded-lg text-sm font-mono text-rose-300 hover:bg-rose-950/60 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isResettingAccount ? t('settings.resetting') : t('settings.reset')}
                  </button>
                </div>
              </div>
            </div>
      );
    }

    // OverclockLabModal — App에서 분리한 순수 프레젠테이션 컴포넌트
    function OverclockLabModal({ overclockData, overclockLabActive, overclockLabHp, overclockLabShield, overclockLabCooldown, overclockLabUnitDps, effectiveOverclockLabLevel, nextOverclockLabLevel, dpsForNextOverclockLab, effectiveUnitLimit, adjustOcParam, attemptOcUpgrade, testOcActivePart, selectOcPart, calcOcSuccessProb, handleAssignOverclockLabUnit, handleRecallOverclockLabUnit }) {
      return (
            <section className="mb-4 p-4 border border-emerald-500/20 rounded-xl space-y-3 bg-slate-950/60 font-mono">
              <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                <h2 className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
                  <span>{t('oc.title')}</span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-800/40">
                    {t('oc.farmLv', { lv: effectiveOverclockLabLevel })}
                  </span>
                </h2>
                <span className="text-[10px] text-slate-500">
                  {dpsForNextOverclockLab != null
                    ? t('oc.nextNeed', { lv: nextOverclockLabLevel, dps: dpsForNextOverclockLab.toLocaleString() })
                    : t('oc.maxFarm')}
                </span>
              </div>

              {/* 현재 해금된 영구 오버클럭 상태 */}
              <div className="text-[10px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                <div>{t('oc.ddr4')} <strong className={overclockData.ddr4Overclocked ? "text-emerald-400" : "text-slate-500"}>{overclockData.ddr4Overclocked ? t('oc.oc4000') : t('oc.locked')}</strong></div>
                <div>{t('oc.ddr5')} <strong className={overclockData.ddr5OverclockedStep > 0 ? "text-emerald-400" : "text-slate-500"}>
                  {overclockData.ddr5OverclockedStep === 1 ? t('oc.oc6000') :
                   overclockData.ddr5OverclockedStep === 2 ? t('oc.oc7200') :
                   overclockData.ddr5OverclockedStep === 3 ? t('oc.oc8000') : t('oc.locked')}
                </strong></div>
              </div>

              {/* 원작 맵: 오버클럭 연구소 1~4레벨 건물명 + 내구도 표기 */}
              <div className="border border-slate-900 rounded-lg overflow-hidden text-[10px] font-mono mobile-table-scroll">
                <div className="px-2 py-1.5 bg-slate-900/80 text-slate-400 text-[10px]">{t('oc.buildingSpec')}</div>
                <div className="grid grid-cols-5 gap-px bg-slate-900 text-center mobile-table-inner">
                  <div className="bg-slate-950 p-1.5 text-slate-500">{t('oc.level')}</div>
                  <div className="bg-slate-950 p-1.5 text-slate-500">HP</div>
                  <div className="bg-slate-950 p-1.5 text-slate-500">{t('oc.shield')}</div>
                  <div className="bg-slate-950 p-1.5 text-slate-500">{t('oc.defense')}</div>
                  <div className="bg-slate-950 p-1.5 text-slate-500">{t('oc.needDps')}</div>
                  {[1, 2, 3, 4].map((lv) => {
                    const b = OMG.OVERCLOCK_LAB_SPECS[lv];
                    const active = effectiveOverclockLabLevel === lv;
                    return (
                      <React.Fragment key={lv}>
                        <div className={`bg-slate-950 p-1.5 text-left ${active ? 'text-emerald-300 font-bold' : 'text-slate-400'}`}>
                          Lv.{lv}{active ? ' ◀' : ''}
                          <span className="block text-[9px] text-slate-600">{t('oc.labLv', { lv })}</span>
                        </div>
                        <div className={`bg-slate-950 p-1.5 ${active ? 'text-rose-300' : 'text-slate-300'}`}>{b.hp.toLocaleString()}</div>
                        <div className={`bg-slate-950 p-1.5 ${active ? 'text-cyan-300' : 'text-slate-300'}`}>{b.shield.toLocaleString()}</div>
                        <div className={`bg-slate-950 p-1.5 ${active ? 'text-amber-300' : 'text-slate-300'}`}>{b.defense}</div>
                        <div className={`bg-slate-950 p-1.5 ${active ? 'text-cyan-200' : 'text-slate-400'}`}>{b.minDps > 0 ? `≥${b.minDps.toLocaleString()}` : '—'}</div>
                      </React.Fragment>
                    );
                  })}
                </div>
                <p className="px-2 py-1 text-[9px] text-slate-600">{t('oc.dropNote', { sec: OMG.OVERCLOCK_LAB_RESPAWN_SEC })}</p>
              </div>

              {/* 연구소 건물 공격/파괴 패널 */}
              <div className="border border-slate-900 p-3 rounded-lg bg-slate-950/40 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">{t('oc.hpShield')}</span>
                  {!overclockLabActive ? (
                    <span className="text-slate-500 text-[10px] font-bold">{t('oc.noUnit')}</span>
                  ) : overclockLabCooldown > 0 ? (
                    <span className="text-amber-400 text-[10px] font-bold">{t('oc.respawning', { sec: overclockLabCooldown })}</span>
                  ) : (
                    <span className="text-emerald-400 text-[10px] font-bold">{t('oc.attacking')}</span>
                  )}
                </div>

                {overclockLabActive ? (
                  <div className="space-y-1.5 pt-1">
                    {/* Shield Bar */}
                    <div className="relative h-4 bg-slate-900 rounded overflow-hidden">
                      <div 
                        className="h-full bg-cyan-600 transition-all duration-300"
                        style={{ width: `${Math.max(0, Math.min(100, (overclockLabShield / (OMG.OVERCLOCK_LAB_SPECS[effectiveOverclockLabLevel]?.shield || 1000000)) * 100))}%` }}
                      ></div>
                      <div className="absolute inset-0 flex justify-between items-center px-2 text-[10px] text-white font-bold drop-shadow-md">
                        <span>Shield</span>
                        <span>{overclockLabShield.toLocaleString()} / {(OMG.OVERCLOCK_LAB_SPECS[effectiveOverclockLabLevel]?.shield || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* HP Bar */}
                    <div className="relative h-4 bg-slate-900 rounded overflow-hidden">
                      <div 
                        className="h-full bg-rose-600 transition-all duration-300"
                        style={{ width: `${Math.max(0, Math.min(100, (overclockLabHp / (OMG.OVERCLOCK_LAB_SPECS[effectiveOverclockLabLevel]?.hp || 2000000)) * 100))}%` }}
                      ></div>
                      <div className="absolute inset-0 flex justify-between items-center px-2 text-[10px] text-white font-bold drop-shadow-md">
                        <span>HP</span>
                        <span>{overclockLabHp.toLocaleString()} / {(OMG.OVERCLOCK_LAB_SPECS[effectiveOverclockLabLevel]?.hp || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                      <span>{t('oc.defenseVal', { n: OMG.OVERCLOCK_LAB_SPECS[effectiveOverclockLabLevel]?.defense })}</span>
                      <span>{t('oc.unitDps')} <strong className="text-cyan-400">{overclockLabUnitDps.toLocaleString()}</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRecallOverclockLabUnit}
                      className="w-full mt-1 py-1 text-[10px] border border-slate-800 rounded text-slate-400 hover:border-rose-500/40 hover:text-rose-300"
                    >
                      {t('oc.recall')}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 bg-slate-950/80 rounded border border-dashed border-slate-900">
                    <p className="text-[11px] text-slate-500 mb-2 text-center leading-relaxed">
                      {t('oc.assignDesc1a')}<strong className="text-emerald-400">{t('oc.oneUnit')}</strong>{t('oc.assignDesc1b')}<br />
                      {t('oc.assignDesc2')}
                    </p>
                    <button 
                      onClick={handleAssignOverclockLabUnit}
                      disabled={effectiveUnitLimit < 1}
                      className="px-3 py-1.5 text-xs bg-emerald-950 border border-emerald-800 rounded hover:bg-emerald-900 text-emerald-300 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      {t('oc.assign')}
                    </button>
                  </div>
                )}
              </div>

              {/* 미확인 재료 보관함 + 타이밍 조율 미니게임 */}
              {(() => {
                const parts = overclockData.overclockParts || [];
                const selected = parts.find(p => p.id === overclockData.overclockSelectedId) || null;
                return (
                  <div className="border border-emerald-900/30 p-3 rounded-lg bg-emerald-950/5 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-emerald-400 font-bold">{t('oc.vault')}</span>
                      <span className="text-slate-500">{t('oc.held', { n: parts.length })}</span>
                    </div>

                    {parts.length === 0 ? (
                      <div className="py-3 text-center text-slate-500 text-[11px]">
                        {t('oc.vaultEmpty')}<br />
                        {t('oc.vaultEmpty2')}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {parts.map((p) => {
                          const sel = p.id === overclockData.overclockSelectedId;
                          return (
                            <button key={p.id} onClick={() => selectOcPart(p.id)}
                              className={`px-2 py-1 rounded text-[10px] border font-mono ${sel ? 'bg-emerald-900/60 border-emerald-500 text-emerald-200' : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-emerald-700/50'}`}>
                              {t('oc.unknown', { gen: p.generation })}{p.tested ? ` ${Math.round(calcOcSuccessProb(p) * 100)}%` : ''}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {selected && (
                      <div className="border-t border-slate-900 pt-3 space-y-3">
                        <div className="text-[11px] text-emerald-300 font-bold">
                          {t('oc.tuning', { gen: selected.generation })} <span className="text-slate-500 font-normal">{t('oc.targetHidden')}</span>
                        </div>

                        {/* CL, tRCD, tRP, tRAS 가감 컨트롤러 */}
                        <div className="grid grid-cols-2 gap-3">
                          {['cl', 'trcd', 'trp', 'tras'].map((param) => {
                            const label = param.toUpperCase();
                            const currentVal = selected[param];
                            return (
                              <div key={param} className="flex items-center justify-between p-2 bg-slate-950/80 border border-slate-900 rounded text-xs">
                                <span className="text-slate-400 font-mono">{label}</span>
                                <div className="flex items-center gap-2">
                                  <button aria-label={t('oc.paramDown', { label })} onClick={() => adjustOcParam(param, -1)} className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded hover:text-emerald-400 font-bold">−</button>
                                  <span className="text-white font-bold w-6 text-center">{currentVal}</span>
                                  <button aria-label={t('oc.paramUp', { label })} onClick={() => adjustOcParam(param, 1)} className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded hover:text-emerald-400 font-bold">+</button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {selected.tested ? (
                          <div className="text-center text-xs bg-slate-950 border border-emerald-900/40 rounded py-2">
                            <span className="text-slate-400">{t('oc.successProb')}</span>
                            <strong className="text-emerald-300 text-base">{Math.round(calcOcSuccessProb(selected) * 100)}%</strong>
                          </div>
                        ) : (
                          <div className="text-center text-[10px] text-slate-600 py-1">{t('oc.testHint')}</div>
                        )}

                        <div className="flex gap-2">
                          <button
                            onClick={testOcActivePart}
                            className="flex-1 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded hover:border-emerald-500/40 text-emerald-400"
                          >
                            {t('oc.test')}
                          </button>
                          <button
                            onClick={attemptOcUpgrade}
                            disabled={!selected.tested}
                            className="flex-1 py-1.5 text-xs bg-emerald-950 border border-emerald-800/80 rounded hover:bg-emerald-900 text-emerald-300 font-bold disabled:opacity-40 disabled:pointer-events-none"
                          >
                            {t('oc.upgrade')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </section>
      );
    }

    // ScaCenterModal — App에서 분리한 순수 프레젠테이션 컴포넌트
    function ScaCenterModal({ scaUpgrades, gameSpeedFrames, gameSpeedMult, ramAttackFrames, renderScaShopButton }) {
      return (
            <section className="mb-4 p-3 sm:p-4 border border-cyan-500/20 rounded-xl space-y-3 min-w-0">
              <p className="text-xs font-mono text-cyan-300/80 break-words">{t('sca.rebirthStart')}<strong>{t('sca.wonAmount', { n: OMG.calcRebirthStartMinerals(scaUpgrades).toLocaleString() })}</strong>{t('sca.rebirthCap', { cap: t('sca.wonAmount', { n: OMG.REBIRTH_MINERAL_CAP.toLocaleString() }) })}<strong>{t('sca.rebirthPer10', { sca: OMG.REBIRTH_MINERAL_SCA_PER_10 })}</strong>{t('sca.rebirthFixed')}</p>
              <p className="text-xs font-mono text-cyan-300/70 break-words">{t('sca.speedLine', {
                frames: gameSpeedFrames,
                mult: gameSpeedMult.toFixed(2),
                ram: ramAttackFrames,
                dl: OMG.calcDownloadSpeedBonus(scaUpgrades).toFixed(1),
                mining: OMG.isMiningAmplifierUnlocked(scaUpgrades)
                  ? t('sca.miningOn', { power: OMG.getMiningPower(scaUpgrades).toLocaleString(), frames: OMG.getMiningAttackFrames(scaUpgrades) })
                  : t('sca.miningOff'),
              })}</p>
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 font-mono mb-2 uppercase tracking-wider">{t('sca.groupRebirth')}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {OMG.SCA_SHOP_ITEMS.filter((item) => item.mineralBonus).map(renderScaShopButton)}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 font-mono mb-2 uppercase tracking-wider">{t('sca.groupPermanent')}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {OMG.SCA_SHOP_ITEMS.filter((item) => !item.mineralBonus && item.shopGroup !== 'mining').map(renderScaShopButton)}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-amber-400/90 font-mono mb-2 uppercase tracking-wider">{t('sca.groupMining')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {OMG.SCA_SHOP_ITEMS.filter((item) => item.shopGroup === 'mining').map(renderScaShopButton)}
                  </div>
                </div>
              </div>
            </section>
      );
    }

    // HardwareMonitor — App에서 분리한 순수 프레젠테이션 컴포넌트
    function HardwareMonitor({ specs, cpu, gpu, gpuGrade, scaUpgrades, ram, ramSlots, effectiveRamGb, ramAttackFrames, cooler, motherboard, storage, joinRaidRoom, getCpuName, getGpuName, getRamName, getCoolerName, getStorageName, getSummonUnit }) {
      return (
            <section className="lg:col-span-5 bg-slate-900/40 p-4 sm:p-6 rounded-xl border border-slate-800 flex flex-col space-y-4 sm:space-y-6 min-w-0">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 border-b border-slate-800 pb-3">
                <h2 className="text-lg uppercase tracking-widest text-slate-300 font-mono flex items-center space-x-2">
                  <span className="text-emerald-400 text-lg mr-1.5">🖥️</span>
                  <span>{t('hw.title')}</span>
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">DDR {cpu.ddrGeneration} SYSTEM</span>
              </div>

              {(specs.penalties.isOverheated || specs.penalties.isSocketMismatched || specs.penalties.isDdrMismatched) && (
                <div className="p-4 bg-rose-950/20 border border-rose-500/50 rounded-lg neon-border-rose space-y-2.5 animate-pulse">
                  <h3 className="text-xs font-bold text-rose-500 uppercase tracking-widest font-mono flex items-center space-x-1.5">
                    <span className="text-lg mr-1">⚠️</span>
                    <span>{t('hw.warn')}</span>
                  </h3>
                  
                  {specs.penalties.isOverheated && (
                    <div className="text-xs text-rose-400 font-mono">
                      {t('hw.overheat', { demand: specs.cpuHeatDemand, capacity: cooler.coolingCapacity })}
                    </div>
                  )}

                  {specs.penalties.isSocketMismatched && (
                    <div className="text-xs text-rose-400 font-mono">
                      {t('hw.socket', { cpu: cpu.manufacturer, board: motherboard.socketManufacturer })}
                    </div>
                  )}

                  {specs.penalties.isDdrMismatched && (
                    <div className="text-xs text-rose-400 font-mono">
                      {t('hw.ddr', { rate: specs.penalties.hpDecayRate * 100 })}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
                <div className="p-3 bg-slate-950/60 rounded border border-slate-800 flex justify-between items-start gap-2 min-w-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500 font-mono">CPU PROCESSOR</p>
                    <p className="text-base font-semibold text-slate-200">{getCpuName(cpu.level)}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">{t('hw.grade', { lv: cpu.level })}</p>
                  </div>
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">{cpu.ddrGeneration}</span>
                </div>

                <div className="p-3 bg-slate-950/60 rounded border border-slate-800 flex justify-between items-start gap-2 min-w-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500 font-mono">GPU ENGINE</p>
                    <p className="text-base font-semibold text-slate-200">{getGpuName(gpu.level, gpu)}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">{t('hw.gpuLine', { lv: gpu.level, grade: OMG.getGpuGradeName(gpuGrade), atk: OMG.getGpuAttackPower(gpu, scaUpgrades) })}</p>
                  </div>
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-cyan-950/40 text-cyan-400 border border-cyan-500/20">PCI-E</span>
                </div>

                <div className="p-3 bg-slate-950/60 rounded border border-slate-800 flex justify-between items-start gap-2 min-w-0 md:col-span-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500 font-mono">SYSTEM RAM (MEM)</p>
                    <p className="text-base font-semibold text-slate-200 break-words">{getRamName(ram.level, ram)}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5 break-words">{t('hw.ramLine', {
                      lv: ram.level || 1,
                      oc: ram.ramVariant === 'overclock' ? ' OC' : '',
                      gb: effectiveRamGb,
                      slots: ramSlots,
                      per: ram.capacityGb,
                      mhz: ram.clockMhz,
                      frames: ramAttackFrames,
                      perf: OMG.getRamPerfPerUnit(ram),
                    })}</p>
                  </div>
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">{ram.ddrGeneration}</span>
                </div>

                <div className="p-3 bg-slate-950/60 rounded border border-slate-800 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-slate-500 font-mono">COOLING BLADE</p>
                    <p className="text-base font-semibold text-slate-200">{getCoolerName(cooler.level, cooler)}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">{t('hw.coolerLine', { kind: t(cooler.coolerKind === 'water' ? 'hw.water' : 'hw.air'), cap: cooler.coolingCapacity, lv: cooler.level })}</p>
                  </div>
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{t(cooler.coolerKind === 'water' ? 'hw.water' : 'hw.air')}</span>
                </div>

                <div className="p-3 bg-slate-950/60 rounded border border-slate-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 col-span-1 md:col-span-2">
                  <div>
                    <p className="text-xs text-slate-500 font-mono">MOTHERBOARD</p>
                    <p className="text-base font-semibold text-slate-200">{motherboard.name ? boardName(motherboard.name) : `${motherboard.socketManufacturer} Board`}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">{t('hw.boardLine', { mfr: motherboard.socketManufacturer, ddr: motherboard.supportedDdrGeneration, shield: motherboard.shieldIncrease })}</p>
                  </div>
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-cyan-950/40 text-cyan-400 border border-cyan-500/20">{motherboard.supportedDdrGeneration} SLOT</span>
                </div>

                <div className="p-3 bg-slate-950/60 rounded border border-slate-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 col-span-1 md:col-span-2">
                  <div>
                    <p className="text-xs text-slate-500 font-mono">STORAGE SYSTEM</p>
                    <p className="text-base font-semibold text-slate-200">{getStorageName(storage.level || 1, storage)}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">{t('hw.storageLine', {
                      lv: storage.level || 1,
                      gb: storage.capacityGb,
                      kind: (storage.storageKind === 'nvme' || storage.type === 'SSD') ? 'NVMe SSD' : 'HDD',
                      mult: specs.storageDownloadMult,
                    })}</p>
                  </div>
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{storage.type === 'SSD' ? 'SSD 4X FASTER' : 'HDD BASE'}</span>
                </div>
              </div>

              <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-lg flex flex-col space-y-3 font-mono">
                <h3 className="text-xs text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-1.5 flex items-center space-x-1">
                  <span className="text-emerald-400 text-sm mr-1">🛡️</span>
                  <span>{t('hw.manifest')}</span>
                </h3>
                <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('hw.unitLimit')}</span>
                    <span className="text-emerald-400 font-bold">{t('hw.unitsN', { n: specs.unitLimit })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('hw.ramWorkHunt')}</span>
                    <span className="text-emerald-400 font-bold">{t('hw.ramWorkHuntVal', { used: specs.workRamUsed, free: specs.huntRamFree, per: specs.gpuRamPerUnit })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('hw.huntUnits')}</span>
                    <span className="text-emerald-400 font-bold">{t('hw.unitsN', { n: specs.maxHuntingUnits })}</span>
                  </div>
                  <div className="flex justify-between col-span-2 text-cyan-300 font-semibold border-b border-slate-900 pb-1.5 mt-0.5">
                    <span>{t('hw.summon')}</span>
                    <span>{getSummonUnit(cpu.level).emoji} {getSummonUnit(cpu.level).name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('hw.unitHpShield')}</span>
                    <span className="text-emerald-400 font-bold">{specs.unitHp} / {specs.unitShield}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('hw.unitDamage')}</span>
                    <span className="text-emerald-400 font-bold">{specs.unitDamage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('hw.attackCycle')}</span>
                    <span className="text-cyan-400 font-bold">{t('hw.attackCycleVal', { sec: specs.attackSpeedSec, frames: specs.ramAttackFrames, mhz: specs.ramClockMhz, perf: OMG.getRamPerfPerUnit(specs.ram) })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('hw.unitDefense')}</span>
                    <span className="text-emerald-400 font-bold">{specs.unitDefense}</span>
                  </div>
                  <div className="flex justify-between col-span-2 border-t border-slate-900 pt-2 text-sm">
                    <span className="text-slate-500">{t('hw.dpsOne')}</span>
                    <span className="text-cyan-400 font-bold font-mono">
                      {OMG.calcUnitDps(specs.unitDamage, specs.attackSpeedSec).toLocaleString()} DPS
                    </span>
                  </div>
                  <div className="flex justify-between col-span-2 text-xs">
                    <span className="text-slate-500">{t('hw.dpsAll', { n: specs.unitLimit })}</span>
                    <span className="text-slate-400 font-mono">
                      {(OMG.calcUnitDps(specs.unitDamage, specs.attackSpeedSec) * specs.unitLimit).toLocaleString()} DPS
                    </span>
                  </div>
                  {(() => {
                    const _perf = OMG.calcPartyPerformanceScore({ cpu, gpu, ram, cooler, ramSlots }, scaUpgrades);
                    const _mine = OMG.getMiningPower(scaUpgrades);
                    return (
                      <div className="flex justify-between col-span-2 border-t border-slate-900 pt-2 text-sm">
                        <span className="text-slate-500">{t('hw.raidDps')}</span>
                        <span className="text-cyan-300 font-bold font-mono text-right">
                          {OMG.calcRaidPlayerDps(_perf, _mine).toLocaleString()}
                          <span className="block text-[9px] text-slate-500 font-normal">{t('hw.raidDpsBreak', { mining: OMG.calcRaidPlayerDps(0, _mine).toLocaleString(), hardware: OMG.calcRaidPlayerDps(_perf, 0).toLocaleString(), perf: _perf.toLocaleString() })}</span>
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="p-4 bg-slate-950/60 rounded border border-slate-800">
                <button 
                  onClick={joinRaidRoom}
                  className="w-full flex items-center justify-center space-x-2 py-3 bg-cyan-500 hover:bg-cyan-400 active:scale-95 transition text-slate-950 font-bold rounded-lg font-mono text-sm shadow-lg shadow-cyan-500/20"
                >
                  <span className="text-sm mr-1">⚔️</span>
                  <span>{t('raid.join')}</span>
                </button>
              </div>
            </section>
      );
    }

    // InventoryVault — App에서 분리한 순수 프레젠테이션 컴포넌트
    function InventoryVault({ inventory, isUpgrading, handleInventoryUpgrade, handleEquipComponent, handleSellComponent, getCpuName, getGpuName, getRamName, getCoolerName, getSummonUnit, getUpgradeProbability }) {
      return (
                  <div className="p-4 bg-slate-950/60 rounded border border-slate-800 col-span-2 space-y-3.5 mt-2 animate-fade-in">
                    <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                      <span className="text-xs font-bold text-emerald-400 font-mono tracking-widest uppercase flex items-center space-x-1.5 font-bold">
                        <span>{t('inv.title')}</span>
                      </span>
                      <span className="text-xs text-slate-500 font-mono">{t('inv.count', { n: inventory.length })}</span>
                    </div>

                    {inventory.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-600 font-mono border border-slate-900 border-dashed rounded">
                        {t('inv.empty')}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                        {inventory.map((p) => {
                          let partName = '';
                          let specDetail = '';
                          let badgeText = '';
                          let badgeStyle = '';

                          if (p.type === 'cpu') {
                            partName = getCpuName(p.level, p.manufacturer);
                            specDetail = t('inv.cpuSpec', { mfr: p.manufacturer, ddr: p.ddrGeneration });
                            badgeText = 'CPU';
                            badgeStyle = 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/20';
                          } else if (p.type === 'gpu') {
                            partName = getGpuName(p.level, p);
                            specDetail = t('inv.gpuSpec', { mult: getSummonUnit(p.level).dpsFactor.toFixed(1) });
                            badgeText = 'GPU';
                            badgeStyle = 'bg-cyan-950/50 text-cyan-400 border border-cyan-500/20';
                          } else if (p.type === 'ram') {
                            partName = getRamName(p.level, p);
                            specDetail = t('inv.ramSpec', { mhz: p.clockMhz, gb: p.capacityGb, ddr: p.ddrGeneration });
                            badgeText = 'RAM';
                            badgeStyle = 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/20';
                          } else if (p.type === 'cooler') {
                            partName = getCoolerName(p.level, p);
                            specDetail = t('inv.coolerSpec', { cap: p.coolingCapacity, def: p.level * 3 });
                            badgeText = 'COOLER';
                            badgeStyle = 'bg-rose-950/50 text-rose-400 border border-rose-500/20';
                          } else if (p.type === 'storage') {
                            partName = `${p.capacityGb}GB ${p.storageType}`;
                            specDetail = t('inv.storageSpec', { kind: t(p.storageType === 'SSD' ? 'inv.ssdFast' : 'inv.hddBase') });
                            badgeText = 'STORAGE';
                            badgeStyle = 'bg-slate-800 text-slate-300';
                          }

                          const isMax = p.level >= OMG.getMaxLevel(p.type, p);
                          const prob = isMax ? 0 : getUpgradeProbability(p.type, p.level, p);

                          return (
                            <div key={p.id} className="p-3 bg-slate-900/60 rounded border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-2">
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded font-bold ${badgeStyle}`}>
                                    {badgeText}
                                  </span>
                                  <span className="text-xs font-mono text-slate-500">{t('inv.level', { lv: p.level })}</span>
                                </div>
                                <p className="text-sm font-bold text-slate-200 truncate">{partName}</p>
                                <p className="text-[11px] text-slate-500 font-mono mt-0.5">{specDetail}</p>
                                <p className="text-[11px] text-amber-500/80 font-mono mt-1">
                                  {t('inv.prob', { p: Math.round(prob * 100) })}{!isMax && t('inv.explodeWarn')}
                                </p>
                              </div>
                              
                              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-950">
                                <button 
                                  onClick={() => handleInventoryUpgrade(p.id)}
                                  disabled={isUpgrading}
                                  className="flex-1 py-1 bg-emerald-500/10 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 border border-emerald-500/30 rounded text-[11px] font-bold font-mono transition disabled:opacity-50 text-center truncate"
                                >
                                  {isMax ? t('inv.max') : t('inv.upgrade')}
                                </button>
                                <button 
                                  onClick={() => handleEquipComponent(p.id)}
                                  className="flex-1 py-1 bg-cyan-500/10 hover:bg-cyan-500 hover:text-slate-950 text-cyan-400 border border-cyan-500/30 rounded text-[11px] font-bold font-mono transition text-center truncate"
                                >
                                  {t('inv.equip')}
                                </button>
                                <button 
                                  onClick={() => handleSellComponent(p.id)}
                                  className="flex-1 py-1 bg-rose-500/10 hover:bg-rose-500 hover:text-slate-950 text-rose-400 border border-rose-500/30 rounded text-[11px] font-bold font-mono transition text-center truncate"
                                >
                                  💰 {OMG.formatMineral(OMG.getShopSellPriceMinerals(p.type, p.level, p))}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
      );
    }

    // WorkPanel — App에서 분리한 순수 프레젠테이션 컴포넌트
    function WorkPanel({ clearableWorkCount, workParts, specs, ramAttackFrames, scaUpgrades, workTaskIndex, setWorkTaskIndex, workCoinPerKillPerUnit, workPerKillPerUnit, workUnitMode, maxWorkUnits, setManualWorkUnits, effectiveWorkUnits, setWorkUnitMode, workIncomeIsCoin, formatWorkCoinAsMinerals, workCoinIncomePerSec, workIncomePerSec, isPartyHunting, ramAlloc, workActiveForIncome, huntCombatStatus, workClearStatus, workKillTimeSec }) {
      return (
                  <div className="p-4 bg-slate-950/60 rounded border border-emerald-900/40 space-y-3">
                    <span className="text-xs text-emerald-400 font-mono uppercase font-bold">{t('work.title', { done: clearableWorkCount, total: OMG.WORK_TASKS.length })}</span>
                    <WorkScene
                      units={workActiveForIncome}
                      totalUnits={effectiveWorkUnits}
                      taskName={OMG.WORK_TASKS[workTaskIndex] ? workTaskName(OMG.WORK_TASKS[workTaskIndex]) : null}
                      cycleTimeSec={workKillTimeSec}
                      attackSpeedSec={specs.attackSpeedSec}
                      respawning={huntCombatStatus.workRespawning}
                      active={!isPartyHunting && workActiveForIncome > 0}
                      accent="emerald"
                    />
                    <div className="flex flex-wrap gap-2">
                      {OMG.WORK_TASKS.map((task) => {
                        const clear = OMG.canClearWorkTask(workParts, task.taskIndex, specs.unitDamage, ramAttackFrames, scaUpgrades);
                        const selectable = clear.ok;
                        const active = workTaskIndex === task.taskIndex;
                        const reason = OMG.getWorkTaskSpecReason(workParts, task.taskIndex, specs.unitDamage, ramAttackFrames, scaUpgrades);
                        return (
                          <button
                            key={task.name}
                            type="button"
                            disabled={!selectable}
                            onClick={() => selectable && setWorkTaskIndex(task.taskIndex)}
                            title={selectable ? t('work.tooltip', {
                              sec: clear.killSec.toFixed(1),
                              gb: task.requiredRamGb,
                              income: task.coinPerUnit ? OMG.formatCoinsAsMinerals(task.coinPerUnit) : OMG.formatMineral(task.mineralPerUnit),
                            }) : reason}
                            className={`text-xs px-2 py-1 rounded font-mono border ${active ? 'bg-emerald-600 border-emerald-500 text-white' : selectable ? 'bg-slate-900 border-slate-700 text-slate-300 hover:border-emerald-500/40' : 'bg-slate-950 border-slate-800 text-slate-600 opacity-50 cursor-not-allowed'}`}
                          >
                            {active ? '▶ ' : ''}{task.taskIndex + 1}. {workTaskName(task)}
                            {task.coinPerUnit ? (
                              <span className="block text-[10px] text-emerald-400/90">{t('work.perKillCoin', { income: OMG.formatCoinsAsMinerals(task.coinPerUnit) })}{workTaskIndex === task.taskIndex && workCoinPerKillPerUnit !== task.coinPerUnit ? t('work.perKillActual', { income: OMG.formatCoinsAsMinerals(workCoinPerKillPerUnit) }) : ''}</span>
                            ) : (
                              <span className="block text-[10px] text-emerald-400/90">{t('work.perKillMineral', { income: task.mineralPerUnit.toLocaleString() })}{workTaskIndex === task.taskIndex && workPerKillPerUnit !== task.mineralPerUnit ? t('work.perKillMineralActual', { income: workPerKillPerUnit }) : ''}</span>
                            )}
                            <span className="block text-[10px] opacity-70">{selectable ? t('work.killLine', { sec: clear.killSec.toFixed(1), gb: task.requiredRamGb }) : (clear.failures[0] || t('work.noClear'))}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span>{t('work.deploy')}</span>
                      <button type="button" aria-label={t('work.unitDown')} disabled={workUnitMode === 'auto' || maxWorkUnits <= 0} onClick={() => setManualWorkUnits((n) => Math.max(0, n - 1))} className="px-2 py-0.5 rounded border border-slate-700 bg-slate-900 text-slate-300 disabled:opacity-40">◀</button>
                      <strong className="text-emerald-400 font-mono">{t('work.unitsN', { n: effectiveWorkUnits })}</strong>
                      <span className="text-slate-500">{t('work.ofN', { n: maxWorkUnits })}</span>
                      <button type="button" aria-label={t('work.unitUp')} disabled={workUnitMode === 'auto' || maxWorkUnits <= 0} onClick={() => setManualWorkUnits((n) => Math.min(maxWorkUnits, n + 1))} className="px-2 py-0.5 rounded border border-slate-700 bg-slate-900 text-slate-300 disabled:opacity-40">▶</button>
                      <button type="button" onClick={() => setWorkUnitMode('auto')} className={`px-2 py-0.5 rounded border text-xs font-mono ${workUnitMode === 'auto' ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'border-slate-700 text-slate-400'}`}>{t('work.auto')}</button>
                      <button type="button" onClick={() => { setWorkUnitMode('manual'); setManualWorkUnits(effectiveWorkUnits); }} className={`px-2 py-0.5 rounded border text-xs font-mono ${workUnitMode === 'manual' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'border-slate-700 text-slate-400'}`}>{t('work.manual')}</button>
                    </div>
                    <p className="text-xs text-slate-400 break-words">
                      {workIncomeIsCoin ? (
                        <>
                          {t('work.perKill')}<strong className="text-emerald-400">{formatWorkCoinAsMinerals(workCoinPerKillPerUnit)}{t('work.perUnit')}</strong>
                          <span className="text-slate-500">{t('work.perSec')}<strong className="text-emerald-400">{OMG.formatMineral(workCoinIncomePerSec * OMG.MINERAL_PER_COIN)}</strong></span>
                        </>
                      ) : (
                        <>
                          {t('work.perKill')}<strong className="text-emerald-400">{OMG.formatMineral(workPerKillPerUnit)}{t('work.perUnit')}</strong>
                          <span className="text-slate-500">{t('work.perSec')}<strong className="text-emerald-400">{OMG.formatMineral(workIncomePerSec)}</strong></span>
                        </>
                      )}
                      {isPartyHunting ? t('work.partyOnStop') : ramAlloc.canRunWork ? (
                        <>
                          {t('work.engaged')}
                          <strong className="text-emerald-400">{workActiveForIncome}</strong>{t('work.slashUnits', { n: effectiveWorkUnits })}
                          {huntCombatStatus.workRespawning > 0 ? (
                            <span className="text-amber-400/90">{t('work.respawning', { n: huntCombatStatus.workRespawning })}</span>
                          ) : null}
                        </>
                      ) : workClearStatus.failures.length ? t('work.reasonPrefix', { reason: workClearStatus.failures[0] }) : t('work.noClearSuffix')}
                    </p>
                  </div>
      );
    }

    // GamingPanel — App에서 분리한 순수 프레젠테이션 컴포넌트
    function GamingPanel({ activeGame, effectiveUnlockedGameIndex, huntActiveForIncome, specs, huntKillTimeSec, huntCombatStatus, isDownloading, isPartyHunting, huntPerKillPerUnit, huntIncomePerSec, downloadTarget, downloadProgress, downloadValidation, startDownload, storage }) {
      return (
                  <div className="p-4 bg-slate-950/60 rounded border border-cyan-900/40 space-y-3">
                    <span className="text-xs text-cyan-400 font-mono uppercase font-bold">{t('game.title')}</span>
                    <p className="text-xs text-slate-300 font-bold">{t('game.hunting')}<strong className="text-cyan-300">{activeGame ? gameName(activeGame) : '—'}</strong>{t('game.unlocked', { n: effectiveUnlockedGameIndex + 1, total: OMG.GAME_HUNTING.length })}</p>
                    <HuntScene
                      units={huntActiveForIncome}
                      totalUnits={specs.maxHuntingUnits}
                      monsterName={activeGame ? gameName(activeGame) : null}
                      mobSeed={activeGame ? activeGame.name : null}
                      killTimeSec={huntKillTimeSec}
                      attackSpeedSec={specs.attackSpeedSec}
                      damage={specs.unitDamage}
                      respawning={huntCombatStatus.huntRespawning}
                      active={!isDownloading && !isPartyHunting && huntActiveForIncome > 0}
                      accent="cyan"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {OMG.GAME_HUNTING.map((g) => {
                        const unlocked = g.gameIndex <= effectiveUnlockedGameIndex;
                        const hunting = g.gameIndex === effectiveUnlockedGameIndex;
                        return (
                          <div key={g.gameIndex} className={`text-[10px] font-mono px-2 py-1 rounded border ${hunting ? 'border-cyan-500/50 bg-cyan-950/30 text-cyan-200' : unlocked ? 'border-emerald-900/40 bg-slate-900/60 text-slate-300' : 'border-slate-800 bg-slate-950/40 text-slate-600'}`}>
                            {unlocked ? '✓' : '🔒'} {gameName(g)}
                            <span className="text-emerald-500/90">{t('game.perKill', { income: OMG.formatMineral(g.mineralPerUnit) })}{hunting && huntPerKillPerUnit !== g.mineralPerUnit ? t('game.perKillActual', { income: OMG.formatMineral(huntPerKillPerUnit) }) : ''}</span>
                            {hunting ? <span className="text-cyan-400">{t('game.hunt')}</span> : null}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-slate-400 break-words">
                      {t('game.deploy')}<strong className="text-cyan-400">{t('hw.unitsN', { n: specs.maxHuntingUnits })}</strong>
                      {t('game.deployInfo', { free: specs.huntRamFree, per: specs.cpuHuntRamPerUnit, cores: specs.ramAllocation.maxByCpu, gpu: specs.gpuRamPerUnit })}
                      {isPartyHunting ? (
                        <span className="text-purple-300">{t('game.partyOnStop')}</span>
                      ) : (
                        <>
                          {t('game.engaged')}<strong className="text-cyan-400">{huntActiveForIncome}</strong>{t('work.slashUnits', { n: specs.maxHuntingUnits })}
                          {huntCombatStatus.huntRespawning > 0 ? (
                            <span className="text-amber-400/90">{t('game.respawning', { n: huntCombatStatus.huntRespawning })}</span>
                          ) : null}
                          {t('game.perKill2')}<strong className="text-cyan-400">{OMG.formatMineral(huntPerKillPerUnit)}{t('game.perUnit')}</strong>
                          <span className="text-slate-500">{t('game.perSec')}<strong className="text-cyan-400">{isDownloading ? t('game.zeroWon') : OMG.formatMineral(huntIncomePerSec)}</strong></span>
                        </>
                      )}
                    </p>
                    {downloadTarget ? (
                      <>
                        <div className="text-xs font-mono text-slate-400">{t('game.download')}<strong>{tOr('omg.game.' + downloadTarget.gameIndex, downloadTarget.name)}</strong>{t('game.downloadInfo', {
                          gb: downloadTarget.requiredGb,
                          free: specs.storageFreeGb,
                          used: specs.storageUsedGb,
                          total: storage.capacityGb,
                          cost: OMG.formatMineral(downloadTarget.mineralCost || 0),
                        })}</div>
                        <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800">
                          <div className="bg-cyan-500 h-full transition-all" style={{ width: `${downloadProgress}%` }} />
                        </div>
                        <div className="flex justify-between items-center text-xs font-mono">
                          <span className="text-slate-500">{specs.downloadSpeedMb} MB/s</span>
                          {!isDownloading ? (
                            <button type="button" onClick={startDownload} disabled={!downloadValidation.ok} title={downloadValidation.reason}
                              className={`px-2 py-1 rounded border ${downloadValidation.ok ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 'opacity-50 cursor-not-allowed text-slate-500 border-slate-800'}`}>
                              {t('game.downloadBtn')}
                            </button>
                          ) : <span className="text-cyan-400 animate-pulse">{t('game.downloading')}</span>}
                        </div>
                        {!downloadValidation.ok && !isDownloading && (
                          <p className="text-xs text-rose-400">{downloadValidation.reason}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-emerald-400 font-mono">{t('game.allDownloaded')}</p>
                    )}
                  </div>
      );
    }

    // PartyHuntingGround — App에서 분리한 순수 프레젠테이션 컴포넌트
    function PartyHuntingGround({ partyPerfScore, rebirthStat, partyMiningPower, isPartyHunting, handleTogglePartyHunting, partyHuntingTier, handlePartyTierSelect, handlePartyAuto, incomeBonusRate, scaUpgrades, partyElapsedSec }) {
      return (
              <div className="bg-slate-900/40 p-4 sm:p-6 rounded-xl border border-purple-900/40 flex flex-col space-y-4 min-w-0">
                <h2 className="text-base sm:text-lg uppercase tracking-widest text-slate-300 font-mono flex items-center space-x-2 border-b border-slate-800 pb-3">
                  <span className="text-purple-400 text-lg mr-1.5">👥</span>
                  <span>{t('party.title')}</span>
                </h2>
                <p className="text-xs text-slate-400 break-words">{t('party.desc', { perf: partyPerfScore.toLocaleString(), rebirth: rebirthStat.toLocaleString(), mining: partyMiningPower.toLocaleString() })}</p>
                <p className="text-[10px] text-slate-500 font-mono break-words">{t('party.desc2')}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={handleTogglePartyHunting} className={`text-sm px-3 py-1.5 rounded font-mono font-bold border ${isPartyHunting ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-950 border-slate-700 text-slate-300'}`}>{t(isPartyHunting ? 'party.on' : 'party.off')}</button>
                  <button type="button" onClick={() => handlePartyAuto('mineral')} className="text-xs px-2.5 py-1.5 rounded font-mono border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10">{t('party.optMineral')}</button>
                  <button type="button" onClick={() => handlePartyAuto('sca')} className="text-xs px-2.5 py-1.5 rounded font-mono border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10">{t('party.optSca')}</button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {OMG.PARTY_HUNTING_TIERS.map((tier, idx) => {
                    const access = OMG.evaluatePartyTierAccess(idx, partyPerfScore, rebirthStat, partyMiningPower);
                    const locked = !access.ok;
                    const up = OMG.calcPartyUptime(tier, partyMiningPower);
                    return (
                    <button key={tier.name} onClick={() => handlePartyTierSelect(idx)} disabled={!isPartyHunting || locked} title={locked ? access.failures.join(' · ') : t('party.tierTip', {
                      perf: tier.minPerfScore,
                      rebirth: tier.minRebirthStat.toLocaleString(),
                      mining: tier.minMiningPower.toLocaleString(),
                      counter: tier.bossThreat > 0 ? t('party.tierTipCounter', { up: Math.round(up * 100) }) : t('party.tierTipNoCounter'),
                    })} className={`p-2 rounded border text-[11px] font-mono text-left disabled:opacity-40 ${locked ? 'border-slate-900 bg-slate-950/50 text-slate-600' : partyHuntingTier === idx && isPartyHunting ? 'border-purple-500 bg-purple-950/30' : 'border-slate-800 bg-slate-950'}`}>{partyTierName(idx, tier)}{locked ? ' 🔒' : ''}<br/>{t('party.tierIncome', { mineral: OMG.calcPartyMineralPerTick(tier, incomeBonusRate), sca: tier.scaCoins })}{tier.bossThreat > 0 ? <span className={`block text-[9px] mt-0.5 ${up >= 0.7 ? 'text-emerald-400/80' : up >= 0.4 ? 'text-amber-400/80' : 'text-rose-400/80'}`}>{t('party.uptime', { up: Math.round(up * 100) })}</span> : null}{locked ? <span className="block text-[9px] text-rose-400/80 mt-0.5">{access.failures[0]}</span> : null}</button>
                    );
                  })}
                </div>
                {isPartyHunting && OMG.PARTY_HUNTING_TIERS[partyHuntingTier] && (() => {
                  const _tier = OMG.PARTY_HUNTING_TIERS[partyHuntingTier];
                  const _tickMs = OMG.calcPartyTickMs(scaUpgrades);
                  const _up = OMG.calcPartyUptime(_tier, partyMiningPower);
                  const _tickSec = Math.max(1, Math.round(_tickMs / 1000));
                  const _nextIn = _tickSec - (partyElapsedSec % _tickSec);
                  const _mins = Math.floor(partyElapsedSec / 60);
                  const _secs = partyElapsedSec % 60;
                  return (
                    <div className="space-y-1">
                      <p className="text-xs text-purple-300 font-mono">{t('party.selected', {
                        tier: partyTierName(partyHuntingTier, _tier),
                        sec: (_tickMs / 1000).toFixed(1),
                        mineral: Math.round(OMG.calcPartyMineralPerTick(_tier, incomeBonusRate) * _up).toLocaleString(),
                        sca: Math.round(_tier.scaCoins * _up).toLocaleString(),
                        uptime: _tier.bossThreat > 0 ? t('party.selectedUptime', { up: Math.round(_up * 100) }) : '',
                      })}</p>
                      <p className="text-xs text-purple-400/70 font-mono">{t('party.elapsed', {
                        elapsed: _mins > 0 ? t('party.elapsedMin', { m: _mins, s: _secs }) : t('party.elapsedSec', { s: _secs }),
                        next: _nextIn,
                      })}</p>
                    </div>
                  );
                })()}
              </div>
      );
    }

    // AutoStatusPanel — App에서 분리한 순수 프레젠테이션 컴포넌트
    function AutoStatusPanel({ autoStatus, autoFeed }) {
      return (
                      <div className="mt-2 p-3 rounded-lg border border-emerald-900/50 bg-slate-950/70 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-emerald-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                            {autoStatus.code === 'running' && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                            {autoStatus.code === 'waiting' && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
                            {autoStatus.code === 'manual' && <span className="w-2 h-2 rounded-full bg-cyan-400" />}
                            {(autoStatus.code === 'idle' || autoStatus.code === 'off') && <span className="w-2 h-2 rounded-full bg-slate-600" />}
                            {t('auto.live')}
                          </span>
                          <span className={`text-[10px] font-mono ${
                            autoStatus.code === 'running' ? 'text-emerald-400' :
                            autoStatus.code === 'waiting' ? 'text-amber-400' :
                            autoStatus.code === 'manual' ? 'text-cyan-400' :
                            'text-slate-500'
                          }`}>{autoStatus.msgKey ? t(autoStatus.msgKey) : autoStatus.message}</span>
                        </div>
                        <div className="max-h-24 overflow-y-auto space-y-0.5 font-mono text-[10px]">
                          {autoFeed.length === 0 ? (
                            <p className="text-slate-600 py-1">{t('auto.feedEmpty')}</p>
                          ) : autoFeed.map((item, i) => (
                            <div
                              key={`${item.ts}-${i}-${item.msgKey || item.message}`}
                              className={
                                item.kind === 'explosion' ? 'text-rose-400' :
                                item.kind === 'upgrade' ? 'text-emerald-400' :
                                item.kind === 'buy' ? 'text-cyan-300' :
                                item.kind === 'income' ? 'text-emerald-500/80' :
                                'text-slate-400'
                              }
                            >
                              {item.msgKey ? t(item.msgKey, item.msgVars) : item.message}
                            </div>
                          ))}
                        </div>
                      </div>
      );
    }

    // RamSlotShop — App에서 분리한 순수 프레젠테이션 컴포넌트
    function RamSlotShop({ ramSlots, effectiveRamGb, minerals, handlePurchaseRamSlots }) {
      return (
                    <div className="p-3 bg-slate-900/50 rounded border border-emerald-900/30 space-y-2 col-span-full">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-emerald-300 font-mono">{t('shop.ramSlots')}</span>
                        <span className="text-[11px] font-mono text-slate-400">{t('shop.ramSlotsNow')}<strong className="text-emerald-400">{t('shop.ramSlotsN', { n: ramSlots })}</strong>{t('shop.ramSlotsCap')}<strong className="text-emerald-400">{effectiveRamGb}GB</strong></span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {OMG.RAM_SLOT_UPGRADES.map((opt) => {
                          const owned = ramSlots >= opt.slots;
                          const canBuy = OMG.canPurchaseRamSlotUpgrade(ramSlots, opt.slots);
                          const affordable = minerals >= opt.cost;
                          return (
                            <button
                              key={opt.slots}
                              type="button"
                              disabled={owned || !canBuy}
                              onClick={() => handlePurchaseRamSlots(opt.slots)}
                              className={`px-3 py-2 rounded border text-xs font-mono font-bold transition ${owned ? 'bg-slate-950 border-slate-800 text-slate-600 cursor-default' : canBuy && affordable ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20' : 'bg-slate-950 border-slate-800 text-slate-500 cursor-not-allowed'}`}
                            >
                              {owned ? t('shop.ramSlotOwned', { n: opt.slots }) : t('shop.ramSlotBuy', { n: opt.slots, cost: OMG.formatMineral(opt.cost) })}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono">{t('shop.ramSlotNote')}</p>
                    </div>
      );
    }

    // ComponentBuyGrid — App에서 분리한 순수 프레젠테이션 컴포넌트
    function ComponentBuyGrid({ cpuBuyManufacturer, setCpuBuyManufacturer, coolerBuyKind, setCoolerBuyKind, storageBuyKind, setStorageBuyKind, getComponentBuyMeta, buyLevelIndex, adjustBuyLevel, minerals, handleBuyComponentPack, getMotherboardCatalog, motherboardBuyManufacturer, motherboardBuyIndex, setMotherboardBuyManufacturer, setMotherboardBuyIndex, adjustMotherboardBuyIndex, handlePurchaseMotherboard }) {
      return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-2.5 border-t border-slate-900">
                      {[
                        { type: 'cpu', emoji: '🧠', label: 'CPU', variants: (
                          <div className="flex gap-1">
                            {['Intel', 'AMD'].map((m) => (
                              <button key={m} type="button" onClick={() => setCpuBuyManufacturer(m)} className={`px-2 py-0.5 text-[11px] font-mono rounded border ${cpuBuyManufacturer === m ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>{m}</button>
                            ))}
                          </div>
                        ) },
                        { type: 'gpu', emoji: '🎮', label: 'GPU', variants: null },
                        { type: 'ram', emoji: '⚡', label: 'RAM', variants: null },
                        { type: 'cooler', emoji: '❄️', label: 'Cooler', variants: (
                          <div className="flex gap-1">
                            {[['air', t('hw.air')], ['water', t('hw.water')]].map(([k, label]) => (
                              <button key={k} type="button" onClick={() => setCoolerBuyKind(k)} className={`px-2 py-0.5 text-[11px] font-mono rounded border ${coolerBuyKind === k ? 'bg-rose-500/20 border-rose-500 text-rose-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>{label}</button>
                            ))}
                          </div>
                        ) },
                        { type: 'storage', emoji: '💾', label: 'Storage', variants: (
                          <div className="flex gap-1">
                            {[['hdd', 'HDD'], ['nvme', 'NVMe']].map(([k, label]) => (
                              <button key={k} type="button" onClick={() => setStorageBuyKind(k)} className={`px-2 py-0.5 text-[11px] font-mono rounded border ${storageBuyKind === k ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>{label}</button>
                            ))}
                          </div>
                        ) },
                      ].map(({ type, emoji, label, variants }) => {
                        const meta = getComponentBuyMeta(type);
                        const levels = OMG.getPurchasableLevels(type, meta);
                        if (!levels.length) return null;
                        const idx = Math.min(buyLevelIndex[type] || 0, levels.length - 1);
                        const level = levels[idx];
                        const catalog = OMG.getShopCatalog(type, meta);
                        const row = catalog.find((r) => r.level === level) || { name: '', costC: 0 };
                        const affordable = minerals >= row.costMinerals;
                        const buyDisabled = !affordable;
                        return (
                          <div key={type} className="p-2.5 bg-slate-900/40 rounded border border-slate-800 space-y-2 flex flex-col">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-200 font-mono shrink-0">{emoji} {label}</span>
                              {variants}
                            </div>
                            <div className="flex items-center gap-1">
                              <button type="button" aria-label={t('shop.prevLevel')} onClick={() => adjustBuyLevel(type, -1, levels.length)} disabled={idx <= 0} className={`px-2.5 py-2 rounded border text-xs font-bold ${idx <= 0 ? 'bg-slate-950 border-slate-900 text-slate-700 cursor-not-allowed' : 'bg-slate-950 border-slate-700 text-cyan-300 hover:border-cyan-500'}`}>◀</button>
                              <div className="flex-1 text-center px-1 py-1 bg-slate-950 rounded border border-slate-800 min-w-0">
                                <div className="text-sm font-bold text-cyan-200 font-mono">{t('shop.levelN', { n: level })}</div>
                                <div className="text-[10px] text-slate-400 font-mono truncate" title={row.name}>{row.name}</div>
                              </div>
                              <button type="button" aria-label={t('shop.nextLevel')} onClick={() => adjustBuyLevel(type, 1, levels.length)} disabled={idx >= levels.length - 1} className={`px-2.5 py-2 rounded border text-xs font-bold ${idx >= levels.length - 1 ? 'bg-slate-950 border-slate-900 text-slate-700 cursor-not-allowed' : 'bg-slate-950 border-slate-700 text-cyan-300 hover:border-cyan-500'}`}>▶</button>
                            </div>
                            <button type="button" onClick={() => handleBuyComponentPack(type, level)} disabled={buyDisabled} className={`w-full py-1.5 rounded text-xs font-bold font-mono border transition mt-auto ${buyDisabled ? 'bg-slate-950 border-slate-900 text-slate-600 cursor-not-allowed opacity-60' : 'bg-cyan-600/20 border-cyan-500 text-cyan-200 hover:bg-cyan-500/30'}`}>
                              {t('shop.buy', { cost: OMG.formatMineral(row.costMinerals) })}
                            </button>
                          </div>
                        );
                      })}
                      {(() => {
                        const boards = getMotherboardCatalog(motherboardBuyManufacturer);
                        const mbIdx = Math.min(motherboardBuyIndex, Math.max(0, boards.length - 1));
                        const board = boards[mbIdx];
                        const mbCost = board ? OMG.costToMinerals(board.cost) : 0;
                        const affordable = board && minerals >= mbCost;
                        return (
                          <div className="p-2.5 bg-slate-900/40 rounded border border-slate-800 space-y-2 flex flex-col">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-200 font-mono shrink-0">🔌 Motherboard</span>
                              <div className="flex gap-1">
                                {['Intel', 'AMD'].map((m) => (
                                  <button key={m} type="button" onClick={() => { setMotherboardBuyManufacturer(m); setMotherboardBuyIndex(0); }} className={`px-2 py-0.5 text-[11px] font-mono rounded border ${motherboardBuyManufacturer === m ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>{m}</button>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button type="button" aria-label={t('shop.prevBoard')} onClick={() => adjustMotherboardBuyIndex(-1)} disabled={mbIdx <= 0} className={`px-2.5 py-2 rounded border text-xs font-bold ${mbIdx <= 0 ? 'bg-slate-950 border-slate-900 text-slate-700 cursor-not-allowed' : 'bg-slate-950 border-slate-700 text-cyan-300 hover:border-cyan-500'}`}>◀</button>
                              <div className="flex-1 text-center px-1 py-1 bg-slate-950 rounded border border-slate-800 min-w-0">
                                <div className="text-sm font-bold text-cyan-200 font-mono truncate" title={boardName(board.name)}>{boardName(board.name)}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{t('shop.boardLine', { ddr: board.supportedDdrGeneration, shield: board.shieldIncrease.toLocaleString() })}</div>
                              </div>
                              <button type="button" aria-label={t('shop.nextBoard')} onClick={() => adjustMotherboardBuyIndex(1)} disabled={mbIdx >= boards.length - 1} className={`px-2.5 py-2 rounded border text-xs font-bold ${mbIdx >= boards.length - 1 ? 'bg-slate-950 border-slate-900 text-slate-700 cursor-not-allowed' : 'bg-slate-950 border-slate-700 text-cyan-300 hover:border-cyan-500'}`}>▶</button>
                            </div>
                            <button type="button" onClick={() => board && handlePurchaseMotherboard(board)} disabled={!affordable || !board} className={`w-full py-1.5 rounded text-xs font-bold font-mono border transition mt-auto ${!affordable ? 'bg-slate-950 border-slate-900 text-slate-600 cursor-not-allowed opacity-60' : 'bg-cyan-600/20 border-cyan-500 text-cyan-200 hover:bg-cyan-500/30'}`}>
                              {t('shop.buy', { cost: OMG.formatMineral(mbCost) })}
                            </button>
                          </div>
                        );
                      })()}
                    </div>
      );
    }

    // AutoBuyToggleGrid — App에서 분리한 순수 프레젠테이션 컴포넌트
    function AutoBuyToggleGrid({ autoBuyCpuByMfr, toggleAutoCpuMfr, autoBuyCoolerByKind, toggleAutoCoolerKind, autoBuyStorageByKind, toggleAutoStorageKind, autoBuyGpu, toggleAutoGpu, autoBuyRam, toggleAutoRam, buildBuyMetaForVariant, getComponentBuyMeta, getVariantAutoTarget, getAutoBuyLevel, adjustAutoTarget }) {
      return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2.5 border-t border-slate-900">
                      {[
                        { type: 'cpu', variantKey: 'Intel', label: 'Intel CPU', emoji: '🧠', on: autoBuyCpuByMfr.Intel, toggle: () => toggleAutoCpuMfr('Intel'), activeCls: 'bg-emerald-500/20 border-emerald-500 text-emerald-400' },
                        { type: 'cpu', variantKey: 'AMD', label: 'AMD CPU', emoji: '🧠', on: autoBuyCpuByMfr.AMD, toggle: () => toggleAutoCpuMfr('AMD'), activeCls: 'bg-emerald-500/20 border-emerald-500 text-emerald-400' },
                        { type: 'cooler', variantKey: 'air', label: t('hw.air'), emoji: '❄️', on: autoBuyCoolerByKind.air, toggle: () => toggleAutoCoolerKind('air'), activeCls: 'bg-rose-500/20 border-rose-500 text-rose-400' },
                        { type: 'cooler', variantKey: 'water', label: t('hw.water'), emoji: '❄️', on: autoBuyCoolerByKind.water, toggle: () => toggleAutoCoolerKind('water'), activeCls: 'bg-rose-500/20 border-rose-500 text-rose-400' },
                        { type: 'storage', variantKey: 'hdd', label: 'HDD', emoji: '💾', on: autoBuyStorageByKind.hdd, toggle: () => toggleAutoStorageKind('hdd'), activeCls: 'bg-cyan-500/20 border-cyan-500 text-cyan-400' },
                        { type: 'storage', variantKey: 'nvme', label: 'NVMe', emoji: '💾', on: autoBuyStorageByKind.nvme, toggle: () => toggleAutoStorageKind('nvme'), activeCls: 'bg-cyan-500/20 border-cyan-500 text-cyan-400' },
                        { type: 'gpu', variantKey: null, label: 'GPU', emoji: '🎮', on: autoBuyGpu, toggle: toggleAutoGpu, activeCls: 'bg-cyan-500/20 border-cyan-500 text-cyan-400' },
                        { type: 'ram', variantKey: null, label: 'RAM', emoji: '⚡', on: autoBuyRam, toggle: toggleAutoRam, activeCls: 'bg-emerald-500/20 border-emerald-500 text-emerald-400' },
                      ].map((row) => {
                        const buyMeta = row.variantKey != null ? buildBuyMetaForVariant(row.type, row.variantKey) : getComponentBuyMeta(row.type);
                        const goal = getVariantAutoTarget(row.type, row.variantKey);
                        const buyLv = getAutoBuyLevel(row.type, goal, buyMeta);
                        return (
                          <div key={`${row.type}-${row.variantKey || 'default'}`} className="flex flex-col space-y-1">
                            <button type="button" onClick={row.toggle} className={`py-1.5 text-[11px] font-bold font-mono rounded border transition flex items-center justify-center space-x-1 ${row.on ? row.activeCls : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                              <span>{row.emoji} {row.label} {t(row.on ? 'auto.on' : 'auto.off')}</span>
                            </button>
                            <div className="flex items-center justify-center gap-0.5 text-[10px] font-mono text-slate-500">
                              <button type="button" aria-label={t('auto.targetDown')} onClick={() => adjustAutoTarget(row.type, -1, row.variantKey)} className="px-1 py-0.5 bg-slate-900 border border-slate-800 rounded">−</button>
                              <span className="text-center leading-tight">{t('auto.targetLine', { cur: buyLv != null ? buyLv : '—', goal })}</span>
                              <button type="button" aria-label={t('auto.targetUp')} onClick={() => adjustAutoTarget(row.type, 1, row.variantKey)} className="px-1 py-0.5 bg-slate-900 border border-slate-800 rounded">+</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
      );
    }

    // ResourceBar — App에서 분리한 순수 프레젠테이션 컴포넌트 (상단 자원 바)
    function ResourceBar({ minerals, scaCoins, mineralFlash, rebirthCount, rebirthStat, rebirthIncomeMult, gameSpeedFrames, nickname, setIsSettingsOpen, onLogout }) {
      return (
          <header className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6 items-stretch bg-slate-900/60 p-3 sm:p-4 rounded-xl border border-emerald-500/20 neon-border-emerald min-w-0">
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/30">
                <span className="text-xl">🧠</span>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-sm text-slate-400 uppercase tracking-widest font-semibold">{t('res.title')}</h1>
                <p className="text-xs text-emerald-500 font-mono break-words">{t('res.rebirthLine', { count: rebirthCount, stat: rebirthStat.toLocaleString(), mult: rebirthIncomeMult.toFixed(2), frames: gameSpeedFrames })}</p>
                <p className="text-sm text-slate-400 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>👤 {nickname}</span>
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(true)}
                    className="px-2 py-0.5 text-xs border border-slate-600 rounded text-slate-300 hover:bg-slate-800"
                  >
                    {t('settings.title')}
                  </button>
                  <button
                    type="button"
                    onClick={toggleLang}
                    title={t('lang.switchTitle')}
                    className="px-2 py-0.5 text-xs border border-slate-600 rounded text-slate-300 hover:bg-slate-800"
                  >
                    🌐 {t('lang.other')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (onLogout) onLogout(); }}
                    className="px-2 py-0.5 text-xs border border-rose-500/40 rounded text-rose-300 hover:bg-rose-500/10"
                  >
                    {t('res.logout')}
                  </button>
                </p>
              </div>
            </div>

            <div className={`flex items-center justify-between p-3 bg-slate-950/80 rounded-lg border transition-colors duration-300 ${
              mineralFlash === 'gain' ? 'border-emerald-500/60 bg-emerald-950/30' :
              mineralFlash === 'spend' ? 'border-amber-500/60 bg-amber-950/20' :
              'border-slate-800'
            }`}>
              <span className="text-xs uppercase tracking-wider text-slate-400 font-mono">{t('res.minerals')}</span>
              <span className={`text-lg font-bold font-mono flex items-center space-x-1 transition-colors duration-300 ${
                mineralFlash === 'gain' ? 'text-emerald-300 scale-105' :
                mineralFlash === 'spend' ? 'text-amber-300' :
                'text-emerald-400'
              }`}>
                <span>{minerals.toLocaleString()}<span className="text-slate-500 text-xs ml-1">{t('res.won')}</span></span>
              </span>
            </div>


            <div className="flex items-center justify-between p-3 bg-slate-950/80 rounded-lg border border-cyan-500/30 neon-border-cyan">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
                <span className="text-xs uppercase tracking-wider text-cyan-300 font-mono">SCA CLOUD COINS</span>
              </div>
              <span className="text-lg font-bold text-cyan-300 font-mono">
                {scaCoins.toLocaleString()}
              </span>
            </div>
          </header>
      );
    }

    // IncomeLog — App에서 분리한 순수 프레젠테이션 컴포넌트 (수입 로그)
    function IncomeLog({ combatLogs, isPartyHunting }) {
      return (
              <div className="p-4 bg-slate-950/90 rounded border border-emerald-500/30 neon-border-emerald flex flex-col space-y-2.5">
                <div className="flex justify-between items-center border-b border-emerald-950 pb-2">
                  <span className="text-xs text-emerald-400 font-mono tracking-widest uppercase flex items-center space-x-1.5 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    <span>{t('log.title')}</span>
                  </span>
                  <span className="text-[11px] text-emerald-600 font-mono">{isPartyHunting ? 'PARTY' : 'WORK'}</span>
                </div>
                <div className="h-36 overflow-y-auto overscroll-contain font-mono text-xs text-emerald-400/90 space-y-1.5 select-text leading-relaxed">
                  {combatLogs.map((log, idx) => (
                    <div key={idx} className="transition-all duration-300 hover:text-emerald-300">{renderLog(log)}</div>
                  ))}
                </div>
              </div>
      );
    }

    // ======================================================================
    // useRaidSocket — 실시간 100층 레이드 소켓 서브시스템을 App에서 분리한 커스텀 훅.
    //   상태(isRaidOpen/socket/raidState/todayHighestClaimedFloor/rewardMessage/
    //   errorMessage/myId) + 핸들러(join/leave/toggleReady) + 진행도 로드를 캡슐화한다.
    //   부품 조립·scaUpgrades 및 레이드 밖 상태를 바꾸는 setScaCoins·setOverclockData·
    //   pushToast 는 인자로 받아 결합을 최소화. 동작은 App에 있던 것과 동일(위치만 이동).
    //   handleAccountReset 등 외부에서 소켓을 닫을 수 있도록 closeRaid()를 노출한다.
    // ======================================================================
    function useRaidSocket({ cpu, gpu, ram, cooler, motherboard, storage, scaUpgrades, setScaCoins, setOverclockData, pushToast }) {
      const [isRaidOpen, setIsRaidOpen] = useState(false);
      const [socket, setSocket] = useState(null);
      const [raidState, setRaidState] = useState(null);
      /** 서버 daily_raid_progresses — 오늘 이미 수령한 마일스톤 최고 층 (0, 10, … 100) */
      const [todayHighestClaimedFloor, setTodayHighestClaimedFloor] = useState(0);
      const [rewardMessage, setRewardMessage] = useState(null);
      const [errorMessage, setErrorMessage] = useState(null);
      const [raidResult, setRaidResult] = useState(null); // 레이드 종료 결과창 스냅샷 { won, floor, reward }
      const sessionRewardRef = useRef(0);   // 이번 레이드 세션 누적 보상(claimedCoins 합)
      const prevStatusRef = useRef(null);   // 직전 room_state.status (fighting→won/lost 전이 감지용)
      const [myId] = useState(() => {
        const saved = localStorage.getItem('sca_myId');
        // [고증 보안 패치] PostgreSQL UUID 규격 준수를 위한 클렌징 작업 (36글자 UUID 규격 준수 검사)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (saved !== null && uuidRegex.test(saved)) {
          return saved;
        }

        // 표준 RFC4122 v4 UUID 생성기
        const newId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });

        localStorage.setItem('sca_myId', newId);
        return newId;
      });

      const formatRemainingRewardRange = (claimedFloor) => {
        const claimed = Math.max(0, Math.min(100, claimedFloor || 0));
        if (claimed >= 100) return t('raid.rangeAllDone');
        return t('raid.rangeFrom', { from: claimed + 10 });
      };

      const refreshRaidProgress = async () => {
        if (!GameSync.hasSession()) return;
        try {
          const data = await GameSync.fetchRaidProgress();
          if (data && data.highestClaimedFloor != null) {
            setTodayHighestClaimedFloor(data.highestClaimedFloor);
          }
        } catch (e) { /* best-effort */ }
      };

      useEffect(() => {
        refreshRaidProgress();
      }, []);

      const joinRaidRoom = () => {
        setErrorMessage(null);
        setRewardMessage(null);
        setRaidResult(null);
        sessionRewardRef.current = 0;
        prevStatusRef.current = null;
        setIsRaidOpen(true);
        refreshRaidProgress();

        const socketCon = io({
          auth: GameSync.getSocketAuth(),
          reconnection: false
        });

        socketCon.on('connect', () => {
          debugLog('[Socket] Connected to server.');
          socketCon.emit('joinRoom', {
            roomId: 'carry-room-100',
            parts: { cpu, gpu, ram, cooler, motherboard, storage },
            scaUpgrades: scaUpgrades
          });
        });

        socketCon.on('connect_error', (err) => {
          setErrorMessage(translateServerError(err.message) || t('raid.connectFail'));
        });

        socketCon.on('room_state', (state) => {
          const prev = prevStatusRef.current;
          // 새 전투 시작(→fighting) 시 세션 누적·결과창 리셋
          if (state.status === 'fighting' && prev !== 'fighting') {
            sessionRewardRef.current = 0;
            setRaidResult(null);
          }
          // fighting → won/lost 전이 순간 결과를 스냅샷(7초 뒤 waiting 리셋이 덮어쓰기 전에)
          if (prev === 'fighting' && (state.status === 'won' || state.status === 'lost')) {
            setRaidResult({
              won: state.status === 'won',
              floor: state.currentFloor,
              reward: sessionRewardRef.current,
            });
          }
          prevStatusRef.current = state.status;
          setRaidState(state);
        });

        socketCon.on('milestone_reward_claimed', (data) => {
          const { clearedFloor, txResult } = data;
          if (txResult && txResult.newHighestFloor != null) {
            setTodayHighestClaimedFloor(txResult.newHighestFloor);
          }
          if (txResult.success) {
            const total = Number(txResult.currentTotalCoins) || 0;
            sessionRewardRef.current += Number(txResult.claimedCoins) || 0;
            setScaCoins(total);
            localStorage.setItem('sca_scaCoins', String(total));
            pushToast(t('raid.claimToast', { floor: clearedFloor, sca: txResult.claimedCoins.toLocaleString(), total: total.toLocaleString() }), 'success', 3500);
            setRewardMessage(t('raid.claimMsg', { floor: clearedFloor, sca: txResult.claimedCoins, total: total.toLocaleString() }));
            setTimeout(() => setRewardMessage(null), 4000);

            // 최고 층수 업데이트
            setOverclockData(prev => ({
              ...prev,
              highestRaidFloor: Math.max(prev.highestRaidFloor || 0, clearedFloor),
            }));
          } else if (txResult.message) {
            pushToast(t('raid.claimInfo', { msg: txResult.message }), 'info', 3000);
          }
        });

        socketCon.on('error_message', (msg) => {
          setErrorMessage(msg);
        });

        socketCon.on('disconnect', (reason) => {
          debugLog('[Socket] Disconnected:', reason);
          setErrorMessage(t('raid.disconnected', { reason }));
          setRaidState(null);
          setSocket(null);
        });

        setSocket(socketCon);
      };

      const leaveRaidRoom = () => {
        if (socket) {
          socket.disconnect();
        }
        setSocket(null);
        setRaidState(null);
        setIsRaidOpen(false);
      };

      const toggleReady = () => {
        if (socket && raidState) {
          const me = raidState.players.find(p => p.userId === myId);
          if (me) {
            socket.emit('readyStatus', { isReady: !me.isReady });
          }
        }
      };

      // 외부(handleAccountReset 등)에서 소켓을 안전하게 닫기 위한 캡슐화
      const closeRaid = () => {
        if (socket) socket.disconnect();
        setSocket(null);
        setRaidState(null);
        setIsRaidOpen(false);
      };

      // 결과창 닫기(클라 상태 — 서버 7초 자동 리셋과 독립)
      const closeResult = () => setRaidResult(null);

      return {
        isRaidOpen, raidState, todayHighestClaimedFloor, rewardMessage, errorMessage, myId,
        formatRemainingRewardRange, joinRaidRoom, leaveRaidRoom, toggleReady, closeRaid,
        raidResult, closeResult,
      };
    }

    // ======================================================================
    // UpgradeFX — 부품 강화 결과 2D 연출(전체화면 Canvas 오버레이, pointer-events 없음).
    //   성공=에메랄드/금빛 버스트 + "강화 성공!", 실패=붉은 폭발 + 파편 + "💥 파괴!".
    //   fx({seq,result}) 트리거의 seq 변화마다 재생하고, 파티클이 소멸하면 rAF를 멈춘다.
    //   상태값만 읽는 순수 시각 레이어 — 게임 로직/밸런스는 건드리지 않는다.
    // ======================================================================
    function UpgradeFX({ fx }) {
      const canvasRef = useRef(null);
      const apiRef = useRef(null);

      useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const S = { particles: [], shockwaves: [], floats: [], raf: 0, running: false, w: 0, h: 0, last: 0 };

        function sizeCanvas() {
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const w = canvas.clientWidth || window.innerWidth;
          const h = canvas.clientHeight || window.innerHeight;
          canvas.width = Math.floor(w * dpr);
          canvas.height = Math.floor(h * dpr);
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          S.w = w; S.h = h;
        }

        function loop(now) {
          const dt = Math.min(0.05, (now - (S.last || now)) / 1000);
          S.last = now;
          ctx.clearRect(0, 0, S.w, S.h);

          for (let i = S.shockwaves.length - 1; i >= 0; i--) {
            const sw = S.shockwaves[i];
            sw.r += 340 * dt; sw.life -= dt;
            if (sw.life <= 0) { S.shockwaves.splice(i, 1); continue; }
            ctx.globalAlpha = Math.max(0, Math.min(1, sw.life * 1.4));
            ctx.strokeStyle = sw.col; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2); ctx.stroke();
          }

          for (let i = S.particles.length - 1; i >= 0; i--) {
            const p = S.particles[i];
            p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.gravity * dt; p.vx *= 0.985; p.life -= dt;
            if (p.life <= 0) { S.particles.splice(i, 1); continue; }
            ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.7));
            ctx.fillStyle = p.col;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
          }

          ctx.globalAlpha = 1;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.font = 'bold 24px ui-monospace, monospace';
          for (let i = S.floats.length - 1; i >= 0; i--) {
            const f = S.floats[i]; f.y -= 30 * dt; f.life -= dt;
            if (f.life <= 0) { S.floats.splice(i, 1); continue; }
            ctx.globalAlpha = Math.max(0, Math.min(1, f.life * 1.3));
            ctx.fillStyle = f.col; ctx.shadowColor = f.col; ctx.shadowBlur = 14;
            ctx.fillText(f.txt, f.x, f.y);
            ctx.shadowBlur = 0;
          }
          ctx.globalAlpha = 1;

          if (S.particles.length || S.shockwaves.length || S.floats.length) {
            S.raf = requestAnimationFrame(loop);
          } else {
            ctx.clearRect(0, 0, S.w, S.h);
            S.running = false;
          }
        }

        function playBurst(result) {
          sizeCanvas();
          const cx = S.w / 2, cy = S.h * 0.42;
          const success = result === 'success';
          const N = success ? 44 : 58;
          for (let i = 0; i < N; i++) {
            const a = Math.random() * Math.PI * 2;
            const sp = (success ? 110 : 170) + Math.random() * (success ? 230 : 330);
            S.particles.push({
              x: cx, y: cy,
              vx: Math.cos(a) * sp,
              vy: Math.sin(a) * sp - (success ? 70 : 0),
              life: 0.7 + Math.random() * 0.6,
              r: 1.5 + Math.random() * (success ? 2.5 : 3.5),
              col: success
                ? (Math.random() < 0.5 ? '#34d399' : '#fde68a')
                : (Math.random() < 0.5 ? '#f87171' : '#fb923c'),
              gravity: success ? -26 : 280,
            });
          }
          S.shockwaves.push({ x: cx, y: cy, r: 4, life: 0.5, col: success ? 'rgba(52,211,153,0.8)' : 'rgba(248,113,113,0.85)' });
          S.floats.push({ x: cx, y: cy - 34, txt: t(success ? 'fx.upgradeOk' : 'fx.exploded'), life: 1.1, col: success ? '#6ee7b7' : '#fca5a5' });
          if (!S.running) { S.running = true; S.last = performance.now(); S.raf = requestAnimationFrame(loop); }
        }

        apiRef.current = { playBurst };

        return () => {
          if (S.raf) cancelAnimationFrame(S.raf);
          apiRef.current = null;
        };
      }, []);

      useEffect(() => {
        if (fx && apiRef.current) apiRef.current.playBurst(fx.result);
      }, [fx ? fx.seq : 0]);

      return (
        <canvas
          ref={canvasRef}
          className="fixed inset-0 pointer-events-none z-[60]"
          style={{ width: '100vw', height: '100vh' }}
          aria-hidden="true"
        />
      );
    }

    function App({ onLogout }) {
      // 언어가 바뀌면 트리 전체를 다시 그린다(새로고침 없이 — 진행 중인 게임을 잃지 않는다).
      useLang();
      // ----------------------------------------------------------------------
      // 1. 핵심 유저 재화 및 강화 피드백 상태 정의
      // ----------------------------------------------------------------------
      const [minerals, setMinerals] = useState(() => {
        const saved = localStorage.getItem('sca_minerals');
        return saved !== null ? parseInt(saved, 10) : 2000;
      });
      useEffect(() => {
        const legacy = localStorage.getItem('sca_normalCoins');
        if (!legacy) return;
        const coins = parseInt(legacy, 10);
        localStorage.removeItem('sca_normalCoins');
        if (coins > 0) setMinerals((m) => m + OMG.coinsToMinerals(coins));
      }, []);

      const [scaCoins, setScaCoins] = useState(() => {
        const saved = localStorage.getItem('sca_scaCoins');
        return saved !== null ? parseInt(saved, 10) : 0;
      });

      // 지능형 자동 구매 & 자동 강화 루프 토글 상태 신설
      const loadVariantAutoBuy = (storageKey, variantKeys, legacyKey) => {
        const defaults = Object.fromEntries(variantKeys.map((k) => [k, false]));
        try {
          const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
          if (saved && typeof saved === 'object') return { ...defaults, ...saved };
        } catch (e) { /* ignore */ }
        if (legacyKey && localStorage.getItem(legacyKey) === 'true') {
          return { ...defaults, [variantKeys[0]]: true };
        }
        return defaults;
      };
      const [autoBuyCpuByMfr, setAutoBuyCpuByMfr] = useState(() => loadVariantAutoBuy('sca_autoBuyCpuByMfr', ['Intel', 'AMD'], 'sca_autoBuyCpu'));
      const [autoBuyGpu, setAutoBuyGpu] = useState(() => localStorage.getItem('sca_autoBuyGpu') === 'true');
      const [autoBuyRam, setAutoBuyRam] = useState(() => localStorage.getItem('sca_autoBuyRam') === 'true');
      const [autoBuyCoolerByKind, setAutoBuyCoolerByKind] = useState(() => loadVariantAutoBuy('sca_autoBuyCoolerByKind', ['air', 'water'], 'sca_autoBuyCooler'));
      const [autoBuyStorageByKind, setAutoBuyStorageByKind] = useState(() => loadVariantAutoBuy('sca_autoBuyStorageByKind', ['hdd', 'nvme'], 'sca_autoBuyStorage'));

      // 확률 강화 피드백 — 고정 토스트(레이아웃 밀림·깜빡임 없음)
      const [upgradeStatus, setUpgradeStatus] = useState(null);
      const [upgradeMessage, setUpgradeMessage] = useState('');
      const [upgradeFx, setUpgradeFx] = useState(null); // 강화 결과 2D 연출 트리거 { seq, result }
      const toastTimerRef = useRef(null);
      const pushToast = (message, kind = 'info', ms = 2200) => {
        if (!message) return;
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setUpgradeMessage(message);
        setUpgradeStatus(kind);
        toastTimerRef.current = setTimeout(() => {
          setUpgradeStatus(null);
          setUpgradeMessage('');
          toastTimerRef.current = null;
        }, ms);
      };
      const [isUpgrading, setIsUpgrading] = useState(false);
      const [autoStatus, setAutoStatus] = useState({ code: 'off', msgKey: 'auto.statusOff' });
      const [autoFeed, setAutoFeed] = useState([]);
      const [mineralFlash, setMineralFlash] = useState(null);
      const mineralFlashTimerRef = useRef(null);
      const inventoryUiTimerRef = useRef(null);
      const pendingInventoryRef = useRef(null);
      const lastInventorySigRef = useRef('');
      const hasActiveAuto = useMemo(() => {
        const Sim = window.AutoSimulator;
        if (!Sim) return false;
        return Sim.hasActiveAuto({
          autoBuyCpuByMfr, autoBuyGpu, autoBuyRam, autoBuyCoolerByKind, autoBuyStorageByKind,
        });
      }, [autoBuyCpuByMfr, autoBuyGpu, autoBuyRam, autoBuyCoolerByKind, autoBuyStorageByKind]);

      const pulseMineralFlash = (kind) => {
        setMineralFlash(kind);
        if (mineralFlashTimerRef.current) clearTimeout(mineralFlashTimerRef.current);
        mineralFlashTimerRef.current = setTimeout(() => {
          setMineralFlash(null);
          mineralFlashTimerRef.current = null;
        }, 700);
      };

      const INVENTORY_UI_THROTTLE_MS = 1000;

      const inventorySignature = (inv) => {
        if (!inv || !inv.length) return '';
        return inv.map((p) => `${p.id}:${p.type}:${p.level}`).sort().join('|');
      };

      /** 시뮬 ref는 즉시, React 창고 UI는 AUTO 중 스로틀 (깜빡임 방지) */
      const flushInventoryUi = (nextInv, options = {}) => {
        const sig = inventorySignature(nextInv);
        gameStateRef.current.inventory = nextInv;
        if (!options.force && sig === lastInventorySigRef.current) return;

        if (inventoryUiTimerRef.current) {
          clearTimeout(inventoryUiTimerRef.current);
          inventoryUiTimerRef.current = null;
        }
        pendingInventoryRef.current = null;
        lastInventorySigRef.current = sig;
        setInventory(nextInv);
      };

      const scheduleInventoryUi = (nextInv, options = {}) => {
        const sig = inventorySignature(nextInv);
        gameStateRef.current.inventory = nextInv;
        if (!options.force && sig === lastInventorySigRef.current) return;

        const Sim = window.AutoSimulator;
        const autoOn = !options.force && Sim && Sim.hasActiveAuto(gameStateRef.current);
        if (autoOn && !options.catchUp) {
          pendingInventoryRef.current = nextInv;
          if (inventoryUiTimerRef.current) return;
          inventoryUiTimerRef.current = setTimeout(() => {
            inventoryUiTimerRef.current = null;
            const pending = pendingInventoryRef.current;
            if (!pending) return;
            const psig = inventorySignature(pending);
            if (psig === lastInventorySigRef.current) return;
            lastInventorySigRef.current = psig;
            setInventory(pending);
            pendingInventoryRef.current = null;
          }, INVENTORY_UI_THROTTLE_MS);
          return;
        }
        flushInventoryUi(nextInv, options);
      };

      useEffect(() => {
        if (!hasActiveAuto && pendingInventoryRef.current) {
          flushInventoryUi(pendingInventoryRef.current, { force: true });
        }
      }, [hasActiveAuto]);

      useEffect(() => {
        return () => {
          if (inventoryUiTimerRef.current) clearTimeout(inventoryUiTimerRef.current);
        };
      }, []);

      useEffect(() => {
        const onWalletSync = (e) => {
          const n = Number(e.detail && e.detail.scaCoins);
          if (!Number.isNaN(n)) setScaCoins(n);
        };
        window.addEventListener('sca_wallet_sync', onWalletSync);
        return () => window.removeEventListener('sca_wallet_sync', onWalletSync);
      }, []);

      const gameStateRef = useRef({});
      const wallClockRef = useRef({ lastMs: Date.now() });
      const hiddenAtRef = useRef(null);
      const partyClaimAtRef = useRef(0); // 파티 SCA 청구 스로틀 — game_states 행 락 경합(구매 지연) 방지
      const tickRemainderRef = useRef({ workHunt: 0, party: 0, auto: 0 });
      const [huntCombatStatus, setHuntCombatStatus] = useState({
        workTotal: 0, workActive: 0, workRespawning: 0,
        huntTotal: 0, huntActive: 0, huntRespawning: 0,
      });
      const [activeUpgradingPart, setActiveUpgradingPart] = useState(null);
      const [rebirthCount, setRebirthCount] = useState(() => {
        const saved = localStorage.getItem('sca_rebirthCount');
        return saved !== null ? parseInt(saved, 10) : 0;
      });
      const [rebirthStat, setRebirthStat] = useState(() => {
        const saved = localStorage.getItem('sca_rebirthStat');
        return saved !== null ? parseInt(saved, 10) : 0;
      });
      const defaultAutoTargets = {
        cpu: { Intel: 1, AMD: 1 },
        gpu: 1,
        ram: 1,
        cooler: { air: 1, water: 1 },
        storage: { hdd: 1, nvme: 1 },
      };
      const normalizeAutoTargetLevels = (raw) => {
        const out = JSON.parse(JSON.stringify(defaultAutoTargets));
        if (!raw || typeof raw !== 'object') return out;
        const nest = (type, keys) => {
          const v = raw[type];
          if (typeof v === 'number') keys.forEach((k) => { out[type][k] = v; });
          else if (v && typeof v === 'object') out[type] = { ...out[type], ...v };
        };
        nest('cpu', ['Intel', 'AMD']);
        nest('cooler', ['air', 'water']);
        nest('storage', ['hdd', 'nvme']);
        if (typeof raw.gpu === 'number') out.gpu = raw.gpu;
        if (typeof raw.ram === 'number') out.ram = raw.ram;
        return out;
      };
      const [autoTargetLevels, setAutoTargetLevels] = useState(() => {
        try {
          return normalizeAutoTargetLevels(JSON.parse(localStorage.getItem('sca_autoTargetLevels') || '{}'));
        } catch (e) { return defaultAutoTargets; }
      });
      const [scaUpgrades, setScaUpgrades] = useState(() => {
        try {
          return JSON.parse(localStorage.getItem('sca_scaUpgrades') || '{}');
        } catch (e) {
          return {};
        }
      });
      // OC 연구소 진행 상태 — sca_overclockData 키에 별도 저장하여 PUT /api/state 동기화에 포함
      const [overclockData, setOverclockData] = useState(() => {
        const defaults = { overclockLabActive: false, overclockParts: [], overclockSelectedId: null, highestRaidFloor: 0, ddr4Overclocked: false, ddr5OverclockedStep: 0 };
        try {
          const saved = JSON.parse(localStorage.getItem('sca_overclockData') || '{}');
          const merged = { ...defaults, ...saved };
          if (!Array.isArray(merged.overclockParts)) merged.overclockParts = [];
          // 구버전 단일 파츠(overclockActivePart) → 미확인 재료 배열로 마이그레이션
          if (saved.overclockActivePart && merged.overclockParts.length === 0) {
            merged.overclockParts = [{ ...saved.overclockActivePart, id: 'oc_legacy', tested: false }];
          }
          delete merged.overclockActivePart;
          return merged;
        } catch (e) {
          return defaults;
        }
      });
      const [showScaCenter, setShowScaCenter] = useState(false);
      const [showOverclockLab, setShowOverclockLab] = useState(false);
      const [overclockLabHp, setOverclockLabHp] = useState(0);
      const [overclockLabShield, setOverclockLabShield] = useState(0);
      const [overclockLabCooldown, setOverclockLabCooldown] = useState(0);
      const [partyHuntingTier, setPartyHuntingTier] = useState(0);
      const [isPartyHunting, setIsPartyHunting] = useState(false);
      const [partyElapsedSec, setPartyElapsedSec] = useState(0);
      const [cpuBuyManufacturer, setCpuBuyManufacturer] = useState('Intel');
      const [coolerBuyKind, setCoolerBuyKind] = useState('air');
      const [storageBuyKind, setStorageBuyKind] = useState('hdd');
      const [buyLevelIndex, setBuyLevelIndex] = useState({ cpu: 0, gpu: 0, ram: 0, cooler: 0, storage: 0 });
      const [motherboardBuyManufacturer, setMotherboardBuyManufacturer] = useState('Intel');
      const [motherboardBuyIndex, setMotherboardBuyIndex] = useState(0);

      // ----------------------------------------------------------------------
      // 2. 조립 컴퓨터 부품 상태 정의
      // ----------------------------------------------------------------------
      const [cpu, setCpu] = useState(() => loadJsonStorage('sca_cpu', { manufacturer: 'Intel', level: 1, ddrGeneration: 'DDR3' }));
      const [gpu, setGpu] = useState(() => loadJsonStorage('sca_gpu', { level: 1 }));
      const [ram, setRam] = useState(() => loadJsonStorage('sca_ram', { level: 1, clockMhz: 1333, capacityGb: 1, ddrGeneration: 'DDR3' }));
      const [ramSlots, setRamSlots] = useState(() => {
        const saved = localStorage.getItem('sca_ramSlots');
        const n = saved !== null ? parseInt(saved, 10) : 1;
        return OMG.getRamSlotCount(n);
      });
      const [cooler, setCooler] = useState(() => loadJsonStorage('sca_cooler', { level: 1, coolingCapacity: 500, coolerKind: 'air' }));
      const [motherboard, setMotherboard] = useState(() => loadJsonStorage('sca_motherboard', { name: '인텔 P55', socketManufacturer: 'Intel', supportedDdrGeneration: 'DDR3', shieldIncrease: 0 }));
      const [storage, setStorage] = useState(() => loadJsonStorage('sca_storage', { type: 'HDD', capacityGb: 60, level: 1, storageKind: 'hdd' }));

      const [inventory, setInventory] = useState(() => loadJsonStorage('sca_inventory', [
          { id: 'inv-cpu-1', type: 'cpu', level: 1, manufacturer: 'Intel', ddrGeneration: 'DDR3' },
          { id: 'inv-gpu-1', type: 'gpu', level: 1 },
          { id: 'inv-ram-1', type: 'ram', level: 1, clockMhz: 1333, capacityGb: 1, ddrGeneration: 'DDR3' },
          { id: 'inv-cooler-1', type: 'cooler', level: 1, coolingCapacity: 500, coolerKind: 'air' },
          { id: 'inv-storage-1', type: 'storage', level: 1, storageType: 'HDD', storageKind: 'hdd', capacityGb: 60 }
      ]));

      // 주의: 이 effect 는 반드시 inventory 선언 **아래**에 있어야 한다.
      // 의존성 배열 [inventory] 는 렌더 시점에 평가되므로, 선언보다 위에 두면
      // TDZ(ReferenceError: Cannot access 'inventory' before initialization)로
      // App 마운트가 통째로 죽는다 — 로그인 후 게임 화면에서만 터져서 늦게 발견됨.
      useEffect(() => {
        lastInventorySigRef.current = inventorySignature(inventory);
        gameStateRef.current.inventory = inventory;
      }, [inventory]);

      // ----------------------------------------------------------------------
      // 3. 사냥터 및 다운로드 진행 상태 정의
      // ----------------------------------------------------------------------
      const [workTaskIndex, setWorkTaskIndex] = useState(() => {
        const LEGACY_5_TO_11 = [0, 4, 5, 7, 10];
        const maxIdx = OMG.WORK_TASKS.length - 1;
        const saved = localStorage.getItem('sca_workTaskIndex');
        if (saved !== null) {
          let idx = parseInt(saved, 10);
          if (!localStorage.getItem('sca_workTask11Migrated') && idx >= 0 && idx <= 4) {
            idx = LEGACY_5_TO_11[idx] ?? idx;
            localStorage.setItem('sca_workTask11Migrated', '1');
          }
          return Math.max(0, Math.min(maxIdx, Number.isFinite(idx) ? idx : 0));
        }
        const legacy = localStorage.getItem('sca_huntingGround');
        if (legacy) { try { return Math.min(maxIdx, JSON.parse(legacy).groundIndex ?? 0); } catch (e) {} }
        return 0;
      });
      const [workUnitMode, setWorkUnitMode] = useState(() => localStorage.getItem('sca_workUnitMode') || 'auto');
      const [manualWorkUnits, setManualWorkUnits] = useState(() => {
        const saved = localStorage.getItem('sca_manualWorkUnits');
        return saved !== null ? parseInt(saved, 10) : 1;
      });
      const [unlockedGameIndex, setUnlockedGameIndex] = useState(() => {
        const saved = localStorage.getItem('sca_unlockedGameIndex');
        if (saved === null) return 0;
        const n = parseInt(saved, 10);
        return Number.isFinite(n) && n >= 0 ? n : 0;
      });
      const [isDownloading, setIsDownloading] = useState(() => {
        return localStorage.getItem('sca_isDownloading') === 'true';
      });
      const [downloadProgress, setDownloadProgress] = useState(0);
      const [downloadStartedAt, setDownloadStartedAt] = useState(() => {
        const saved = localStorage.getItem('sca_downloadStartedAt');
        return saved ? parseInt(saved, 10) : null;
      });
      const [downloadTarget, setDownloadTarget] = useState(() => {
        const saved = loadJsonStorage('sca_downloadTarget', null);
        if (saved) return saved;
        const t = OMG.DOWNLOAD_TARGETS[0];
        return { name: t.name, sizeMb: t.sizeMb, requiredGb: t.requiredGb, gameIndex: t.gameIndex };
      });

      // ----------------------------------------------------------------------
      // 4. 실시간 소켓 멀티플레이 레이드 상태 정의
      // ----------------------------------------------------------------------
      const {
        isRaidOpen, raidState, todayHighestClaimedFloor, rewardMessage, errorMessage, myId,
        formatRemainingRewardRange, joinRaidRoom, leaveRaidRoom, toggleReady, closeRaid,
        raidResult, closeResult,
      } = useRaidSocket({ cpu, gpu, ram, cooler, motherboard, storage, scaUpgrades, setScaCoins, setOverclockData, pushToast });
      const [isSettingsOpen, setIsSettingsOpen] = useState(false);
      const [isResettingAccount, setIsResettingAccount] = useState(false);
      const [nickname] = useState(() => {
        const saved = localStorage.getItem('sca_nickname');
        if (saved !== null) return saved;
        const newName = `Player_${Math.floor(100 + Math.random() * 900)}`;
        localStorage.setItem('sca_nickname', newName);
        return newName;
      });

      // 로그는 문장이 아니라 {k, v} 로 쌓는다 — 언어를 바꾸면 이미 쌓인 줄도 따라 바뀐다.
      const [combatLogs, setCombatLogs] = useState([
        { k: 'log.system1' },
        { k: 'log.system2' },
      ]);

      const getSummonUnit = (level) => {
        // 이름/이모지만 프론트에 두고, DPS 배율은 OMG(originalMapData.js) 단일 소스에서 읽는다(값 중복 금지).
        const emojis = {
          1: '🔫', 2: '👁️', 3: '🦀', 4: '🐍', 5: '💥', 6: '⚡', 7: '🛸',
          8: '🚢', 9: '🗡️', 10: '🌟', 11: '🌀', 12: '🧠', 13: '👹', 14: '✨',
        };
        const emoji = emojis[level] || '👽';
        const name = emojis[level] ? t('unit.' + level) : t('unit.unknown');
        return { name, emoji, dpsFactor: OMG.getCpuSummonDpsFactor({ level }) };
      };

      const getRaidBossName = (floor) => {
        const named = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
        if (named.includes(floor)) return t('boss.' + floor);
        return t('raid.bossFallback', { floor });
      };

      // ----------------------------------------------------------------------
      // 스타1 컴퓨터강화 유즈맵 고증 부품 이름 매핑 헬퍼
      // ----------------------------------------------------------------------
      const incomeBonusRate = useMemo(() => OMG.calcIncomeBonus(scaUpgrades), [scaUpgrades]);
      const probBonusRate = useMemo(() => OMG.calcProbBonus(scaUpgrades), [scaUpgrades]);
      const rebirthIncomeMult = useMemo(() => OMG.calcRebirthIncomeMultiplier(rebirthStat), [rebirthStat]);
      const gameSpeedFrames = useMemo(() => OMG.calcGameSpeedFrames(scaUpgrades), [scaUpgrades]);
      const gameSpeedMult = useMemo(() => OMG.calcGameSpeedMultiplier(scaUpgrades), [scaUpgrades]);
      const gpuGrade = useMemo(() => OMG.calcGpuGrade(scaUpgrades), [scaUpgrades]);
      const gpuAttackFrames = useMemo(() => OMG.calcGpuAttackFrames(scaUpgrades), [scaUpgrades]);
      const ramAttackFrames = useMemo(() => OMG.calcRamAttackFrames(ram), [ram.level, ram.clockMhz, ram.ramVariant, ram.ramOcStep]);

      const effectiveRamGb = useMemo(() => OMG.getRamEffectiveCapacityGb(ram, ramSlots), [ram, ramSlots]);
      const workParts = useMemo(() => ({ cpu, gpu, ram, cooler, storage, motherboard, ramSlots }), [cpu, gpu, ram, cooler, storage, motherboard, ramSlots]);
      const partyPerfScore = useMemo(
        () => OMG.calcPartyPerformanceScore(workParts, scaUpgrades),
        [workParts, scaUpgrades]
      );
      const partyMiningPower = useMemo(() => OMG.getMiningPower(scaUpgrades), [scaUpgrades]);
      const maxUnlockedPartyTier = useMemo(
        () => OMG.getMaxUnlockedPartyTierIndex(partyPerfScore, rebirthStat, partyMiningPower),
        [partyPerfScore, rebirthStat, partyMiningPower]
      );
      const effectiveUnitLimit = useMemo(() => {
        let limit = OMG.getCpuCores(cpu);
        if (cpu.manufacturer !== motherboard.socketManufacturer) {
          limit = Math.max(1, Math.floor(limit * 0.5));
        }
        return limit;
      }, [cpu, motherboard]);
      /** 연구소 공격에 차출된 1기를 제외한 작업·사냥 가용 유닛 상한 */
      const overclockLabActive = overclockData.overclockLabActive === true;
      const economyUnitLimit = Math.max(0, effectiveUnitLimit - (overclockLabActive ? 1 : 0));
      const workMineralMultiplier = useMemo(() => {
        const cpuHeatDemand = OMG.getCpuCoolingRequired(cpu);
        return cpuHeatDemand > cooler.coolingCapacity ? 0.5 : 1.0;
      }, [cpu, cooler]);
      const effectiveUnlockedGameIndex = useMemo(
        () => OMG.getEffectiveUnlockedGameIndex(unlockedGameIndex),
        [unlockedGameIndex]
      );
      const activeGame = useMemo(
        () => OMG.getGameHunt(effectiveUnlockedGameIndex),
        [effectiveUnlockedGameIndex]
      );
      const downloadValidation = useMemo(
        () => OMG.validateDownloadStart(workParts, unlockedGameIndex, downloadTarget, isDownloading, minerals),
        [workParts, unlockedGameIndex, downloadTarget, isDownloading, minerals]
      );

      const getCpuName = (level, m) => OMG.getPartName('cpu', level, { type: 'cpu', manufacturer: m || cpu.manufacturer });
      const getGpuName = (level, part) => OMG.getGpuDisplayName(level, part || gpu, scaUpgrades);
      const getRamName = (level, part) => OMG.getPartName('ram', level, part || ram);
      const getCoolerName = (level, part) => OMG.getPartName('cooler', level, part || cooler);
      const getStorageName = (level, part) => OMG.getPartName('storage', level, part || storage);

      // ----------------------------------------------------------------------
      // 5. 실시간 하드웨어 스펙 연산 (2단계 백엔드 공식과 100% 매칭)
      // ----------------------------------------------------------------------
      const specs = useMemo(() => {
        OMG.setScaUpgradesRef({ ...scaUpgrades, ...overclockData });
        // A. 과열 시스템 감지
        const cpuHeatDemand = OMG.getCpuCoolingRequired(cpu);
        const isOverheated = cpuHeatDemand > cooler.coolingCapacity;
        const mineralMultiplier = isOverheated ? 0.5 : 1.0;

        // B. 소켓 불일치 감지
        const isSocketMismatched = cpu.manufacturer !== motherboard.socketManufacturer;

        // C. DDR 세대 불일치 감지
        const ddrSet = new Set([cpu.ddrGeneration, ram.ddrGeneration, motherboard.supportedDdrGeneration]);
        const isDdrMismatched = ddrSet.size > 1;
        const hpDecayRate = isDdrMismatched ? (ddrSet.size === 2 ? 0.50 : 1.00) : 0.00;

        // D. 가용 유닛 수 상한
        let unitLimit = OMG.getCpuCores(cpu);
        if (isSocketMismatched) {
          unitLimit = Math.max(1, Math.floor(unitLimit * 0.5));
        }

        // E. GPU 공격력×CPU (공속은 RAM만)
        const unitDamage = Math.round(OMG.getGpuAttackPower(gpu, scaUpgrades) * getSummonUnit(cpu.level).dpsFactor);

        // F. RAM 분배: 작업 점유 후 잔여 RAM ÷ CPU 등급별 사냥 RAM·기 (코어 상한)
        const _workCap = OMG.evaluateWorkTaskCapacity(workParts, workTaskIndex);
        const _workUnitsForSpecs = workUnitMode === 'auto'
          ? OMG.calcOptimalWorkUnits(workParts, workTaskIndex, effectiveUnlockedGameIndex, economyUnitLimit, mineralMultiplier, rebirthIncomeMult, incomeBonusRate, isDownloading, unitDamage, ramAttackFrames, scaUpgrades)
          : Math.min(Math.max(0, manualWorkUnits), _workCap.activeWorkUnits || 0);
        const ramAllocation = OMG.calcRamAllocation(workParts, workTaskIndex, economyUnitLimit, _workUnitsForSpecs, scaUpgrades, unitDamage, ramAttackFrames);
        const maxHuntingUnits = ramAllocation.activeHuntingUnits;

        // G. 유닛 체력 및 메인보드 고정 실드
        const unitHp = 100 * cpu.level;
        const unitShield = motherboard.shieldIncrease;

        // H. 공격 주기 — 장착 RAM 공격 딜레이만
        const attackSpeedSec = Math.max(0.1, Math.round((ramAttackFrames / 24) * 100) / 100);

        // I. 방어력
        let unitDefense = cooler.level * 3;
        if (isOverheated) {
          unitDefense = Math.max(0, Math.floor(unitDefense * 0.5));
        }

        // J. 다운로드 속도 (§3.8 HDD x1 / NVMe x4 + SCA +10%)
        const storageDownloadMult = OMG.getStorageDownloadMultiplier(storage);
        const downloadSpeedMb = OMG.calcDownloadSpeedMb(storage, scaUpgrades);

        return {
          unitLimit,
          maxHuntingUnits,
          unitHp,
          unitShield,
          attackSpeedSec,
          unitDamage,
          unitDefense,
          downloadSpeedMb,
          storageDownloadMult,
          ramAllocation,
          workRamUsed: ramAllocation.workRamUsed,
          huntRamFree: ramAllocation.huntRamFree,
          gpuRamPerUnit: OMG.getGpuRamPerUnit(gpu, scaUpgrades),
          cpuHuntRamPerUnit: ramAllocation.huntRamPerUnit,
          storageUsedGb: OMG.calcStorageUsedGb(effectiveUnlockedGameIndex),
          storageFreeGb: OMG.getStorageFreeGb(storage, effectiveUnlockedGameIndex),
          gpuGrade,
          ram: ram,
          attackFrames: ramAttackFrames,
          ramAttackFrames,
          ramClockMhz: ram.clockMhz || 1333,
          gameSpeedFrames,
          cpuHeatDemand,
          penalties: {
            isOverheated,
            isSocketMismatched,
            isDdrMismatched,
            hpDecayRate,
            mineralMultiplier
          }
        };
      }, [cpu, gpu, ram, cooler, motherboard, storage, scaUpgrades, overclockData, gpuAttackFrames, ramAttackFrames, gpuGrade, workParts, workTaskIndex, economyUnitLimit, workUnitMode, manualWorkUnits, effectiveUnlockedGameIndex, rebirthIncomeMult, incomeBonusRate, isDownloading]);

      const workClearStatus = useMemo(
        () => OMG.canClearWorkTask(workParts, workTaskIndex, specs.unitDamage, ramAttackFrames, scaUpgrades),
        [workParts, workTaskIndex, specs.unitDamage, ramAttackFrames, scaUpgrades]
      );
      const maxWorkUnits = workClearStatus.ok ? workClearStatus.activeWorkUnits : 0;
      const clearableWorkCount = useMemo(
        () => OMG.countClearableWorkTasks(workParts, specs.unitDamage, ramAttackFrames, scaUpgrades),
        [workParts, specs.unitDamage, ramAttackFrames, scaUpgrades]
      );

      const overclockLabUnitDps = useMemo(
        () => OMG.calcOverclockLabUnitDps(specs.unitDamage, ram, scaUpgrades),
        [specs.unitDamage, ram, scaUpgrades]
      );

      const overclockLabFarmLevelBySpec = useMemo(
        () => OMG.calcMaxOverclockLabLevel(overclockLabUnitDps),
        [overclockLabUnitDps]
      );

      /** 스펙(차출 1기 DPS)으로 자동 결정되는 파밍 연구소 레벨 */
      const effectiveOverclockLabLevel = overclockLabFarmLevelBySpec;

      const nextOverclockLabLevel = overclockLabFarmLevelBySpec < 4 ? overclockLabFarmLevelBySpec + 1 : null;
      const dpsForNextOverclockLab = nextOverclockLabLevel
        ? OMG.OVERCLOCK_LAB_SPECS[nextOverclockLabLevel].minDps
        : null;

      const effectiveWorkUnits = useMemo(() => {
        if (!workClearStatus.ok || maxWorkUnits <= 0) return 0;
        if (workUnitMode === 'auto') {
          return OMG.calcOptimalWorkUnits(
            workParts, workTaskIndex, effectiveUnlockedGameIndex, economyUnitLimit,
            workMineralMultiplier, rebirthIncomeMult, incomeBonusRate, isDownloading,
            specs.unitDamage, ramAttackFrames, scaUpgrades
          );
        }
        return Math.min(Math.max(0, manualWorkUnits), maxWorkUnits);
      }, [workParts, workTaskIndex, workUnitMode, manualWorkUnits, maxWorkUnits, workClearStatus.ok, unlockedGameIndex, economyUnitLimit, workMineralMultiplier, rebirthIncomeMult, incomeBonusRate, isDownloading, specs.unitDamage, ramAttackFrames, scaUpgrades]);

      const ramAlloc = useMemo(
        () => OMG.calcRamAllocation(workParts, workTaskIndex, economyUnitLimit, effectiveWorkUnits, scaUpgrades, specs.unitDamage, ramAttackFrames),
        [workParts, workTaskIndex, economyUnitLimit, effectiveWorkUnits, scaUpgrades, specs.unitDamage, ramAttackFrames]
      );

      const incomeAttackFrames = useMemo(
        () => OMG.calcIncomeAttackFrames(scaUpgrades, ramAttackFrames),
        [scaUpgrades, ramAttackFrames]
      );
      const incomeEventMs = useMemo(
        () => OMG.calcIncomeEventIntervalMs(scaUpgrades, ramAttackFrames),
        [scaUpgrades, ramAttackFrames]
      );
      const workPerKillPerUnit = useMemo(
        () => OMG.calcWorkMineralPerKillPerUnit(workTaskIndex, specs.penalties.mineralMultiplier, rebirthIncomeMult, incomeBonusRate),
        [workTaskIndex, specs.penalties.mineralMultiplier, rebirthIncomeMult, incomeBonusRate]
      );
      const workCoinPerKillPerUnit = useMemo(
        () => OMG.calcWorkCoinPerKillPerUnit(workTaskIndex, specs.penalties.mineralMultiplier, rebirthIncomeMult, incomeBonusRate),
        [workTaskIndex, specs.penalties.mineralMultiplier, rebirthIncomeMult, incomeBonusRate]
      );
      const rebirthPreview = useMemo(
        () => gpu.level >= 10 ? OMG.calcRebirthOutcome({ cpu, gpu, ram, cooler, motherboard, storage }, rebirthStat) : null,
        [cpu, gpu, ram, cooler, motherboard, storage, rebirthStat]
      );
      const workIncomeIsCoin = useMemo(
        () => !!(OMG.getWorkTask(workTaskIndex) && OMG.getWorkTask(workTaskIndex).coinPerUnit),
        [workTaskIndex]
      );
      const formatWorkCoinAsMinerals = (coins) => OMG.formatCoinsAsMinerals(coins);
      const huntPerKillPerUnit = useMemo(
        () => OMG.calcHuntMineralPerKillPerUnit(effectiveUnlockedGameIndex, incomeBonusRate),
        [effectiveUnlockedGameIndex, incomeBonusRate]
      );
      const workMobSpec = useMemo(() => OMG.getWorkMobSpec(workTaskIndex), [workTaskIndex]);
      const huntMobSpec = useMemo(() => OMG.getGameMobSpec(effectiveUnlockedGameIndex), [effectiveUnlockedGameIndex]);
      const workHitsToKill = useMemo(
        () => OMG.calcHitsToKillTarget(workMobSpec, specs.unitDamage),
        [workMobSpec, specs.unitDamage]
      );
      const huntHitsToKill = useMemo(
        () => OMG.calcHitsToKillTarget(huntMobSpec, specs.unitDamage),
        [huntMobSpec, specs.unitDamage]
      );
      const workKillTimeSec = useMemo(
        () => OMG.calcKillTimeSec(specs.unitDamage, ramAttackFrames, scaUpgrades, workMobSpec),
        [specs.unitDamage, ramAttackFrames, scaUpgrades, workMobSpec]
      );
      const huntKillTimeSec = useMemo(
        () => OMG.calcKillTimeSec(specs.unitDamage, ramAttackFrames, scaUpgrades, huntMobSpec),
        [specs.unitDamage, ramAttackFrames, scaUpgrades, huntMobSpec]
      );
      const workActiveForIncome = huntCombatStatus.workTotal > 0 ? huntCombatStatus.workActive : effectiveWorkUnits;
      const huntActiveForIncome = huntCombatStatus.huntTotal > 0
        ? huntCombatStatus.huntActive
        : (isDownloading ? 0 : specs.maxHuntingUnits);
      const workIncomePerSec = useMemo(
        () => OMG.calcWorkIncomePerSec(
          workParts, workTaskIndex, specs.unitDamage, ramAttackFrames, scaUpgrades,
          specs.penalties.mineralMultiplier, rebirthIncomeMult, incomeBonusRate,
          economyUnitLimit, effectiveWorkUnits, workActiveForIncome
        ),
        [workParts, workTaskIndex, specs.unitDamage, ramAttackFrames, scaUpgrades, specs.penalties.mineralMultiplier, rebirthIncomeMult, incomeBonusRate, economyUnitLimit, effectiveWorkUnits, workActiveForIncome]
      );
      const workCoinIncomePerSec = useMemo(
        () => OMG.calcWorkCoinIncomePerSec(
          workParts, workTaskIndex, specs.unitDamage, ramAttackFrames, scaUpgrades,
          specs.penalties.mineralMultiplier, rebirthIncomeMult, incomeBonusRate,
          economyUnitLimit, effectiveWorkUnits, workActiveForIncome
        ),
        [workParts, workTaskIndex, specs.unitDamage, ramAttackFrames, scaUpgrades, specs.penalties.mineralMultiplier, rebirthIncomeMult, incomeBonusRate, economyUnitLimit, effectiveWorkUnits, workActiveForIncome]
      );
      const huntIncomePerSec = useMemo(
        () => OMG.calcHuntIncomePerSec(
          workParts, workTaskIndex, effectiveUnlockedGameIndex, specs.unitDamage, ramAttackFrames, scaUpgrades,
          incomeBonusRate, isDownloading, economyUnitLimit, effectiveWorkUnits, huntActiveForIncome
        ),
        [workParts, workTaskIndex, effectiveUnlockedGameIndex, specs.unitDamage, ramAttackFrames, scaUpgrades, incomeBonusRate, isDownloading, economyUnitLimit, effectiveWorkUnits, huntActiveForIncome]
      );

      useEffect(() => {
        if (manualWorkUnits > maxWorkUnits) {
          setManualWorkUnits(maxWorkUnits);
        }
      }, [maxWorkUnits, manualWorkUnits]);

      useEffect(() => {
        if (partyHuntingTier > maxUnlockedPartyTier) {
          setPartyHuntingTier(maxUnlockedPartyTier);
        }
      }, [partyHuntingTier, maxUnlockedPartyTier]);

      useEffect(() => {
        if (!isPartyHunting) {
          setPartyElapsedSec(0);
          return;
        }
        setPartyElapsedSec(0);
        const id = setInterval(() => setPartyElapsedSec((s) => s + 1), 1000);
        return () => clearInterval(id);
      }, [isPartyHunting, partyHuntingTier]);

      useEffect(() => {
        if (localStorage.getItem('sca_rebirthStatMigrated')) return;
        if (rebirthCount > 0 && rebirthStat === 0) {
          setRebirthStat(rebirthCount * 10000);
        }
        localStorage.setItem('sca_rebirthStatMigrated', '1');
      }, []);

      useEffect(() => {
        if (cooler.level === 1 && cooler.coolingCapacity === 30) {
          setCooler(c => ({ ...c, coolingCapacity: 500, coolerKind: c.coolerKind || 'air' }));
        }
      }, []);


      useEffect(() => {
        setCooler((c) => OMG.normalizeEquippedCooler(c));
        setStorage((s) => OMG.normalizeEquippedStorage(s));
      }, []);

      useEffect(() => {
        // 레거시 저장값 마이그레이션: HDD 1강인데 250GB로 저장된 경우(이전 기본값) 60GB로 보정
        if ((storage.storageKind || 'hdd') === 'hdd' && (storage.level || 1) === 1 && storage.type === 'HDD' && storage.capacityGb === 250) {
          setStorage((s) => ({ ...s, capacityGb: 60, storageKind: s.storageKind || 'hdd' }));
        }
        // 인벤토리 저장장치도 동일 보정
        setInventory((prev) => prev.map((p) => {
          if (p.type !== 'storage') return p;
          if ((p.storageKind || 'hdd') === 'hdd' && (p.level || 1) === 1 && p.storageType === 'HDD' && p.capacityGb === 250) {
            return { ...p, capacityGb: 60, storageKind: p.storageKind || 'hdd' };
          }
          return p;
        }));
      }, []);

      useEffect(() => {
        const ud = specs.unitDamage;
        const rf = ramAttackFrames;
        if (OMG.canSelectWorkTask(workParts, workTaskIndex, ud, rf, scaUpgrades)) return;
        for (let i = workTaskIndex - 1; i >= 0; i--) {
          if (OMG.canSelectWorkTask(workParts, i, ud, rf, scaUpgrades)) {
            setWorkTaskIndex(i);
            return;
          }
        }
        setWorkTaskIndex(0);
      }, [workParts, workTaskIndex, specs.unitDamage, ramAttackFrames, scaUpgrades, cpu.level, gpu.level, ram.level, ram.capacityGb, ramSlots]);

      useEffect(() => {
        const normalized = OMG.normalizeGameProgress(unlockedGameIndex, downloadTarget);
        if (normalized.unlockedGameIndex !== unlockedGameIndex) setUnlockedGameIndex(normalized.unlockedGameIndex);
        const dt = normalized.downloadTarget;
        const dtChanged = (downloadTarget && downloadTarget.gameIndex) !== (dt && dt.gameIndex) || (downloadTarget && downloadTarget.name) !== (dt && dt.name);
        if (dtChanged) setDownloadTarget(dt);
      }, [unlockedGameIndex, downloadTarget]);




      // ----------------------------------------------------------------------
      // 6.5. 게임 진행 상태 로컬 스토리지 실시간 자동 저장 (F5/새로고침 방지)
      // ----------------------------------------------------------------------
      useEffect(() => {
        localStorage.setItem('sca_minerals', minerals.toString());
        localStorage.setItem('sca_rebirthCount', rebirthCount.toString());
        localStorage.setItem('sca_rebirthStat', rebirthStat.toString());
        localStorage.setItem('sca_autoTargetLevels', JSON.stringify(autoTargetLevels));
        localStorage.setItem('sca_partyHuntingTier', String(partyHuntingTier));
        localStorage.setItem('sca_cpu', JSON.stringify(cpu));
        localStorage.setItem('sca_gpu', JSON.stringify(gpu));
        localStorage.setItem('sca_ram', JSON.stringify(ram));
        localStorage.setItem('sca_ramSlots', String(ramSlots));
        localStorage.setItem('sca_cooler', JSON.stringify(cooler));
        localStorage.setItem('sca_motherboard', JSON.stringify(motherboard));
        localStorage.setItem('sca_storage', JSON.stringify(storage));
        localStorage.setItem('sca_workTaskIndex', String(workTaskIndex));
        localStorage.setItem('sca_workUnitMode', workUnitMode);
        localStorage.setItem('sca_manualWorkUnits', String(manualWorkUnits));
        localStorage.setItem('sca_unlockedGameIndex', String(unlockedGameIndex));
        localStorage.setItem('sca_downloadTarget', JSON.stringify(downloadTarget));
        localStorage.setItem('sca_isDownloading', isDownloading ? 'true' : 'false');
        if (downloadStartedAt) localStorage.setItem('sca_downloadStartedAt', String(downloadStartedAt));
        else localStorage.removeItem('sca_downloadStartedAt');
        localStorage.setItem('sca_inventory', JSON.stringify(gameStateRef.current.inventory || inventory));
        localStorage.setItem('sca_autoBuyCpuByMfr', JSON.stringify(autoBuyCpuByMfr));
        localStorage.setItem('sca_autoBuyGpu', autoBuyGpu.toString());
        localStorage.setItem('sca_autoBuyRam', autoBuyRam.toString());
        localStorage.setItem('sca_autoBuyCoolerByKind', JSON.stringify(autoBuyCoolerByKind));
        localStorage.setItem('sca_autoBuyStorageByKind', JSON.stringify(autoBuyStorageByKind));
        // 로컬 저장과 함께 로그인 계정의 서버 진행도도 디바운스 동기화
        scheduleServerSync();
      }, [minerals, rebirthCount, rebirthStat, autoTargetLevels, partyHuntingTier, cpu, gpu, ram, cooler, motherboard, storage, workTaskIndex, workUnitMode, manualWorkUnits, unlockedGameIndex, downloadTarget, inventory, autoBuyCpuByMfr, autoBuyGpu, autoBuyRam, autoBuyCoolerByKind, autoBuyStorageByKind]);

      // SCA 지갑·상점 업그레이드는 서버 API 전용 — 로컬만 저장 (서버 PUT 트리거 안 함)
      useEffect(() => {
        localStorage.setItem('sca_scaCoins', scaCoins.toString());
        localStorage.setItem('sca_scaUpgrades', JSON.stringify(scaUpgrades));
      }, [scaCoins, scaUpgrades]);
      // OC 연구소 진행 상태 — PUT /api/state 동기화 포함 키
      useEffect(() => {
        localStorage.setItem('sca_overclockData', JSON.stringify(overclockData));
      }, [overclockData]);

      // ----------------------------------------------------------------------
      // 6.6. 가상 사냥터 실시간 전투 매트릭스 로그 생성기 (스타1 콘솔 싱크)
      // ----------------------------------------------------------------------
      useEffect(() => {
        const interval = setInterval(() => {
          const time = new Date().toLocaleTimeString(getLang() === 'ko' ? 'ko-KR' : 'en-GB', { hour12: false });
          let newLog;
          if (isPartyHunting) {
            const tier = OMG.PARTY_HUNTING_TIERS[partyHuntingTier];
            if (!tier) return;
            const mEarn = OMG.calcPartyMineralPerTick(tier, incomeBonusRate);
            newLog = { k: 'log.party', v: { time, tier: partyTierVar(partyHuntingTier), mineral: mEarn, sca: tier.scaCoins } };
          } else {
            const gameLabel = activeGame ? gameNameVar(activeGame) : { $k: 'key', key: 'log.noGame' };
            const huntSec = isDownloading ? 0 : huntIncomePerSec;
            newLog = {
              k: 'log.workHunt',
              v: {
                time,
                units: effectiveWorkUnits,
                workIncome: mineral(workIncomeIsCoin ? workCoinPerKillPerUnit * OMG.MINERAL_PER_COIN : workPerKillPerUnit),
                game: gameLabel,
                huntUnits: specs.maxHuntingUnits,
                huntIncome: mineral(huntPerKillPerUnit),
                total: mineral(workIncomeIsCoin ? workCoinIncomePerSec * OMG.MINERAL_PER_COIN + huntSec : workIncomePerSec + huntSec),
              },
            };
          }
          setCombatLogs(prev => {
            const nextLogs = [...prev, newLog];
            if (nextLogs.length > 8) nextLogs.shift();
            return nextLogs;
          });
        }, 1500);
        return () => clearInterval(interval);
      }, [cpu.level, specs, workParts, workTaskIndex, unlockedGameIndex, activeGame, rebirthIncomeMult, incomeBonusRate, isPartyHunting, partyHuntingTier, economyUnitLimit, effectiveWorkUnits, isDownloading, workIncomeIsCoin, workPerKillPerUnit, workCoinPerKillPerUnit, workIncomePerSec, workCoinIncomePerSec, huntIncomePerSec, huntPerKillPerUnit]);

      // ----------------------------------------------------------------------
      // 7. V1.2.9 원작 강화 (미네랄 상점)
      // ----------------------------------------------------------------------
      const getUpgradeProbability =(type, level, part) => OMG.getUpgradeProbability(type, level, part || { type }, probBonusRate);

      const adjustAutoTarget = (type, delta, variantKey = null) => {
        setAutoTargetLevels((prev) => {
          const buyMeta = variantKey != null ? buildBuyMetaForVariant(type, variantKey) : getComponentBuyMeta(type);
          const sample = inventory.find((p) => p.type === type && partMatchesBuyMeta(p, type, buyMeta))
            || { type, ...buyMeta };
          const maxLv = OMG.getMaxLevel(type, sample);
          if (variantKey != null) {
            const bucket = (prev[type] && typeof prev[type] === 'object') ? prev[type] : {};
            const cur = bucket[variantKey] || 1;
            const next = Math.max(1, Math.min(maxLv, cur + delta));
            return { ...prev, [type]: { ...bucket, [variantKey]: next } };
          }
          const cur = typeof prev[type] === 'number' ? prev[type] : 1;
          const next = Math.max(1, Math.min(maxLv, cur + delta));
          return { ...prev, [type]: next };
        });
      };


      const adjustBuyLevel = (type, delta, count) => {
        setBuyLevelIndex(prev => {
          const cur = Math.min(prev[type] || 0, Math.max(0, count - 1));
          const next = Math.max(0, Math.min(count - 1, cur + delta));
          return { ...prev, [type]: next };
        });
      };


      const getMotherboardCatalog = (manufacturer) => OMG.MOTHERBOARDS.filter((b) => b.socketManufacturer === manufacturer);

      const adjustMotherboardBuyIndex = (delta) => {
        const boards = getMotherboardCatalog(motherboardBuyManufacturer);
        setMotherboardBuyIndex((cur) => Math.max(0, Math.min(boards.length - 1, cur + delta)));
      };
      const getComponentBuyMeta = (type) => ({
        type,
        manufacturer: type === 'cpu' ? cpuBuyManufacturer : undefined,
        coolerKind: type === 'cooler' ? coolerBuyKind : undefined,
        storageKind: type === 'storage' ? storageBuyKind : undefined,
      });

      const buildBuyMetaForVariant = (type, variantKey) => {
        if (type === 'cpu') return { manufacturer: variantKey };
        if (type === 'cooler') return { coolerKind: variantKey };
        if (type === 'storage') return { storageKind: variantKey };
        return {};
      };

      const partMatchesBuyMeta = (part, type, buyMeta) => {
        if (!part || part.type !== type) return false;
        if (type === 'cpu') return (part.manufacturer || 'Intel') === (buyMeta.manufacturer || 'Intel');
        if (type === 'cooler') return (part.coolerKind || 'air') === (buyMeta.coolerKind || 'air');
        if (type === 'storage') {
          const kind = part.storageKind || (part.storageType === 'SSD' ? 'nvme' : 'hdd');
          return kind === (buyMeta.storageKind || 'hdd');
        }
        return true;
      };

      const getVariantAutoTarget = (type, variantKey) => {
        const v = autoTargetLevels[type];
        if (variantKey != null && v && typeof v === 'object') return v[variantKey] || 1;
        return typeof v === 'number' ? v : 1;
      };

      /** AUTO: 목표 강 미만 중 상점 직접구매 가능한 최고 강 */
      const getAutoBuyLevel = (type, goal, buyMetaOverride) => {
        const buyMeta = buyMetaOverride || getComponentBuyMeta(type);
        const levels = OMG.getPurchasableLevels(type, buyMeta);
        if (!levels.length) return null;
        const target = goal || 1;
        const below = levels.filter((lv) => lv < target);
        if (below.length) return Math.max(...below);
        if (levels.includes(target)) return target;
        return Math.min(...levels);
      };

      const handlePurchaseScaItem = async (item) => {
        const bought = scaUpgrades[item.id] || 0;
        if (bought >= item.maxPurchases) { alert(t('sca.maxBuys')); return; }
        if (!OMG.canPurchaseScaShopItem(item, scaUpgrades)) {
          if (item.id === 'miningAmplifierUnlock') alert(t('sca.alreadyMining'));
          else if (item.requiresMining) alert(t('sca.needMining'));
          else if (item.id === 'gpuGradeUp') alert(t('sca.gpuMaxGrade'));
          else alert(t('sca.cannotBuy'));
          return;
        }
        if (item.mineralBonus) {
          const currentTotal = OMG.calcRebirthStartMinerals(scaUpgrades);
          if (currentTotal >= OMG.REBIRTH_MINERAL_CAP) {
            alert(t('sca.mineralCapReached', { cap: OMG.REBIRTH_MINERAL_CAP.toLocaleString() }));
            return;
          }
        }
        const cost = OMG.getScaShopItemCost(item, scaUpgrades);
        if (scaCoins < cost) { alert(t('sca.needCoins', { cost: cost.toLocaleString() })); return; }
        try {
          const data = await GameSync.purchaseScaItem(item.id);
          setScaCoins(data.scaCoins);
          setScaUpgrades(data.scaUpgrades || {});
          if (item.id === 'gpuGradeUp') {
            const g = OMG.getGpuGradeLevel(data.scaUpgrades || {});
            pushToast(t('sca.toastGpuGrade', { grade: OMG.getGpuGradeName(g) }), 'success', 2500);
          } else if (item.id === 'miningAmplifierUnlock') {
            pushToast(t('sca.toastMiningUnlock'), 'success', 2500);
          } else if (item.id === 'miningAmplifier') {
            const effectivePower = OMG.getMiningPower(data.scaUpgrades || {});
            pushToast(t('sca.toastMiningPower', { add: OMG.MINING_AMPLIFIER_SPEC.powerPerLevel, power: effectivePower.toLocaleString() }), 'success', 2500);
          } else if (item.id === 'miningAmplifierSpeed') {
            const frames = OMG.getMiningAttackFrames(data.scaUpgrades || {});
            pushToast(t('sca.toastMiningSpeed', { frames }), 'success', 2500);
          } else if (item.mineralBonus) {
            pushToast(t('sca.toastRebirthMineral', { n: item.mineralBonus }), 'success', 2500);
          }
        } catch (err) {
          alert(translateServerError(err.message) || t('sca.buyFail'));
        }
      };

      const renderScaShopButton = (item) => {
        const bought = scaUpgrades[item.id] || 0;
        const canBuy = OMG.canPurchaseScaShopItem(item, scaUpgrades);
        const soldOut = !canBuy && bought >= item.maxPurchases;
        const cost = OMG.getScaShopItemCost(item, scaUpgrades);
        const affordable = scaCoins >= cost;
        const hint = OMG.getScaShopItemHint(item, scaUpgrades);
        return (
          <button key={item.id} type="button" onClick={() => handlePurchaseScaItem(item)} disabled={!canBuy || !affordable} className={`p-2 bg-slate-950 border rounded text-xs font-mono text-left ${!canBuy || !affordable ? 'border-slate-900 opacity-40' : 'border-slate-800 hover:border-cyan-500/40'}`}>
            <div>{OMG.getScaShopItemDisplayName(item, scaUpgrades)}</div>
            {hint ? <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{hint}</div> : null}
            <div className="text-cyan-400">{cost.toLocaleString()} SCA</div>
            <div className="text-slate-500 mt-1">{soldOut ? t('sca.soldOut') : `${bought}/${item.maxPurchases}`}</div>
          </button>
        );
      };


      const handlePurchaseRamSlots = (targetSlots) => {
        const check = OMG.validateRamSlotPurchase(ramSlots, targetSlots, minerals);
        if (!check.ok) {
          alert(check.reason);
          return;
        }
        setMinerals((prev) => prev - check.cost);
        setRamSlots(check.newSlots);
        pushToast(t('shop.ramSlotToast', { n: check.newSlots }), 'success', 2500);
      };

      const handleBuyComponentPack = (type, level = 1, buyMetaOverride, options) => {
        const auto = options && options.auto;
        const buyMeta = buyMetaOverride || getComponentBuyMeta(type);
        if (!OMG.isPurchasableLevel(type, level, buyMeta)) {
          if (!auto) {
            const buyable = OMG.getPurchasableLevels(type, buyMeta);
            const list = buyable.length
              ? buyable.map((lv) => t('shop.levelN', { n: lv })).join(', ')
              : t('shop.buyableNone');
            alert(t('shop.notBuyable', { type: type.toUpperCase(), level, list }));
          }
          return;
        }
        const costM = OMG.getShopTierCostMinerals(type, level, buyMeta);
        const curMinerals = auto ? (gameStateRef.current.minerals ?? minerals) : minerals;
        if (curMinerals < costM) {
          if (!auto) {
            alert(t('shop.needMinerals', { cost: OMG.formatMineral(costM), have: OMG.formatMineral(curMinerals) }));
          }
          return;
        }
        const newPart = OMG.buildInventoryPart(type, level, buyMeta);
        const curInv = auto ? (gameStateRef.current.inventory || []) : inventory;
        const nextMinerals = curMinerals - costM;
        const nextInv = [...curInv, newPart];
        gameStateRef.current.minerals = nextMinerals;
        gameStateRef.current.inventory = nextInv;
        setMinerals(nextMinerals);
        setInventory(nextInv);
        const tierName = OMG.getPartName(type, level, newPart);
        if (!auto) {
          setCombatLogs((prev) => [...prev.slice(-7), { k: 'log.buy', v: { name: tierName, level } }]);
        }
      };

      const handleSellComponent = (itemId) => {
        const curInv = gameStateRef.current.inventory || inventory;
        const part = curInv.find(p => p.id === itemId);
        if (!part) return;
        const sellM = OMG.getShopSellPriceMinerals(part.type, part.level, part);
        const nextMinerals = (gameStateRef.current.minerals ?? minerals) + sellM;
        const nextInv = curInv.filter(p => p.id !== itemId);
        gameStateRef.current.minerals = nextMinerals;
        setMinerals(nextMinerals);
        flushInventoryUi(nextInv, { force: true });
        setCombatLogs((prev) => [...prev.slice(-7), { k: 'log.sell', v: { amount: mineral(sellM) } }]);
      };

      const handleInventoryUpgrade = (itemId, options) => {
        const auto = options && options.auto;
        if (!auto && isUpgrading) return;
        const inv = auto ? (gameStateRef.current.inventory || []) : inventory;
        const partToUpgrade = inv.find((p) => p.id === itemId);
        if (!partToUpgrade) return;
        const currentLevel = partToUpgrade.level;
        const label = partToUpgrade.type.toUpperCase();

        const applyUpgrade = () => {
          const bonus = auto ? (gameStateRef.current.probBonusRate ?? probBonusRate) : probBonusRate;
          const prob = OMG.getUpgradeProbability(partToUpgrade.type, currentLevel, partToUpgrade, bonus);
          const result = Math.random() <= prob ? 'success' : 'exploded';
          if (!auto) setUpgradeFx((prev) => ({ seq: (prev ? prev.seq : 0) + 1, result }));
          if (result === 'success') {
            const baseInv = gameStateRef.current.inventory || inv;
            const n = baseInv.map((p) => (p.id === itemId ? OMG.applyTierStats(p, currentLevel + 1) : p));
            gameStateRef.current.inventory = n;
            setInventory(n);
            if (!auto) setCombatLogs((prev) => [...prev.slice(-7), { k: 'log.upgraded', v: { label, level: currentLevel + 1 } }]);
          } else {
            const baseInv = gameStateRef.current.inventory || inv;
            const n = baseInv.filter((p) => p.id !== itemId);
            gameStateRef.current.inventory = n;
            setInventory(n);
            if (!auto) pushToast(t('log.exploded', { label, level: currentLevel }), 'exploded', 2200);
          }
        };

        if (auto) {
          applyUpgrade();
          return;
        }

        setIsUpgrading(true);
        setActiveUpgradingPart(partToUpgrade.type);
        setTimeout(() => {
          applyUpgrade();
          setIsUpgrading(false);
          setActiveUpgradingPart(null);
        }, OMG.calcManualUpgradeDelayMs());
      };

      const handleRebirth = async () => {
        if (gpu.level < 10) { alert(t('rebirth.needGpu10')); return; }
        if (isDownloading) { alert(t('rebirth.downloading')); return; }
        // download state cleared on rebirth below via setIsDownloading(false)
        if (!confirm(t('rebirth.confirm'))) return;
        const parts = { cpu, gpu, ram, cooler, storage };
        const startMinerals = OMG.calcRebirthStartMinerals(scaUpgrades);
        if (!GameSync.hasSession()) {
          alert(t('rebirth.needLogin'));
          return;
        }
        let rebirthData;
        try {
          rebirthData = await GameSync.claimRebirth(parts);
        } catch (err) {
          alert(translateServerError(err.message) || t('rebirth.fail'));
          return;
        }
        setScaCoins(rebirthData.scaCoins);
        setRebirthStat(rebirthData.rebirthStat);
        setRebirthCount(rebirthData.rebirthCount);
        setMinerals(startMinerals);
setCpu({ manufacturer: 'Intel', level: 1, ddrGeneration: 'DDR3' });
        setGpu({ level: 1 });
        setRam({ level: 1, clockMhz: 1333, capacityGb: 1, ddrGeneration: 'DDR3' });
        setRamSlots(1);
        setCooler({ level: 1, coolingCapacity: 500, coolerKind: 'air' });
        setMotherboard({ name: '인텔 P55', socketManufacturer: 'Intel', supportedDdrGeneration: 'DDR3', shieldIncrease: 0 });
        setStorage({ type: 'HDD', capacityGb: 60, level: 1, storageKind: 'hdd' });
        const rebirthInventory = [
          { id: 'inv-cpu-1', type: 'cpu', level: 1, manufacturer: 'Intel', ddrGeneration: 'DDR3' },
          { id: 'inv-gpu-1', type: 'gpu', level: 1 },
          { id: 'inv-ram-1', type: 'ram', level: 1, clockMhz: 1333, capacityGb: 1, ddrGeneration: 'DDR3' },
          { id: 'inv-cooler-1', type: 'cooler', level: 1, coolingCapacity: 500, coolerKind: 'air' },
          { id: 'inv-storage-1', type: 'storage', level: 1, storageType: 'HDD', storageKind: 'hdd', capacityGb: 60 }
        ];
        // 자동저장·오토시뮬레이터가 참조하는 ref도 함께 초기화해야 스테일 인벤토리가 되살아나지 않음
        gameStateRef.current.inventory = rebirthInventory;
        setInventory(rebirthInventory);
        setWorkTaskIndex(0);
        setUnlockedGameIndex(0);
        const dt = OMG.DOWNLOAD_TARGETS[0];
        setDownloadTarget({ name: dt.name, sizeMb: dt.sizeMb, requiredGb: dt.requiredGb, mineralCost: dt.mineralCost || 0, gameIndex: dt.gameIndex });
        setIsDownloading(false);
        setDownloadProgress(0);
        setIsPartyHunting(false);
        setAutoTargetLevels(defaultAutoTargets);
        pushToast(t('rebirth.done', { sca: rebirthData.scaReward.toLocaleString() }), 'success', 3500);
      };

      const handlePurchaseMotherboard = (board) => {
        const mbCost = OMG.costToMinerals(board.cost);
        if (minerals < mbCost) { alert(t('shop.needMineralsShort', { cost: OMG.formatMineral(mbCost) })); return; }
        setMinerals((prev) => prev - mbCost);
        setMotherboard({ name: board.name, socketManufacturer: board.socketManufacturer, supportedDdrGeneration: board.supportedDdrGeneration, shieldIncrease: board.shieldIncrease });
      };

            // 2. 보관 장비 스왑 장착 핸들러
      const handleEquipComponent = (itemId) => {
        // AUTO 중에는 gameStateRef.inventory가 최신(강화 반영). React inventory는 UI 스로틀로 지연될 수 있음.
        const curInv = gameStateRef.current.inventory || inventory;
        const partToEquip = curInv.find(p => p.id === itemId);
        if (!partToEquip) return;

        const type = partToEquip.type;
        let nextInv = curInv.filter(p => p.id !== itemId);

        // 메인 부품 스와핑 처리
        if (type === 'cpu') {
          const currentEquipped = { ...cpu };
          setCpu({
            manufacturer: partToEquip.manufacturer,
            level: partToEquip.level,
            ddrGeneration: OMG.getCpuRequiredDdrGeneration(partToEquip),
          });
          nextInv = nextInv.concat({
            id: `inv-cpu-${Math.random().toString(36).substring(2, 7)}`,
            type: 'cpu',
            level: currentEquipped.level,
            manufacturer: currentEquipped.manufacturer,
            ddrGeneration: currentEquipped.ddrGeneration
          });
        } else if (type === 'gpu') {
          const currentEquipped = { ...gpu };
          setGpu({ level: partToEquip.level });
          nextInv = nextInv.concat({
            id: `inv-gpu-${Math.random().toString(36).substring(2, 7)}`,
            type: 'gpu',
            level: currentEquipped.level
          });
        } else if (type === 'ram') {
          const currentEquipped = { ...ram };
          setRam({
            level: partToEquip.level,
            clockMhz: partToEquip.clockMhz,
            capacityGb: partToEquip.capacityGb,
            ddrGeneration: partToEquip.ddrGeneration,
            ramVariant: partToEquip.ramVariant || 'standard',
            ramOcStep: partToEquip.ramOcStep,
          });
          nextInv = nextInv.concat({
            id: `inv-ram-${Math.random().toString(36).substring(2, 7)}`,
            type: 'ram',
            level: currentEquipped.level,
            clockMhz: currentEquipped.clockMhz,
            capacityGb: currentEquipped.capacityGb,
            ddrGeneration: currentEquipped.ddrGeneration,
            ramVariant: currentEquipped.ramVariant,
            ramOcStep: currentEquipped.ramOcStep,
          });
        } else if (type === 'cooler') {
          const currentEquipped = { ...cooler };
          setCooler(OMG.normalizeEquippedCooler({
            level: partToEquip.level,
            coolingCapacity: partToEquip.coolingCapacity,
            coolerKind: partToEquip.coolerKind || 'air',
          }));
          nextInv = nextInv.concat({
            id: `inv-cooler-${Math.random().toString(36).substring(2, 7)}`,
            type: 'cooler',
            level: currentEquipped.level,
            coolingCapacity: currentEquipped.coolingCapacity,
            coolerKind: currentEquipped.coolerKind || 'air',
          });
        } else if (type === 'storage') {
          const currentEquipped = { ...storage };
          setStorage(OMG.normalizeEquippedStorage({
            type: partToEquip.storageType,
            capacityGb: partToEquip.capacityGb,
            level: partToEquip.level,
            storageKind: partToEquip.storageKind,
          }));
          nextInv = nextInv.concat({
            id: `inv-storage-${Math.random().toString(36).substring(2, 7)}`,
            type: 'storage',
            level: currentEquipped.level,
            storageType: currentEquipped.type,
            storageKind: currentEquipped.storageKind || (currentEquipped.type === 'SSD' ? 'nvme' : 'hdd'),
            capacityGb: currentEquipped.capacityGb,
          });
        }

        flushInventoryUi(nextInv, { force: true });
        setCombatLogs((prev) => [...prev.slice(-7), { k: 'log.equipped', v: { label: type.toUpperCase(), level: partToEquip.level } }]);
      };

      // ----------------------------------------------------------------------
      // 8. 상위 사냥터(게임) 다운로드 진행도 시뮬레이션
      // ----------------------------------------------------------------------
      useEffect(() => {
        if (isDownloading && !downloadStartedAt) {
          setIsDownloading(false);
          localStorage.setItem('sca_isDownloading', 'false');
        }
      }, []);

      const startDownload = () => {
        const check = OMG.validateDownloadStart(workParts, unlockedGameIndex, downloadTarget, isDownloading, minerals);
        if (!check.ok) {
          alert(check.reason);
          return;
        }
        if (check.mineralCost > 0) {
          setMinerals((prev) => prev - check.mineralCost);
        }
        const started = Date.now();
        setIsDownloading(true);
        setDownloadStartedAt(started);
        localStorage.setItem('sca_downloadStartedAt', String(started));
        setDownloadProgress(0);
      };

      // ----------------------------------------------------------------------
      // 6.4. 백그라운드·다른 탭 — wall-clock 게임 루프 (수입·다운로드·AUTO)
      // ----------------------------------------------------------------------
      useEffect(() => {
        gameStateRef.current = {
          ...gameStateRef.current,
          workParts,
          workTaskIndex,
          specs,
          rebirthStat,
          rebirthIncomeMult,
          incomeBonusRate,
          effectiveUnitLimit: economyUnitLimit,
          economyUnitLimit,
          overclockLabActive,
          effectiveWorkUnits,
          unlockedGameIndex,
          effectiveUnlockedGameIndex,
          isPartyHunting,
          partyHuntingTier,
          isDownloading,
          downloadTarget,
          downloadStartedAt,
          scaUpgrades,
          overclockData,
          ramAttackFrames,
          gpuAttackFrames,
          minerals,
          isUpgrading,
          autoBuyCpuByMfr,
          autoBuyGpu,
          autoBuyRam,
          autoBuyCoolerByKind,
          autoBuyStorageByKind,
          autoTargetLevels,
          cpuBuyManufacturer,
          coolerBuyKind,
          storageBuyKind,
          probBonusRate,
          overclockLabHp,
          overclockLabShield,
          overclockLabCooldown,
        };
      }, [
        workParts, workTaskIndex, specs, rebirthStat, rebirthIncomeMult, incomeBonusRate, economyUnitLimit, overclockLabActive,
        effectiveWorkUnits, unlockedGameIndex, effectiveUnlockedGameIndex, isPartyHunting, partyHuntingTier,
        isDownloading, downloadTarget, downloadStartedAt, scaUpgrades, overclockData, ramAttackFrames, gpuAttackFrames,
        minerals, isUpgrading, autoBuyCpuByMfr, autoBuyGpu, autoBuyRam, autoBuyCoolerByKind,
        autoBuyStorageByKind, autoTargetLevels, cpuBuyManufacturer, coolerBuyKind, storageBuyKind, probBonusRate,
        overclockLabHp, overclockLabShield, overclockLabCooldown,
      ]);

      const completeDownload = (target) => {
        if (!target || target.gameIndex == null) return;
        setIsDownloading(false);
        setDownloadStartedAt(null);
        localStorage.removeItem('sca_downloadStartedAt');
        localStorage.setItem('sca_isDownloading', 'false');
        setUnlockedGameIndex(target.gameIndex);
        const nextTarget = OMG.DOWNLOAD_TARGETS.find((t) => t.gameIndex === target.gameIndex + 1);
        if (nextTarget) {
          setDownloadTarget({
            name: nextTarget.name,
            sizeMb: nextTarget.sizeMb,
            requiredGb: nextTarget.requiredGb,
            mineralCost: nextTarget.mineralCost || 0,
            gameIndex: nextTarget.gameIndex,
          });
        } else {
          setDownloadTarget(null);
        }
        setDownloadProgress(100);
      };

      const applySimResult = (simCtx, opts = {}) => {
        const mineralsBefore = gameStateRef.current.minerals ?? minerals;
        gameStateRef.current.minerals = simCtx.minerals;
        scheduleInventoryUi(simCtx.inventory, opts);
        setMinerals(simCtx.minerals);
        // 파티 SCA 청구는 최소 3초 간격으로 스로틀 — 서버 game_states 행 락 경합(구매·저장 지연) 방지.
        // 미네랄은 위에서 매 틱 반영되고, 여기선 누적 틱을 배치로만 서버에 청구(서버는 경과시간 기반 지급이라 손실 없음).
        if (simCtx.scaPartyTicks > 0 && (Date.now() - partyClaimAtRef.current >= 3000)) {
          partyClaimAtRef.current = Date.now();
          const tierIdx = simCtx.partyHuntingTier;
          const ticks = simCtx.scaPartyTicks;
          const partyMineral = Math.round(simCtx.partyMineralGained || 0);
          simCtx.scaPartyTicks = 0;
          simCtx.scaCoinsGain = 0;
          simCtx.partyMineralGained = 0;
          if (partyMineral > 0) {
            setCombatLogs(prev => [...prev.slice(-7), {
              k: 'log.partyIncome',
              v: { tier: partyTierVar(tierIdx), ticks, mineral: partyMineral.toLocaleString() },
            }]);
          }
          if (GameSync.hasSession()) {
            GameSync.claimPartyIncome(tierIdx, ticks, { cpu, gpu, ram, cooler, storage })
              .then((data) => { if (data && data.grantedSca > 0) setScaCoins(data.scaCoins); })
              .catch(() => {});
          }
        }
        if (simCtx.autoFlagsDirty) {
          setAutoBuyCpuByMfr({ ...simCtx.autoBuyCpuByMfr });
          setAutoBuyCoolerByKind({ ...simCtx.autoBuyCoolerByKind });
          setAutoBuyStorageByKind({ ...simCtx.autoBuyStorageByKind });
          setAutoBuyGpu(!!simCtx.autoBuyGpu);
          setAutoBuyRam(!!simCtx.autoBuyRam);
        }

        const mineralDelta = simCtx.minerals - mineralsBefore;
        if (mineralDelta > 0) pulseMineralFlash('gain');
        else if (mineralDelta < 0) pulseMineralFlash('spend');

        if (simCtx.autoStatus) setAutoStatus(simCtx.autoStatus);

        const feedItems = [];
        if (simCtx.autoEvents && simCtx.autoEvents.length) {
          simCtx.autoEvents.forEach((ev) => {
            feedItems.push({ ...ev, ts: Date.now() });
          });
        }
        if (feedItems.length) {
          setAutoFeed((prev) => [...feedItems, ...prev].slice(0, 12));
        }

        if (opts.showSummary && simCtx.stats) {
          const st = simCtx.stats;
          if (st.incomeMinerals > 0 || st.autoActions > 0) {
            const parts = [];
            if (st.incomeMinerals > 0) parts.push(t('auto.sumIncome', { amount: OMG.formatMineral(st.incomeMinerals) }));
            if (st.upgrades > 0) parts.push(t('auto.sumUpgrade', { n: st.upgrades }));
            if (st.buys > 0) parts.push(t('auto.sumBuy', { n: st.buys }));
            if (st.explosions > 0) parts.push(t('auto.sumExplode', { n: st.explosions }));
            pushToast(t('auto.idleSummary', { parts: parts.join(' · ') }), 'success', 4500);
          }
        }
        if (simCtx.logs && simCtx.logs.length) {
          setCombatLogs((prev) => [...prev.slice(-6), ...simCtx.logs.slice(-2)]);
          simCtx.logs.forEach((line) => {
            setAutoFeed((prev) => [{ kind: 'system', message: line, ts: Date.now() }, ...prev].slice(0, 12));
          });
        }
        if (simCtx.huntUnitPools) gameStateRef.current.huntUnitPools = simCtx.huntUnitPools;
        if (simCtx.huntCombatSig) gameStateRef.current.huntCombatSig = simCtx.huntCombatSig;
        if (simCtx.remWorkHitProgress != null) gameStateRef.current.remWorkHitProgress = simCtx.remWorkHitProgress;
        if (simCtx.remHuntHitProgress != null) gameStateRef.current.remHuntHitProgress = simCtx.remHuntHitProgress;
        if (simCtx.huntCombatStatus) {
          gameStateRef.current.huntCombatStatus = simCtx.huntCombatStatus;
          setHuntCombatStatus(simCtx.huntCombatStatus);
        }
      };

      const runIdleSimulation = (elapsedMs, options = {}) => {
        const Sim = window.AutoSimulator;
        if (!Sim || elapsedMs <= 0) return null;
        const simCtx = Sim.snapshotFromGameState(gameStateRef.current);
        simCtx.remWorkHunt = tickRemainderRef.current.workHunt;
        simCtx.remWorkHitProgress = gameStateRef.current.remWorkHitProgress || 0;
        simCtx.remHuntHitProgress = gameStateRef.current.remHuntHitProgress || 0;
        simCtx.remAuto = tickRemainderRef.current.auto;
        simCtx.remParty = tickRemainderRef.current.party;
        if (options.catchUp) {
          Sim.simulateBackgroundCatchUp(simCtx, elapsedMs, options);
        } else {
          Sim.simulateGameTick(simCtx, elapsedMs, { maxAutoStepsPerTick: 1, ...options });
        }
        tickRemainderRef.current.workHunt = simCtx.remWorkHunt ?? 0;
        tickRemainderRef.current.auto = simCtx.remAuto ?? 0;
        tickRemainderRef.current.party = simCtx.remParty ?? 0;
        applySimResult(simCtx, options);
        return simCtx;
      };

      /** AUTO 켠 직후 1스텝 즉시 처리 */
      const flushAutoNow = () => {
        const Sim = window.AutoSimulator;
        if (!Sim || !Sim.hasActiveAuto(gameStateRef.current)) return;
        const simCtx = Sim.snapshotFromGameState(gameStateRef.current);
        if (!simCtx.stats) {
          simCtx.stats = { incomeMinerals: 0, incomeTicks: 0, autoActions: 0, buys: 0, upgrades: 0, explosions: 0 };
        }
        simCtx.autoEvents = [];
        Sim.simulateOneAutoStep(simCtx);
        simCtx.autoStatus = Sim.detectAutoStatus(simCtx);
        applySimResult(simCtx);
      };

      const toggleAutoCpuMfr = (mfr) => {
        setAutoBuyCpuByMfr((prev) => {
          const next = { ...prev, [mfr]: !prev[mfr] };
          gameStateRef.current.autoBuyCpuByMfr = next;
          if (next[mfr]) queueMicrotask(flushAutoNow);
          return next;
        });
      };
      const toggleAutoCoolerKind = (kind) => {
        setAutoBuyCoolerByKind((prev) => {
          const next = { ...prev, [kind]: !prev[kind] };
          gameStateRef.current.autoBuyCoolerByKind = next;
          if (next[kind]) queueMicrotask(flushAutoNow);
          return next;
        });
      };
      const toggleAutoStorageKind = (kind) => {
        setAutoBuyStorageByKind((prev) => {
          const next = { ...prev, [kind]: !prev[kind] };
          gameStateRef.current.autoBuyStorageByKind = next;
          if (next[kind]) queueMicrotask(flushAutoNow);
          return next;
        });
      };
      const toggleAutoGpu = () => {
        setAutoBuyGpu((prev) => {
          const next = !prev;
          gameStateRef.current.autoBuyGpu = next;
          if (next) queueMicrotask(flushAutoNow);
          return next;
        });
      };
      const toggleAutoRam = () => {
        setAutoBuyRam((prev) => {
          const next = !prev;
          gameStateRef.current.autoBuyRam = next;
          if (next) queueMicrotask(flushAutoNow);
          return next;
        });
      };

      useEffect(() => {
        const Sim = window.AutoSimulator;
        if (!Sim) return;
        const ctx = {
          ...gameStateRef.current,
          autoBuyCpuByMfr, autoBuyGpu, autoBuyRam, autoBuyCoolerByKind, autoBuyStorageByKind,
        };
        if (Sim.hasActiveAuto(ctx)) {
          setAutoStatus(Sim.detectAutoStatus(ctx));
        } else {
          setAutoStatus({ code: 'off', msgKey: 'auto.statusOff' });
        }
      }, [autoBuyCpuByMfr, autoBuyGpu, autoBuyRam, autoBuyCoolerByKind, autoBuyStorageByKind]);

      useEffect(() => {
        const LOOP_MS = 200;
        const TICK_ELAPSED_CAP_MS = 300000;
        const BACKGROUND_CATCHUP_CAP_MS = 4 * 60 * 60 * 1000;

        const catchUpBackgroundSession = () => {
          if (document.hidden || !hiddenAtRef.current) return;
          const gap = Math.min(Date.now() - hiddenAtRef.current, BACKGROUND_CATCHUP_CAP_MS);
          hiddenAtRef.current = null;
          if (gap <= 0) return;
          runIdleSimulation(gap, { catchUp: true, showSummary: true, maxAutoTicks: 50000 });
          wallClockRef.current.lastMs = Date.now();
        };

        const tick = () => {
          const now = Date.now();
          let elapsed = now - wallClockRef.current.lastMs;
          wallClockRef.current.lastMs = now;
          if (elapsed < 0) elapsed = 0;
          if (elapsed > TICK_ELAPSED_CAP_MS) elapsed = TICK_ELAPSED_CAP_MS;

          runIdleSimulation(elapsed);

          const s = gameStateRef.current;

          if (s.isDownloading && s.downloadTarget && s.downloadStartedAt) {
            const dlTickMs = Math.max(20, OMG.calcGameSpeedTickMs(s.scaUpgrades, 100));
            const dlElapsed = now - s.downloadStartedAt;
            const dlTicks = Math.floor(dlElapsed / dlTickMs);
            const downloadedMb = dlTicks * (s.specs.downloadSpeedMb || 0);
            const sizeMb = s.downloadTarget.sizeMb || 1;
            if (downloadedMb >= sizeMb) {
              completeDownload(s.downloadTarget);
            } else {
              setDownloadProgress((downloadedMb / sizeMb) * 100);
            }
          }

          // [오버클럭 연구소] 차출 1기 — 스펙에 맞는 최고 레벨 건물 자동 파밍
          if (s.overclockData && s.overclockData.overclockLabActive) {
            const labRam = (s.workParts && s.workParts.ram) || null;
            const labUnitDps = OMG.calcOverclockLabUnitDps(s.specs.unitDamage, labRam, s.scaUpgrades || {});
            const farmLvl = OMG.calcMaxOverclockLabLevel(labUnitDps);
            const spec = OMG.OVERCLOCK_LAB_SPECS[farmLvl];
            if (spec) {
              const sec = elapsed / 1000;
              let cd = s.overclockLabCooldown || 0;

              if (cd <= 0 && s.overclockLabFarmLevel !== farmLvl) {
                s.overclockLabFarmLevel = farmLvl;
                s.overclockLabHp = spec.hp;
                s.overclockLabShield = spec.shield;
                setOverclockLabHp(spec.hp);
                setOverclockLabShield(spec.shield);
              }

              if (cd > 0) {
                cd = Math.max(0, cd - sec);
                s.overclockLabCooldown = cd;
                setOverclockLabCooldown(cd);
                if (cd === 0) {
                  s.overclockLabFarmLevel = farmLvl;
                  s.overclockLabHp = spec.hp;
                  s.overclockLabShield = spec.shield;
                  setOverclockLabHp(spec.hp);
                  setOverclockLabShield(spec.shield);
                }
              } else {
                const netDmgPerSec = OMG.calcOverclockLabNetDps(labUnitDps, farmLvl);
                const totalDmg = netDmgPerSec * sec;

                if (totalDmg > 0) {
                  let curShield = s.overclockLabShield !== undefined ? s.overclockLabShield : spec.shield;
                  let curHp = s.overclockLabHp !== undefined ? s.overclockLabHp : spec.hp;

                  if (curShield > 0) {
                    if (totalDmg >= curShield) {
                      const carryDmg = totalDmg - curShield;
                      curShield = 0;
                      curHp = Math.max(0, curHp - carryDmg);
                    } else {
                      curShield -= totalDmg;
                    }
                  } else {
                    curHp = Math.max(0, curHp - totalDmg);
                  }

                  s.overclockLabHp = curHp;
                  s.overclockLabShield = curShield;
                  setOverclockLabHp(curHp);
                  setOverclockLabShield(curShield);

                  if (curHp <= 0) {
                    const dropRoll = Math.random() < 0.3;
                    if (dropRoll) {
                      const dropPart = generateOverclockPart(farmLvl);
                      const stock = Array.isArray(s.overclockData.overclockParts) ? s.overclockData.overclockParts : [];
                      if (stock.length >= 30) {
                        setCombatLogs((prev) => [...prev.slice(-7), { k: 'log.vaultFull' }]);
                      } else {
                        s.overclockData.overclockParts = [...stock, dropPart];
                        setOverclockData({ ...s.overclockData });
                        // 세대는 보이되 목표 클럭(성능)은 강화 성공 전까지 비공개
                        setCombatLogs((prev) => [...prev.slice(-7), {
                          k: 'log.labDrop',
                          v: { lv: farmLvl, gen: dropPart.generation, count: stock.length + 1 },
                        }]);
                      }
                    } else {
                      setCombatLogs((prev) => [...prev.slice(-7), { k: 'log.labNoDrop', v: { lv: farmLvl } }]);
                    }

                    s.overclockLabCooldown = OMG.OVERCLOCK_LAB_RESPAWN_SEC;
                    s.overclockLabHp = 0;
                    s.overclockLabShield = 0;
                    setOverclockLabCooldown(OMG.OVERCLOCK_LAB_RESPAWN_SEC);
                    setOverclockLabHp(0);
                    setOverclockLabShield(0);
                  }
                }
              }
            }
          }
        };

        wallClockRef.current.lastMs = Date.now();
        const id = setInterval(tick, LOOP_MS);

        const onVisibility = () => {
          if (document.hidden) {
            if (!hiddenAtRef.current) hiddenAtRef.current = Date.now();
          } else {
            catchUpBackgroundSession();
            tick();
          }
        };

        const onFocus = () => {
          if (!document.hidden) {
            catchUpBackgroundSession();
            tick();
          }
        };

        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('focus', onFocus);
        return () => {
          clearInterval(id);
          document.removeEventListener('visibilitychange', onVisibility);
          window.removeEventListener('focus', onFocus);
        };
      }, []);

      const makeOcPartId = () => 'oc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

      const generateOverclockPart = (labLevel) => {
        const roll = Math.random();
        let gen = 'DDR4';
        
        if (labLevel === 2) {
          gen = roll < 0.3 ? 'DDR5' : 'DDR4';
        } else if (labLevel === 3) {
          gen = roll < 0.6 ? 'DDR5' : 'DDR4';
        } else if (labLevel === 4) {
          gen = roll < 0.9 ? 'DDR5' : 'DDR4';
        }
        
        if (gen === 'DDR4') {
          return {
            id: makeOcPartId(),
            generation: 'DDR4',
            targetMhz: 4000,
            cl: 16, trcd: 18, trp: 18, tras: 36,
            targetCl: Math.floor(13 + Math.random() * 7),
            targetTrcd: Math.floor(15 + Math.random() * 7),
            targetTrp: Math.floor(15 + Math.random() * 7),
            targetTras: Math.floor(32 + Math.random() * 9),
            tested: false
          };
        } else {
          const mhzRoll = Math.random();
          let targetMhz = 6000;
          let initVals = { cl: 38, trcd: 38, trp: 38, tras: 38 };
          let targetRange = { clMin: 30, clMax: 50, trcdMin: 30, trcdMax: 50, trpMin: 30, trpMax: 50, trasMin: 30, trasMax: 50 };
          
          if (mhzRoll < 0.15) {
            targetMhz = 8000;
            initVals = { cl: 34, trcd: 36, trp: 36, tras: 32 };
            targetRange = { clMin: 30, clMax: 38, trcdMin: 32, trcdMax: 40, trpMin: 32, trpMax: 40, trasMin: 28, trasMax: 36 };
          } else if (mhzRoll < 0.50) {
            targetMhz = 7200;
            initVals = { cl: 36, trcd: 36, trp: 36, tras: 36 };
          }
          
          const randEven = (min, max) => {
            const range = Math.floor((max - min) / 2);
            return min + Math.floor(Math.random() * (range + 1)) * 2;
          };
          
          return {
            id: makeOcPartId(),
            generation: 'DDR5',
            targetMhz: targetMhz,
            cl: initVals.cl, trcd: initVals.trcd, trp: initVals.trp, tras: initVals.tras,
            targetCl: randEven(targetRange.clMin, targetRange.clMax),
            targetTrcd: randEven(targetRange.trcdMin, targetRange.trcdMax),
            targetTrp: randEven(targetRange.trpMin, targetRange.trpMax),
            targetTras: randEven(targetRange.trasMin, targetRange.trasMax),
            tested: false
          };
        }
      };

      // 조율값이 숨겨진 목표에 가까울수록 성공 확률↑ (완벽 조율 시 최대 90%).
      // 목표 성능(클럭·타이밍)은 끝까지 비공개 — 유저는 이 확률값만 보고 강화 여부를 결정한다.
      const calcOcSuccessProb = (part) => {
        if (!part) return 0;
        const span = part.generation === 'DDR5' ? 40 : 24; // 세대별 조율 허용 폭
        const prox = (v, t) => Math.max(0, 1 - Math.abs((v || 0) - (t || 0)) / span);
        const p =
          prox(part.cl, part.targetCl) *
          prox(part.trcd, part.targetTrcd) *
          prox(part.trp, part.targetTrp) *
          prox(part.tras, part.targetTras);
        return Math.max(0, Math.min(0.9, p * 0.9));
      };

      const selectOcPart = (id) => {
        setOverclockData(prev => ({ ...prev, overclockSelectedId: prev.overclockSelectedId === id ? null : id }));
      };

      const adjustOcParam = (param, delta) => {
        setOverclockData(prev => {
          const parts = prev.overclockParts || [];
          const idx = parts.findIndex(p => p.id === prev.overclockSelectedId);
          if (idx < 0) return prev;
          const part = { ...parts[idx] };
          const step = part.generation === 'DDR5' ? 2 : 1;
          part[param] = Math.max(10, Math.min(60, part[param] + delta * step));
          part.tested = false; // 값을 바꾸면 확률을 다시 테스트해야 강화 가능
          const next = parts.slice();
          next[idx] = part;
          return { ...prev, overclockParts: next };
        });
      };

      // 테스트 = 현재 조율의 성공 확률을 확인(공개)하는 행위. 목표값 자체는 공개하지 않는다.
      const testOcActivePart = () => {
        setOverclockData(prev => {
          const parts = prev.overclockParts || [];
          const idx = parts.findIndex(p => p.id === prev.overclockSelectedId);
          if (idx < 0) return prev;
          const next = parts.slice();
          next[idx] = { ...next[idx], tested: true };
          return { ...prev, overclockParts: next };
        });
      };

      const attemptOcUpgrade = () => {
        const parts = overclockData.overclockParts || [];
        const part = parts.find(p => p.id === overclockData.overclockSelectedId);
        if (!part) return;
        const prob = calcOcSuccessProb(part);
        const pct = Math.round(prob * 100);
        const isSuccess = Math.random() < prob;
        const removeSelected = (prev) => ({
          ...prev,
          overclockParts: (prev.overclockParts || []).filter(p => p.id !== part.id),
          overclockSelectedId: null,
        });
        if (isSuccess) {
          if (part.generation === 'DDR4') {
            setOverclockData(prev => ({ ...removeSelected(prev), ddr4Overclocked: true }));
            setCombatLogs((logs) => [...logs.slice(-7), { k: 'log.ocDdr4', v: { pct } }]);
          } else {
            let nextStep = 1;
            if (part.targetMhz === 7200) nextStep = 2;
            if (part.targetMhz === 8000) nextStep = 3;
            setOverclockData(prev => ({
              ...removeSelected(prev),
              ddr5OverclockedStep: Math.max(prev.ddr5OverclockedStep || 0, nextStep),
            }));
            setCombatLogs((logs) => [...logs.slice(-7), { k: 'log.ocDdr5', v: { mhz: part.targetMhz, pct } }]);
          }
        } else {
          setOverclockData(prev => removeSelected(prev));
          setCombatLogs((logs) => [...logs.slice(-7), { k: 'log.ocFail', v: { pct } }]);
        }
      };

      const handleAssignOverclockLabUnit = () => {
        if (effectiveUnitLimit < 1) {
          alert(t('oc.noUnitToAssign'));
          return;
        }
        if (overclockLabActive) return;

        setOverclockData(prev => {
          const next = { ...prev, overclockLabActive: true };
          gameStateRef.current.overclockData = next;
          return next;
        });

        const spec = OMG.OVERCLOCK_LAB_SPECS[effectiveOverclockLabLevel];
        setOverclockLabHp(spec.hp);
        setOverclockLabShield(spec.shield);
        setOverclockLabCooldown(0);
        gameStateRef.current.overclockLabFarmLevel = effectiveOverclockLabLevel;
        gameStateRef.current.overclockLabHp = spec.hp;
        gameStateRef.current.overclockLabShield = spec.shield;
        gameStateRef.current.overclockLabCooldown = 0;

        setCombatLogs(prev => [...prev.slice(-7), { k: 'log.labAssign' }]);
      };

      const handleRecallOverclockLabUnit = () => {
        if (!overclockLabActive) return;
        setOverclockData(prev => {
          const next = { ...prev, overclockLabActive: false };
          gameStateRef.current.overclockData = next;
          return next;
        });
        setCombatLogs(prev => [...prev.slice(-7), { k: 'log.labRecall' }]);
      };

      // ----------------------------------------------------------------------
      // 9. 실시간 웹소켓 100층 레이드 방 연결 핸들러
      // ----------------------------------------------------------------------
      // 파티 사냥터 부수효과 핸들러 — 컴포넌트에서 GameSync·부품 의존을 걷어내기 위해 App에 둔다
      const handleTogglePartyHunting = () => {
        setIsPartyHunting((v) => {
          const next = !v;
          if (next && GameSync.hasSession()) {
            const parts = { cpu, gpu, ram, cooler, storage };
            GameSync.startPartyHunting(partyHuntingTier, parts).catch(() => {});
          }
          return next;
        });
      };

      const handlePartyTierSelect = (idx) => {
        const access = OMG.evaluatePartyTierAccess(idx, partyPerfScore, rebirthStat, partyMiningPower);
        if (!access.ok) {
          alert(access.failures.join('\n'));
          return;
        }
        setPartyHuntingTier(idx);
        setIsPartyHunting(true);
        if (GameSync.hasSession()) {
          const parts = { cpu, gpu, ram, cooler, storage };
          GameSync.startPartyHunting(idx, parts).catch(() => {});
        }
      };

      // 미네랄/SCA 최적 파티 티어 자동 배치 — 해금 티어 중 (보상×생존율) 최대 티어 선택 후 파티 ON
      const handlePartyAuto = (mode) => {
        const idx = OMG.findOptimalPartyTierIndex(partyPerfScore, rebirthStat, partyMiningPower, incomeBonusRate, mode);
        handlePartyTierSelect(idx);
      };

      const handleAccountReset = async () => {
        if (isResettingAccount) return;
        if (!confirm(t('settings.confirm1'))) return;
        if (!confirm(t('settings.confirm2'))) return;
        setIsResettingAccount(true);
        try {
          closeRaid();
          await GameSync.resetAccount();
          setIsSettingsOpen(false);
          window.location.reload();
        } catch (err) {
          alert(translateServerError(err.message) || t('settings.resetFail'));
          setIsResettingAccount(false);
        }
      };

      return (
        <div className="container mx-auto w-full min-w-0 max-w-7xl p-3 sm:p-4">
          
          {/* ================================================================== */}
          {/* 상단 자원 바 */}
          {/* ================================================================== */}
          <ResourceBar
            minerals={minerals}
            scaCoins={scaCoins}
            mineralFlash={mineralFlash}
            rebirthCount={rebirthCount}
            rebirthStat={rebirthStat}
            rebirthIncomeMult={rebirthIncomeMult}
            gameSpeedFrames={gameSpeedFrames}
            nickname={nickname}
            setIsSettingsOpen={setIsSettingsOpen}
            onLogout={onLogout}
          />
          <div className="mb-4 flex gap-2 flex-wrap">
            <button onClick={() => setShowScaCenter(v => !v)} className="px-3 py-2 text-xs font-mono border border-cyan-500/30 rounded text-cyan-300">{t('sca.center')}</button>
            <button 
              onClick={() => {
                if ((overclockData.highestRaidFloor || 0) < 20) {
                  alert(t('oc.needFloor20', { floor: overclockData.highestRaidFloor || 0 }));
                  return;
                }
                setShowOverclockLab(v => !v);
              }} 
              className={`px-3 py-2 text-xs font-mono border rounded ${
                (overclockData.highestRaidFloor || 0) >= 20 
                  ? 'border-emerald-500/30 text-emerald-300 hover:border-emerald-500/60' 
                  : 'border-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {t('oc.title')} {(overclockData.highestRaidFloor || 0) < 20 && '🔒'}
            </button>
          </div>
          {showScaCenter && (
            <ScaCenterModal
              scaUpgrades={scaUpgrades}
              gameSpeedFrames={gameSpeedFrames}
              gameSpeedMult={gameSpeedMult}
              ramAttackFrames={ramAttackFrames}
              renderScaShopButton={renderScaShopButton}
            />
          )}

          {showOverclockLab && (
            <OverclockLabModal
              overclockData={overclockData}
              overclockLabActive={overclockLabActive}
              overclockLabHp={overclockLabHp}
              overclockLabShield={overclockLabShield}
              overclockLabCooldown={overclockLabCooldown}
              overclockLabUnitDps={overclockLabUnitDps}
              effectiveOverclockLabLevel={effectiveOverclockLabLevel}
              nextOverclockLabLevel={nextOverclockLabLevel}
              dpsForNextOverclockLab={dpsForNextOverclockLab}
              effectiveUnitLimit={effectiveUnitLimit}
              adjustOcParam={adjustOcParam}
              attemptOcUpgrade={attemptOcUpgrade}
              testOcActivePart={testOcActivePart}
              selectOcPart={selectOcPart}
              calcOcSuccessProb={calcOcSuccessProb}
              handleAssignOverclockLabUnit={handleAssignOverclockLabUnit}
              handleRecallOverclockLabUnit={handleRecallOverclockLabUnit}
            />
          )}

          {upgradeMessage && (
            <div
              role="status"
              aria-live="polite"
              className={`fixed bottom-4 right-3 left-3 sm:left-auto sm:right-4 z-50 max-w-sm mx-auto sm:mx-0 px-3 py-2 rounded-md border text-xs font-mono shadow-md pointer-events-none ${
                upgradeStatus === 'success' ? 'bg-slate-900/95 border-emerald-800/50 text-emerald-300' :
                upgradeStatus === 'exploded' ? 'bg-slate-900/95 border-rose-800/50 text-rose-300' :
                'bg-slate-900/95 border-slate-700/80 text-slate-300'
              }`}
            >
              {upgradeMessage}
            </div>
          )}

          <UpgradeFX fx={upgradeFx} />

          {/* ================================================================== */}
          {/* 중앙 그리드 레이아웃 */}
          {/* ================================================================== */}
          <main className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 min-w-0">
            
            <HardwareMonitor
              specs={specs}
              cpu={cpu}
              gpu={gpu}
              gpuGrade={gpuGrade}
              scaUpgrades={scaUpgrades}
              ram={ram}
              ramSlots={ramSlots}
              effectiveRamGb={effectiveRamGb}
              ramAttackFrames={ramAttackFrames}
              cooler={cooler}
              motherboard={motherboard}
              storage={storage}
              joinRaidRoom={joinRaidRoom}
              getCpuName={getCpuName}
              getGpuName={getGpuName}
              getRamName={getRamName}
              getCoolerName={getCoolerName}
              getStorageName={getStorageName}
              getSummonUnit={getSummonUnit}
            />

            <section className="lg:col-span-7 flex flex-col space-y-4 sm:space-y-6 min-w-0">
              
              <div className="bg-slate-900/40 p-4 sm:p-6 rounded-xl border border-slate-800 flex flex-col space-y-4 min-w-0">
                <h2 className="text-lg uppercase tracking-widest text-slate-300 font-mono flex items-center space-x-2 border-b border-slate-800 pb-3">
                  <span className="text-cyan-400 text-lg mr-1.5">🛒</span>
                  <span>{t('shop.title')}</span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* 기본 1강 장비 팩 구매 카드들 */}
                  <div className="p-4 bg-slate-950/60 rounded border border-slate-800 col-span-2 space-y-3.5 animate-fade-in">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xs font-bold text-cyan-300 font-mono block mb-1">{t('shop.partsTitle')}</span>
                        <p className="text-xs text-slate-400">
                          {t('shop.partsDesc')}
                        </p>
                      </div>
                      {rebirthPreview && (
                        <div className="flex flex-col gap-1">
                          <p className="text-[11px] text-cyan-400 font-mono">
                            {t('shop.rebirthPreview')}<strong>{rebirthPreview.scaReward.toLocaleString()}</strong>{t('shop.rebirthPreview2', {
                              gain: rebirthPreview.statGain.toLocaleString(),
                              total: rebirthPreview.baseStat.toLocaleString(),
                              tier: rebirthPreview.tier?.name ?? '?',
                            })}
                          </p>
                          <button
                            onClick={handleRebirth}
                            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-slate-950 font-bold rounded text-xs tracking-wider transition uppercase shadow-lg shadow-cyan-500/20 animate-pulse"
                          >
                            {t('shop.rebirthBtn')}
                          </button>
                        </div>
                      )}
                    </div>

                    <RamSlotShop
                      ramSlots={ramSlots}
                      effectiveRamGb={effectiveRamGb}
                      minerals={minerals}
                      handlePurchaseRamSlots={handlePurchaseRamSlots}
                    />

                    {/* 부품 구매 — ◀▶로 구매할 강 선택 후 구매 (강화 전용 강은 미표시) */}
                    <ComponentBuyGrid
                      cpuBuyManufacturer={cpuBuyManufacturer}
                      setCpuBuyManufacturer={setCpuBuyManufacturer}
                      coolerBuyKind={coolerBuyKind}
                      setCoolerBuyKind={setCoolerBuyKind}
                      storageBuyKind={storageBuyKind}
                      setStorageBuyKind={setStorageBuyKind}
                      getComponentBuyMeta={getComponentBuyMeta}
                      buyLevelIndex={buyLevelIndex}
                      adjustBuyLevel={adjustBuyLevel}
                      minerals={minerals}
                      handleBuyComponentPack={handleBuyComponentPack}
                      getMotherboardCatalog={getMotherboardCatalog}
                      motherboardBuyManufacturer={motherboardBuyManufacturer}
                      motherboardBuyIndex={motherboardBuyIndex}
                      setMotherboardBuyManufacturer={setMotherboardBuyManufacturer}
                      setMotherboardBuyIndex={setMotherboardBuyIndex}
                      adjustMotherboardBuyIndex={adjustMotherboardBuyIndex}
                      handlePurchaseMotherboard={handlePurchaseMotherboard}
                    />

                    <AutoBuyToggleGrid
                      autoBuyCpuByMfr={autoBuyCpuByMfr}
                      toggleAutoCpuMfr={toggleAutoCpuMfr}
                      autoBuyCoolerByKind={autoBuyCoolerByKind}
                      toggleAutoCoolerKind={toggleAutoCoolerKind}
                      autoBuyStorageByKind={autoBuyStorageByKind}
                      toggleAutoStorageKind={toggleAutoStorageKind}
                      autoBuyGpu={autoBuyGpu}
                      toggleAutoGpu={toggleAutoGpu}
                      autoBuyRam={autoBuyRam}
                      toggleAutoRam={toggleAutoRam}
                      buildBuyMetaForVariant={buildBuyMetaForVariant}
                      getComponentBuyMeta={getComponentBuyMeta}
                      getVariantAutoTarget={getVariantAutoTarget}
                      getAutoBuyLevel={getAutoBuyLevel}
                      adjustAutoTarget={adjustAutoTarget}
                    />

                    {hasActiveAuto && (
                      <AutoStatusPanel
                        autoStatus={autoStatus}
                        autoFeed={autoFeed}
                      />
                    )}

                  </div>

                  {/* ================================================================== */}
                  {/* 보유 장비 창고 (인벤토리) */}
                  {/* ================================================================== */}
                  <InventoryVault
                    inventory={inventory}
                    isUpgrading={isUpgrading}
                    handleInventoryUpgrade={handleInventoryUpgrade}
                    handleEquipComponent={handleEquipComponent}
                    handleSellComponent={handleSellComponent}
                    getCpuName={getCpuName}
                    getGpuName={getGpuName}
                    getRamName={getRamName}
                    getCoolerName={getCoolerName}
                    getSummonUnit={getSummonUnit}
                    getUpgradeProbability={getUpgradeProbability}
                  />

                </div>
              </div>

              {/* ---------------------------------------------------------------- */}
              {/* 하단 - 작업 사냥터 / 파티 사냥터 */}
              {/* ---------------------------------------------------------------- */}
              <div className="bg-slate-900/40 p-4 sm:p-6 rounded-xl border border-slate-800 flex flex-col space-y-4 min-w-0">
                <h2 className="text-base sm:text-lg uppercase tracking-widest text-slate-300 font-mono flex items-center space-x-2 border-b border-slate-800 pb-3">
                  <span className="text-emerald-400 text-lg mr-1.5">💼</span>
                  <span>{t('work.groundTitle')}</span>
                </h2>
                <p className="text-xs text-slate-400 break-words">{t('work.groundDesc1')}<strong className="text-emerald-400">{t('work.groundDescBold')}</strong>{t('work.groundDesc2')}<strong className="text-amber-400">{t('work.groundDescBold2')}</strong>{t('work.groundDesc3', { sec: OMG.WORK_PRACTICAL_CLEAR_KILL_SEC })}</p>
                <p className="text-[10px] text-slate-500 font-mono break-words">
                  {t('work.statLine', { atk: specs.unitDamage, frames: incomeAttackFrames, ms: incomeEventMs, speed: gameSpeedMult.toFixed(2) })}
                  {t('work.statLine2', {
                    hp: workMobSpec.hp,
                    shield: workMobSpec.shield ? t('work.statShield', { n: workMobSpec.shield }) : '',
                    defense: workMobSpec.defense ? t('work.statDefense', { n: workMobSpec.defense }) : '',
                    hits: workHitsToKill,
                    sec: workKillTimeSec.toFixed(1),
                  })}
                  {t('work.statLine3', {
                    atk: OMG.getMobAttackPerHit(huntMobSpec),
                    hp: huntMobSpec.hp,
                    shield: huntMobSpec.shield ? t('work.statShield', { n: huntMobSpec.shield }) : '',
                    hits: huntHitsToKill,
                    sec: huntKillTimeSec.toFixed(1),
                  })}
                  {t('work.statLine4', {
                    hp: specs.unitHp,
                    shield: specs.unitShield,
                    def: specs.unitDefense,
                    sec: OMG.HUNT_UNIT_RESPAWN_MS / 1000,
                  })}
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <WorkPanel
                    clearableWorkCount={clearableWorkCount}
                    workParts={workParts}
                    specs={specs}
                    ramAttackFrames={ramAttackFrames}
                    scaUpgrades={scaUpgrades}
                    workTaskIndex={workTaskIndex}
                    setWorkTaskIndex={setWorkTaskIndex}
                    workCoinPerKillPerUnit={workCoinPerKillPerUnit}
                    workPerKillPerUnit={workPerKillPerUnit}
                    workUnitMode={workUnitMode}
                    maxWorkUnits={maxWorkUnits}
                    setManualWorkUnits={setManualWorkUnits}
                    effectiveWorkUnits={effectiveWorkUnits}
                    setWorkUnitMode={setWorkUnitMode}
                    workIncomeIsCoin={workIncomeIsCoin}
                    formatWorkCoinAsMinerals={formatWorkCoinAsMinerals}
                    workCoinIncomePerSec={workCoinIncomePerSec}
                    workIncomePerSec={workIncomePerSec}
                    isPartyHunting={isPartyHunting}
                    ramAlloc={ramAlloc}
                    workActiveForIncome={workActiveForIncome}
                    huntCombatStatus={huntCombatStatus}
                    workClearStatus={workClearStatus}
                    workKillTimeSec={workKillTimeSec}
                  />
                  <GamingPanel
                    activeGame={activeGame}
                    effectiveUnlockedGameIndex={effectiveUnlockedGameIndex}
                    huntActiveForIncome={huntActiveForIncome}
                    specs={specs}
                    huntKillTimeSec={huntKillTimeSec}
                    huntCombatStatus={huntCombatStatus}
                    isDownloading={isDownloading}
                    isPartyHunting={isPartyHunting}
                    huntPerKillPerUnit={huntPerKillPerUnit}
                    huntIncomePerSec={huntIncomePerSec}
                    downloadTarget={downloadTarget}
                    downloadProgress={downloadProgress}
                    downloadValidation={downloadValidation}
                    startDownload={startDownload}
                    storage={storage}
                  />
                </div>
              </div>

              <PartyHuntingGround
                partyPerfScore={partyPerfScore}
                rebirthStat={rebirthStat}
                partyMiningPower={partyMiningPower}
                isPartyHunting={isPartyHunting}
                handleTogglePartyHunting={handleTogglePartyHunting}
                partyHuntingTier={partyHuntingTier}
                handlePartyTierSelect={handlePartyTierSelect}
                handlePartyAuto={handlePartyAuto}
                incomeBonusRate={incomeBonusRate}
                scaUpgrades={scaUpgrades}
                partyElapsedSec={partyElapsedSec}
              />

              <IncomeLog combatLogs={combatLogs} isPartyHunting={isPartyHunting} />
            </section>
          </main>

          {/* ================================================================== */}
          {/* 레이드 오버레이 모달 */}
          {/* ================================================================== */}
          {isRaidOpen && (
            <RaidModal
              raidState={raidState}
              myId={myId}
              todayHighestClaimedFloor={todayHighestClaimedFloor}
              rewardMessage={rewardMessage}
              errorMessage={errorMessage}
              toggleReady={toggleReady}
              leaveRaidRoom={leaveRaidRoom}
              getRaidBossName={getRaidBossName}
              formatRemainingRewardRange={formatRemainingRewardRange}
              raidResult={raidResult}
              onCloseResult={closeResult}
            />
          )}

          {/* ================================================================== */}
          {/* 설정 모달 */}
          {/* ================================================================== */}
          {isSettingsOpen && (
            <SettingsModal
              isResettingAccount={isResettingAccount}
              setIsSettingsOpen={setIsSettingsOpen}
              handleAccountReset={handleAccountReset}
            />
          )}

        </div>
      );
    }

    // ======================================================================
    // 로그인 게이트: 미로그인 시 로그인/회원가입 화면, 로그인 시 게임(App) 마운트
    // ======================================================================
    function AuthGate() {
      useLang();
      const [phase, setPhase] = useState('booting'); // booting | auth | ready
      const [mode, setMode] = useState('login');      // login | register
      const [username, setUsername] = useState('');
      const [password, setPassword] = useState('');
      // 만 14세 미만은 법정대리인 동의 없이 가입시킬 수 없다(개인정보 보호법 제22조의2).
      // 생년월일을 받지 않는 대신 확인을 받고, 통합 인증도 같은 조건으로 막는다.
      const [ageConfirm, setAgeConfirm] = useState(false);
      const [error, setError] = useState(null);
      const [loading, setLoading] = useState(false);

      // 최초 로드 시 서버에 세션을 물어 자동 로그인
      useEffect(() => {
        // 세션은 HttpOnly 쿠키라 값을 읽을 수 없다. 예전에는 로컬 표식
        // (sca_loggedIn)이 없으면 곧장 로그인 화면으로 갔는데, 그러면 통합 로그인의
        // 핵심인 "다른 서비스에서 이미 로그인한 새 브라우저"를 놓친다 — 쿠키는
        // .elcherlab.com 도메인이라 이미 붙어 있고 서버도 /api/state 를 200 으로
        // 받아주는데 pc 만 로그인 화면을 띄웠다(gm·chat·pet·cc·bm 은 다 인식했다).
        // 그래서 표식이 없어도 일단 서버에 물어보고, 401 이면 그때 로그인 화면으로 간다.
        const hadLocalMark = GameSync.hasSession();
        let cancelled = false;
        const timeoutId = setTimeout(() => {
          if (cancelled) return;
          GameSync.clearAuth();
          // 로그인한 적 없는 방문자에게 "다시 로그인" 은 말이 안 된다
          if (hadLocalMark) setError(t('auth.syncTimeout'));
          setPhase('auth');
        }, 12000);
        (async () => {
          try {
            const state = await GameSync.loadFromServer();
            if (cancelled) return;
            clearTimeout(timeoutId);
            GameSync.restoreState(state);
            setPhase('ready');
          } catch (e) {
            if (cancelled) return;
            clearTimeout(timeoutId);
            GameSync.clearAuth();
            // 401 은 이제 정상 경로다(비로그인 방문자). 표식이 있었을 때만
            // 만료를 알리고, 그 밖의 오류(네트워크·서버)는 그대로 보여준다.
            if (/UNAUTHORIZED/.test(e.message || '')) {
              if (hadLocalMark) setError(t('auth.expired'));
            } else {
              setError(translateServerError(e.message) || t('auth.loadFail'));
            }
            setPhase('auth');
          }
        })();
        return () => {
          cancelled = true;
          clearTimeout(timeoutId);
        };
      }, []);

      const submit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
          const name = username.trim();
          const res = mode === 'login'
            ? await GameSync.login(name, password)
            : await GameSync.register(name, password, ageConfirm);

          // 계정 전환 시 이전 계정의 로컬 데이터가 섞이지 않도록 정리
          GameSync.clearLocalGameState();
          GameSync.setAuth(res.userId, res.nickname);

          const state = await GameSync.loadFromServer();
          if (state && Object.keys(state).length > 0) {
            GameSync.restoreState(state);
          } else {
            // 서버에 저장된 진행도가 없으면(신규/초기) 현재 로컬 상태를 업로드
            await GameSync.saveToServer();
          }
          setPhase('ready');
        } catch (err) {
          setError(translateServerError(err.message) || t('auth.genericError'));
        } finally {
          setLoading(false);
        }
      };

      const handleLogout = async () => {
        await GameSync.saveToServer();
        await GameSync.logout();
        GameSync.clearAuth();
        GameSync.clearLocalGameState();
        // 게임 상태를 완전히 초기화하기 위해 새로고침
        window.location.reload();
      };

      if (phase === 'booting') {
        return (
          <div className="min-h-screen flex items-center justify-center text-slate-400 font-mono text-sm">
            <span className="animate-pulse">{t('auth.syncing')}</span>
          </div>
        );
      }

      if (phase === 'ready') {
        const userId = localStorage.getItem('sca_myId');
        return <App key={userId} onLogout={handleLogout} />;
      }

      // 로그인 / 회원가입 화면
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900/70 border border-emerald-500/20 neon-border-emerald rounded-2xl p-7 space-y-5">
            <div className="text-center space-y-1">
              <div className="text-3xl">🧠</div>
              <h1 className="text-lg font-bold text-emerald-300">{t('auth.appTitle')}</h1>
              <p className="text-xs text-slate-400 font-mono">
                {t(mode === 'login' ? 'auth.loginDesc' : 'auth.registerDesc')}
              </p>
              <button
                type="button"
                onClick={toggleLang}
                title={t('lang.switchTitle')}
                className="px-2 py-0.5 text-xs border border-slate-600 rounded text-slate-300 hover:bg-slate-800 font-mono"
              >
                🌐 {t('lang.other')}
              </button>
            </div>

            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="block text-sm text-slate-400 font-mono mb-1">{t('auth.nickname')}</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:border-emerald-500 outline-none"
                  placeholder={t('auth.nicknamePh')}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 font-mono mb-1">{t('auth.password')}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:border-emerald-500 outline-none"
                  placeholder={t('auth.passwordPh')}
                />
              </div>

              {mode === 'register' && (
                <label className="flex items-start gap-2 text-xs text-slate-400 font-mono cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ageConfirm}
                    onChange={(e) => setAgeConfirm(e.target.checked)}
                    className="mt-0.5 shrink-0 accent-emerald-500"
                  />
                  <span>
                    {t('auth.consent1')}
                    <a href="https://elcherlab.com/terms.html" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline">{t('auth.terms')}</a>{t('auth.consentAnd')}
                    <a href="https://elcherlab.com/privacy.html" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline">{t('auth.privacy')}</a>{t('auth.consent2')}
                  </span>
                </label>
              )}

              {error && (
                <p className="text-xs text-rose-400 font-mono bg-rose-500/10 border border-rose-500/30 rounded px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-emerald-500/90 hover:bg-emerald-400 text-slate-950 font-bold text-sm disabled:opacity-50"
              >
                {loading ? t('auth.loading') : t(mode === 'login' ? 'auth.login' : 'auth.register')}
              </button>
            </form>

            <div className="text-center text-xs text-slate-400 font-mono">
              {t(mode === 'login' ? 'auth.noAccount' : 'auth.hasAccount')}
              <button
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); setAgeConfirm(false); }}
                className="text-emerald-400 underline"
              >
                {t(mode === 'login' ? 'auth.register' : 'auth.login')}
              </button>
            </div>

            <div className="text-center text-[11px] text-slate-500 font-mono space-x-2">
              <a href="https://elcherlab.com/terms.html" target="_blank" rel="noopener noreferrer" className="underline">{t('auth.terms')}</a>
              <a href="https://elcherlab.com/privacy.html" target="_blank" rel="noopener noreferrer" className="underline">{t('auth.privacy')}</a>
              <a href={`https://auth.elcherlab.com/account?lang=${getLang()}`} target="_blank" rel="noopener noreferrer" className="underline">{t('auth.myAccount')}</a>
            </div>
          </div>
        </div>
      );
    }

    document.title = t('meta.title');

    const container = document.getElementById('root');
    const root = ReactDOM.createRoot(container);
    root.render(
      <ErrorBoundary>
        <AuthGate />
      </ErrorBoundary>
    );
