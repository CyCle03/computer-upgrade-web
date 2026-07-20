/**
 * 레이드 보상표 드리프트 가드 (DB 불필요).
 *
 * 레이드 누적 보상표는 originalMapData.js(OMG)를 단일 소스로 쓰지만,
 * USE_RPC 경로가 사용하는 schema.sql의 get_raid_cumulative_reward()에는 같은 수치가
 * PL/pgSQL로 복제돼 있다. 둘이 조용히 어긋나면 프론트/TS 경로와 SQL 경로의 지급액이
 * 달라지므로, 이 테스트가 두 사본의 일치를 강제한다.
 */
import fs from 'fs';
import path from 'path';
import { loadOmg } from './omgLoader';

const root = path.join(__dirname, '..');

function fail(message: string): never {
  console.error(`[rewardTable] FAIL — ${message}`);
  process.exit(1);
}

// 1. OMG 보상표 로드
const omgRewards = loadOmg().RAID_CUMULATIVE_REWARDS as Record<string, number>;
if (!omgRewards) fail('OMG.RAID_CUMULATIVE_REWARDS 를 로드하지 못했습니다.');

// 2. schema.sql 의 get_raid_cumulative_reward CASE 파싱
const schemaSql = fs.readFileSync(path.join(root, 'schema.sql'), 'utf8');
const fnMatch = schemaSql.match(/get_raid_cumulative_reward[\s\S]*?RETURN CASE[\s\S]*?END;/);
if (!fnMatch) fail('schema.sql 에서 get_raid_cumulative_reward CASE 를 찾지 못했습니다.');

const sqlRewards: Record<string, number> = { '0': 0 }; // ELSE 0
const whenRe = /WHEN\s+(\d+)\s+THEN\s+(\d+)/g;
let m: RegExpExecArray | null;
while ((m = whenRe.exec(fnMatch[0])) !== null) {
  sqlRewards[m[1]] = Number(m[2]);
}

// 3. 10~100 마일스톤 전 구간 비교
for (let floor = 0; floor <= 100; floor += 10) {
  const omgVal = Number(omgRewards[String(floor)] ?? omgRewards[floor as unknown as string]) || 0;
  const sqlVal = Number(sqlRewards[String(floor)]) || 0;
  if (omgVal !== sqlVal) {
    fail(`${floor}층 보상 불일치: OMG=${omgVal} vs schema.sql=${sqlVal}`);
  }
}

// 4. 환생 배율 divisor 일치 확인 (10,000,000)
const EXPECTED_DIVISOR = 10_000_000;
if (!schemaSql.includes(`${EXPECTED_DIVISOR}`) && !schemaSql.includes('10000000')) {
  fail(`schema.sql 에서 환생 배율 divisor(${EXPECTED_DIVISOR}) 를 찾지 못했습니다.`);
}

console.log('[rewardTable] PASS — OMG 보상표와 schema.sql 사본이 일치합니다.');
