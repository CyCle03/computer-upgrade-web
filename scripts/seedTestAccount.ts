/**
 * 시드 테스트 계정 생성 (멱등).
 * nickname=test / password=test 계정을 만들어 로컬에서 바로 로그인 가능하게 한다.
 * 이미 존재하면 조용히 넘어간다. AuthService 를 재사용하므로 실제 가입과 동일한
 * scrypt 해시·초기 재화/게임상태 행이 생성된다.
 *
 *   TEST_USER / TEST_PASS 환경변수로 계정 정보 재정의 가능.
 */
import { AuthService, AuthError } from '../src/authService';
import { pool } from '../src/db';

const USER = process.env.TEST_USER || 'test';
const PASS = process.env.TEST_PASS || 'test';

async function main() {
  try {
    await AuthService.register(USER, PASS);
    console.log(`[seed] 계정 생성됨: ${USER} / ${PASS}`);
  } catch (err) {
    if (err instanceof AuthError && err.status === 409) {
      console.log(`[seed] 계정 이미 존재: ${USER} (건너뜀)`);
    } else {
      throw err;
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[seed] 실패:', err);
  process.exit(1);
});
