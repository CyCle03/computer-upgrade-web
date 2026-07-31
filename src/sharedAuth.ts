import { createHmac, timingSafeEqual } from 'crypto';
import { pool } from './db';

/**
 * 통합 로그인(auth.elcherlab.com) 세션 검증.
 *
 * 신원은 이 앱이 갖지 않는다. `.elcherlab.com` 도메인 쿠키를 공유 시크릿으로
 * **로컬 검증**만 하므로 요청마다 인증 서버를 부르지 않는다 — 인증이 잠깐
 * 죽어도 기존 세션은 그대로 동작한다.
 *
 * 게임 데이터는 `public.users.id` 를 외래키로 여러 테이블이 참조하고 있어
 * 그 id 를 바꾸지 않는다. 대신 `users.identity_id` 로 통합 계정과 연결하고,
 * 요청마다 통합 uuid → 로컬 user id 로 옮겨 준다.
 */

const AUTH_SECRET = process.env.AUTH_SECRET ?? '';
export const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'elab_session';
export const AUTH_ORIGIN = process.env.AUTH_ORIGIN || 'https://auth.elcherlab.com';

if (!AUTH_SECRET || AUTH_SECRET.length < 32) {
  // 아무도 로그인할 수 없는 상태로 조용히 뜨지 않게 한다.
  console.error('AUTH_SECRET 이 없거나 너무 짧습니다(32자 이상). 통합 인증과 같은 값을 .env 에 넣으세요.');
  process.exit(1);
}

export interface SharedSession {
  uid: string; // 통합 계정 uuid
  username: string;
}

function unb64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}
function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** 쿠키 헤더에서 세션 쿠키를 꺼낸다(의존성 추가 없이). */
export function readSessionCookie(header: string | undefined): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() === COOKIE_NAME) {
      return decodeURIComponent(part.slice(i + 1).trim()) || null;
    }
  }
  return null;
}

/**
 * 세션 쿠키의 서명과 만료를 검증한다.
 * elcherlab-auth 의 src/token.js 와 같은 형식이다(형식이 바뀌면 함께 고쳐야 한다).
 */
export function verifySession(token: string | null | undefined): SharedSession | null {
  if (!token || typeof token !== 'string') return null;
  const i = token.indexOf('.');
  if (i < 1) return null;
  const payloadB64 = token.slice(0, i);
  const mac = token.slice(i + 1);

  const expected = b64url(createHmac('sha256', AUTH_SECRET).update(payloadB64).digest());
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload: { uid?: string; u?: string; exp?: number };
  try {
    payload = JSON.parse(unb64url(payloadB64).toString('utf8'));
  } catch {
    return null;
  }
  if (!payload || typeof payload.exp !== 'number') return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  if (!payload.uid) return null;
  return { uid: String(payload.uid), username: String(payload.u ?? '') };
}

/**
 * 통합 계정 uuid 를 이 앱의 users.id 로 옮긴다.
 * 처음 들어온 계정이면 행을 만들어 연결한다(다른 서비스에서 먼저 가입한 사람).
 *
 * 닉네임이 이미 쓰이고 있으면 뒤에 숫자를 붙인다 — nickname 은 UNIQUE 라
 * 충돌하면 가입 자체가 막히기 때문이다. 게임 내 표시명일 뿐이고 로그인
 * 아이디는 통합 인증 쪽이라 달라져도 로그인에는 영향이 없다.
 */
export async function resolveLocalUserId(session: SharedSession): Promise<string | null> {
  const found = await pool.query<{ id: string }>('SELECT id FROM users WHERE identity_id = $1', [session.uid]);
  if (found.rows[0]) return found.rows[0].id;

  const base = (session.username || 'player').slice(0, 40);
  for (let attempt = 0; attempt < 5; attempt++) {
    const nickname = attempt === 0 ? base : `${base}_${attempt}`;
    try {
      const created = await pool.query<{ id: string }>(
        'INSERT INTO users (nickname, identity_id) VALUES ($1, $2) RETURNING id',
        [nickname, session.uid]
      );
      return created.rows[0]?.id ?? null;
    } catch (e) {
      // 닉네임 충돌이면 다음 후보로. 그 밖의 오류는 그대로 올린다.
      const msg = e instanceof Error ? e.message : String(e);
      if (!/duplicate key|unique/i.test(msg)) throw e;
      // identity_id 쪽 충돌이면(동시 요청) 다시 조회해서 쓴다.
      const again = await pool.query<{ id: string }>('SELECT id FROM users WHERE identity_id = $1', [session.uid]);
      if (again.rows[0]) return again.rows[0].id;
    }
  }
  return null;
}

/** 요청의 쿠키에서 이 앱의 user id 까지 한 번에. 실패하면 null. */
export async function userIdFromCookieHeader(header: string | undefined): Promise<string | null> {
  const session = verifySession(readSessionCookie(header));
  if (!session) return null;
  return resolveLocalUserId(session);
}
