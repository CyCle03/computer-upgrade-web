/**
 * 레이드 전투 순수 로직 (부수효과·타이머·소켓 없음).
 * ---------------------------------------------------------------------------
 * RaidRoomState(raidSimulator.ts)에서 상태 변이·타이머·브로드캐스트와 뒤섞여 있던
 * 순수 계산 규칙을 분리한 모듈. 여기 함수들은 입력→출력만 있는 순수 함수라
 * DB·소켓 없이 단위 테스트가 가능하다(src/testRaidCombat.ts).
 *
 * RaidRoomState 는 이 모듈을 호출하는 얇은 파사드로 남고, 방/참가자 상태·타이머·
 * 소켓 브로드캐스트·보상 트리거 같은 부수효과만 담당한다.
 */

/** 보스 HP 공식 상수 */
export const RAID_BOSS_BASE_HP = 1000;
// 층당 기하급수 성장 배율. 1.14 → 100층 약 3.4억 HP(30초 클리어에 ~1,150만 DPS 필요).
// 재설계: 일반 하드웨어(성능수치)만으론 ~60층, 채굴력을 올려야 60→100층 도달.
export const RAID_BOSS_HP_GROWTH = 1.14;
// 레이드 채굴봇 DPS 배율 — 채굴력이 레이드의 핵심 스케일. 맥스 채굴(19.5만)×75 ≈ 1,463만.
export const RAID_MINING_DPS_MULT = 75;
// 일반 하드웨어(성능수치) → 레이드 DPS 축소 배율. 하드웨어만으론 ~25층까지만, 나머지는 채굴력이 담당.
export const RAID_HARDWARE_DPS_MULT = 0.011;

/**
 * 보스 HP 공식 — 1층 1,000부터 층당 1.28배 기하급수 성장.
 * 졸업 유저 합산 스펙만 처치 가능하게 조율된 값.
 */
export function getBossMaxHpForFloor(floor: number): number {
  return Math.round(RAID_BOSS_BASE_HP * Math.pow(RAID_BOSS_HP_GROWTH, floor - 1));
}

/** DPS 계산에 필요한 최소 입력(순수 계산용) — RaidPlayer 가 이 형태를 만족한다. */
export interface DpsInput {
  isDead: boolean;
  perfScore: number;   // 일반 하드웨어(컴퓨터) 공격력 = 성능수치(레이드 baseline)
  miningPower: number; // 채굴봇 채굴력(채굴 공속 반영된 effective 값)
}

/**
 * 개별 플레이어 레이드 DPS — 사망 시 0.
 * 일반 하드웨어 공격력 = 성능수치(baseline), 채굴봇 = 채굴력 × RAID_MINING_DPS_MULT(핵심 스케일).
 * → 하드웨어만으론 저층까지만, 채굴 증폭기(공격력+공속)를 올려야 고층/100층 도달.
 */
export function calculatePlayerDps(player: DpsInput): number {
  if (player.isDead) return 0;
  const hardwareDps = Math.max(0, player.perfScore || 0) * RAID_HARDWARE_DPS_MULT;
  const miningDps = Math.max(0, player.miningPower || 0) * RAID_MINING_DPS_MULT;
  return Math.round(hardwareDps + miningDps);
}

/** DDR 세대 불일치 HP Decay 의 1틱 감쇠량. */
export function hpDecayAmount(unitHp: number, hpDecayRate: number): number {
  return unitHp * hpDecayRate;
}

export interface OverkillInput {
  totalDps: number;
  currentFloor: number;
  bossCurrentHp: number;
  bossMaxHp: number;
}

export interface OverkillResult {
  floor: number;             // 결과 층
  bossMaxHp: number;         // 결과 층 보스 최대 HP
  bossCurrentHp: number;     // 남은 보스 HP(격파 시 <= 0)
  milestoneFloors: number[]; // 이번 틱에 돌파한 10층 단위 층(보상 대상, 등장 순서대로)
  won: boolean;              // 100층 최종 등반 성공 여부
}

/**
 * 연쇄 관통(Overkill Multi-Floor Clear) — 한 틱의 합산 DPS로 하위 보스들을 연속 격파.
 * 순수 함수: 층/보스HP/마일스톤/승리 여부만 계산하고 상태 변이는 호출자가 반영한다.
 *
 * 원본 tickCombat 의 while 루프와 동일 규칙:
 *  - 보스를 죽이면 그 층이 10의 배수일 때 마일스톤에 기록.
 *  - 100층을 죽이면 즉시 won=true 로 중단(그 이상 진행/기록 없음).
 *  - 보스가 살아남으면 잔여 데미지 소진.
 */
export function resolveOverkill(input: OverkillInput): OverkillResult {
  let damageRemaining = input.totalDps;
  let floor = input.currentFloor;
  let bossMaxHp = input.bossMaxHp;
  let bossCurrentHp = input.bossCurrentHp;
  const milestoneFloors: number[] = [];
  let won = false;

  while (damageRemaining > 0) {
    const damageApplied = Math.min(bossCurrentHp, damageRemaining);
    bossCurrentHp -= damageApplied;
    damageRemaining -= damageApplied;

    if (bossCurrentHp <= 0) {
      const clearedFloor = floor;

      // 10층 단위 돌파 — 보상 대상 기록(지급은 호출자가 순차 처리)
      if (clearedFloor % 10 === 0) {
        milestoneFloors.push(clearedFloor);
      }

      if (clearedFloor >= 100) {
        won = true;
        break;
      }

      // 다음 층 자동 진입 및 새 보스 HP 충전
      floor = clearedFloor + 1;
      bossMaxHp = getBossMaxHpForFloor(floor);
      bossCurrentHp = bossMaxHp;
    } else {
      // 보스 생존 → 잔여 공격력 소진
      damageRemaining = 0;
    }
  }

  return { floor, bossMaxHp, bossCurrentHp, milestoneFloors, won };
}
