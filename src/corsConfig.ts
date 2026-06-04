import type { CorsOptions } from 'cors';

/**
 * ALLOWED_ORIGINS 환경 변수(쉼표 구분)를 파싱한다.
 * - development + 미설정: 모든 오리진 허용
 * - production + 미설정: Render 기본 배포 URL만 허용
 */
export function getAllowedOrigins(): string[] | null {
  const raw = process.env.ALLOWED_ORIGINS?.trim();
  if (raw) {
    return raw.split(',').map((o) => o.trim()).filter(Boolean);
  }
  if (process.env.NODE_ENV !== 'production') {
    return null; // null = 모든 오리진 허용
  }
  return ['https://computer-upgrade-web.onrender.com'];
}

function isOriginAllowed(origin: string | undefined, allowed: string[] | null): boolean {
  if (allowed === null) return true;
  if (!origin) return true; // same-origin·비브라우저 요청
  return allowed.includes(origin);
}

/** Express cors 미들웨어 옵션 */
export function createExpressCorsOptions(): CorsOptions {
  const allowed = getAllowedOrigins();
  return {
    origin(origin, callback) {
      if (isOriginAllowed(origin, allowed)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin not allowed (${origin})`));
      }
    },
    credentials: true,
  };
}

/** Socket.io cors.origin 값 */
export function getSocketCorsOrigin(): string[] | boolean {
  const allowed = getAllowedOrigins();
  if (allowed === null) return true;
  return allowed;
}
