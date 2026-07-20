/**
 * 로컬 풀스택 실행 하네스
 * ---------------------------------------------------------------------------
 * 원클릭으로: Docker Postgres 기동 → 스키마 적용 → 시드 계정 생성 → 서버 실행.
 * 프로덕션에 푸시하기 전에 로컬에서 UI/API 변경을 눈으로 검증하기 위한 용도.
 *
 *   npm run dev:local        # 전체 스택 기동 후 서버 실행 (http://localhost:3000)
 *   npm run db:up            # Postgres 컨테이너만 기동 + 스키마/시드
 *   npm run db:down          # Postgres 컨테이너 정지·삭제 (데이터 볼륨은 유지)
 *
 * 시드 계정:  nickname=test / password=test   (로그인 화면에서 그대로 사용)
 *
 * 요구사항: Docker Desktop 이 실행 중이어야 함. (데몬이 꺼져 있으면 안내 후 종료)
 * DB 접속 정보는 src/db.ts 기본값(localhost:5432 / postgres / usemap_restore)과
 * 일치하므로 별도 .env 없이도 동작한다.
 */
import { spawn, spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { Pool } from 'pg';

const ROOT = path.join(__dirname, '..');
const CONTAINER = 'cuw-pg';
const VOLUME = 'cuw-pgdata';
const PG_IMAGE = 'postgres:16-alpine';
const DB = { host: 'localhost', port: 5432, user: 'postgres', password: 'postgres', name: 'usemap_restore' };

function sh(cmd: string, args: string[], opts: { silent?: boolean } = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', shell: false });
  if (!opts.silent && r.stdout) process.stdout.write(r.stdout);
  if (!opts.silent && r.stderr) process.stderr.write(r.stderr);
  return { code: r.status ?? 1, out: (r.stdout || '') + (r.stderr || '') };
}

function dockerDaemonUp(): boolean {
  return sh('docker', ['info'], { silent: true }).code === 0;
}

function containerState(): 'running' | 'stopped' | 'absent' {
  const r = sh('docker', ['ps', '-a', '--filter', `name=^/${CONTAINER}$`, '--format', '{{.State}}'], { silent: true });
  const s = r.out.trim();
  if (!s) return 'absent';
  return s.includes('running') ? 'running' : 'stopped';
}

function startContainer() {
  const state = containerState();
  if (state === 'running') {
    console.log(`[devLocal] Postgres 컨테이너(${CONTAINER}) 이미 실행 중.`);
    return;
  }
  if (state === 'stopped') {
    console.log(`[devLocal] 중지된 컨테이너 재기동…`);
    sh('docker', ['start', CONTAINER]);
    return;
  }
  console.log(`[devLocal] Postgres 컨테이너 생성·기동 (${PG_IMAGE})…`);
  const r = sh('docker', [
    'run', '-d',
    '--name', CONTAINER,
    '-p', `${DB.port}:5432`,
    '-e', `POSTGRES_USER=${DB.user}`,
    '-e', `POSTGRES_PASSWORD=${DB.password}`,
    '-e', `POSTGRES_DB=${DB.name}`,
    '-v', `${VOLUME}:/var/lib/postgresql/data`,
    PG_IMAGE,
  ]);
  if (r.code !== 0) {
    console.error('[devLocal] 컨테이너 기동 실패. 위 오류를 확인하세요.');
    process.exit(1);
  }
}

async function waitForPostgres(timeoutMs = 60000) {
  console.log('[devLocal] Postgres 준비 대기…');
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const r = sh('docker', ['exec', CONTAINER, 'pg_isready', '-U', DB.user, '-d', DB.name], { silent: true });
    if (r.code === 0) {
      console.log('[devLocal] Postgres 준비 완료.');
      return;
    }
    await new Promise((res) => setTimeout(res, 1000));
  }
  console.error('[devLocal] Postgres 준비 시간 초과.');
  process.exit(1);
}

async function applySchema() {
  const schemaPath = path.join(ROOT, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  const pool = new Pool({ host: DB.host, port: DB.port, user: DB.user, password: DB.password, database: DB.name });
  try {
    // schema.sql 은 전부 IF NOT EXISTS / OR REPLACE 라 반복 적용해도 안전.
    await pool.query(sql);
    console.log('[devLocal] 스키마 적용 완료 (schema.sql).');
  } finally {
    await pool.end();
  }
}

function seedAccount() {
  console.log('[devLocal] 시드 계정 확인/생성 (test/test)…');
  const r = spawnSync(process.execPath, ['-r', 'ts-node/register', path.join(ROOT, 'scripts', 'seedTestAccount.ts')], {
    stdio: 'inherit',
    cwd: ROOT,
    env: process.env,
  });
  if (r.status !== 0) {
    console.error('[devLocal] 시드 실패.');
    process.exit(1);
  }
}

async function up() {
  if (!dockerDaemonUp()) {
    console.error('\n[devLocal] Docker 데몬이 실행 중이 아닙니다.');
    console.error('  → Docker Desktop 을 실행한 뒤 다시 시도하세요.\n');
    process.exit(1);
  }
  startContainer();
  await waitForPostgres();
  await applySchema();
  seedAccount();
}

async function main() {
  const mode = process.argv[2] || 'dev';

  if (mode === 'down') {
    console.log('[devLocal] Postgres 컨테이너 정지·삭제 (볼륨 유지)…');
    sh('docker', ['rm', '-f', CONTAINER], { silent: true });
    console.log(`[devLocal] 완료. 데이터 볼륨(${VOLUME})은 보존됨. 완전 삭제: docker volume rm ${VOLUME}`);
    return;
  }

  await up();

  if (mode === 'db') {
    console.log('\n[devLocal] DB 준비 완료. 서버는 `npm run dev` 로 실행하세요.');
    console.log('[devLocal] 로그인: nickname=test / password=test\n');
    return;
  }

  // dev 모드: 서버까지 실행
  console.log('\n[devLocal] 서버 실행 → http://localhost:3000  (로그인: test / test)\n');
  const server = spawn(process.execPath, ['-r', 'ts-node/register', path.join(ROOT, 'src', 'server.ts')], {
    stdio: 'inherit',
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'development' },
  });
  const stop = () => { server.kill('SIGINT'); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  server.on('exit', (code) => process.exit(code ?? 0));
}

main().catch((err) => {
  console.error('[devLocal] 치명적 오류:', err);
  process.exit(1);
});
