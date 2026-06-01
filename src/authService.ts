import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { pool } from './db';
import { AuthResponse } from './types';

// 비밀번호/닉네임 검증 규칙
const MIN_USERNAME_LEN = 2;
const MAX_USERNAME_LEN = 50;
const MIN_PASSWORD_LEN = 4;

// PostgreSQL UNIQUE 제약 위반 에러 코드
const PG_UNIQUE_VIOLATION = '23505';

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

/**
 * scrypt 기반 비밀번호 해싱 ("salt:hash" 형식). 외부 의존성 없이 Node 내장 crypto 사용.
 */
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

/**
 * 저장된 해시("salt:hash")와 입력 비밀번호를 타이밍 안전 비교로 검증.
 */
function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const keyBuf = Buffer.from(key, 'hex');
  const derived = scryptSync(password, salt, 64);
  return keyBuf.length === derived.length && timingSafeEqual(keyBuf, derived);
}

function normalizeCredentials(username: unknown, password: unknown): { username: string; password: string } {
  const name = typeof username === 'string' ? username.trim() : '';
  const pass = typeof password === 'string' ? password : '';

  if (name.length < MIN_USERNAME_LEN || name.length > MAX_USERNAME_LEN) {
    throw new AuthError(`닉네임은 ${MIN_USERNAME_LEN}~${MAX_USERNAME_LEN}자로 입력해 주세요.`);
  }
  if (pass.length < MIN_PASSWORD_LEN) {
    throw new AuthError(`비밀번호는 최소 ${MIN_PASSWORD_LEN}자 이상이어야 합니다.`);
  }
  return { username: name, password: pass };
}

async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  await pool.query(
    `INSERT INTO auth_sessions (token, user_id) VALUES ($1, $2)`,
    [token, userId]
  );
  return token;
}

export class AuthService {
  /**
   * 회원가입: 유저 + 재화/진행도 + 게임 상태 초기 행 생성 후 세션 토큰 발급.
   */
  static async register(usernameInput: unknown, passwordInput: unknown): Promise<AuthResponse> {
    const { username, password } = normalizeCredentials(usernameInput, passwordInput);
    const passwordHash = hashPassword(password);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let userId: string;
      try {
        const userRes = await client.query(
          `INSERT INTO users (nickname, password_hash) VALUES ($1, $2) RETURNING id`,
          [username, passwordHash]
        );
        userId = userRes.rows[0].id;
      } catch (err: unknown) {
        if (err && typeof err === 'object' && (err as { code?: string }).code === PG_UNIQUE_VIOLATION) {
          throw new AuthError('이미 사용 중인 닉네임입니다.', 409);
        }
        throw err;
      }

      await client.query(
        `INSERT INTO in_game_currencies (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );
      await client.query(
        `INSERT INTO permanent_currencies (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );
      await client.query(
        `INSERT INTO game_states (user_id, state) VALUES ($1, '{}'::jsonb) ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );

      const token = randomBytes(32).toString('hex');
      await client.query(
        `INSERT INTO auth_sessions (token, user_id) VALUES ($1, $2)`,
        [token, userId]
      );

      await client.query('COMMIT');
      return { token, userId, nickname: username };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 로그인: 닉네임으로 유저 조회 후 비밀번호 검증, 세션 토큰 발급.
   */
  static async login(usernameInput: unknown, passwordInput: unknown): Promise<AuthResponse> {
    const { username, password } = normalizeCredentials(usernameInput, passwordInput);

    const res = await pool.query(
      `SELECT id, nickname, password_hash FROM users WHERE nickname = $1`,
      [username]
    );

    if (res.rowCount === 0) {
      throw new AuthError('닉네임 또는 비밀번호가 올바르지 않습니다.', 401);
    }

    const { id, nickname, password_hash } = res.rows[0];
    if (!verifyPassword(password, password_hash)) {
      throw new AuthError('닉네임 또는 비밀번호가 올바르지 않습니다.', 401);
    }

    const token = await createSession(id);
    return { token, userId: id, nickname };
  }

  /**
   * Bearer 토큰을 검증해 유저 ID를 반환한다. 유효하지 않으면 null.
   */
  static async resolveToken(token: string | undefined | null): Promise<string | null> {
    if (!token) return null;
    const res = await pool.query(
      `SELECT user_id FROM auth_sessions WHERE token = $1`,
      [token]
    );
    if (res.rowCount === 0) return null;
    return res.rows[0].user_id as string;
  }

  /**
   * 로그아웃: 세션 토큰 삭제.
   */
  static async logout(token: string | undefined | null): Promise<void> {
    if (!token) return;
    await pool.query(`DELETE FROM auth_sessions WHERE token = $1`, [token]);
  }
}
