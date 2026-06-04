/**
 * CI·로컬 공용 테스트 러너.
 * - testHardware: DB 불필요, 항상 실행
 * - testReward / testRaid: DATABASE_URL 또는 DB_* 설정 시에만 실행
 */
import { spawnSync } from 'child_process';
import path from 'path';

const root = path.join(__dirname, '..');

function hasDbConfig(): boolean {
  if (process.env.DATABASE_URL) return true;
  return Boolean(process.env.DB_HOST || process.env.DB_NAME);
}

function runScript(relativePath: string): boolean {
  const scriptPath = path.join(root, relativePath);
  const result = spawnSync(
    process.execPath,
    ['-r', 'ts-node/register', scriptPath],
    { stdio: 'inherit', cwd: root, env: process.env }
  );
  return result.status === 0;
}

async function main() {
  console.log('[TestRunner] hardware simulator tests...');
  if (!runScript('src/testHardware.ts')) {
    process.exit(1);
  }

  if (hasDbConfig()) {
    console.log('[TestRunner] reward integration tests (DB)...');
    if (!runScript('src/testReward.ts')) {
      process.exit(1);
    }
  } else {
    console.log('[TestRunner] Skipping DB tests — DATABASE_URL / DB_* not configured.');
  }

  console.log('[TestRunner] All requested tests passed.');
}

main().catch((err) => {
  console.error('[TestRunner] Fatal error:', err);
  process.exit(1);
});
