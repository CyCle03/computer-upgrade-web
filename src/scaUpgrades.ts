import { GameStatePayload } from './types';
import { StateKey } from './stateKeys';

/** 채굴증폭기 스펙 — originalMapData.js MINING_AMPLIFIER_SPEC 와 값이 일치해야 한다. */
const MINING_POWER_PER_LEVEL = 500;
const MINING_BASE_SPEED_FRAMES = 24;
const MINING_MIN_SPEED_FRAMES = 8;

export type ScaUpgrades = Record<string, unknown>;

/**
 * game_states.sca_scaUpgrades(JSON 문자열)를 파싱한다. 없거나 깨졌으면 빈 객체.
 * (scaIncomeService·scaShopService에 중복돼 있던 것을 통합.)
 */
export function parseScaUpgrades(state: GameStatePayload): ScaUpgrades {
  const raw = state[StateKey.scaUpgrades];
  if (!raw) return {};
  try {
    return JSON.parse(raw) as ScaUpgrades;
  } catch {
    return {};
  }
}

/** 채굴증폭기 구축(해금) 여부. OMG.isMiningAmplifierUnlocked 와 동일 로직. */
export function isMiningAmplifierUnlocked(scaUpgrades?: ScaUpgrades | null): boolean {
  if (!scaUpgrades) return false;
  return !!(scaUpgrades.miningAmplifierUnlock || (Number(scaUpgrades.miningAmplifier) || 0) > 0);
}

/**
 * 채굴력. OMG.getMiningPower 와 동일 로직.
 * 채굴 공속(miningAmplifierSpeed)이 채굴력을 증폭한다 → 기본(레벨×500) × 채굴 공속 배율.
 */
export function calcMiningPower(scaUpgrades?: ScaUpgrades | null): number {
  if (!isMiningAmplifierUnlocked(scaUpgrades)) return 0;
  return Math.round((Number(scaUpgrades!.miningAmplifier) || 0) * MINING_POWER_PER_LEVEL * calcMiningSpeedMult(scaUpgrades));
}

/** 채굴증폭기 공속 배율. OMG.getMiningSpeedMultiplier 와 동일 로직. */
export function calcMiningSpeedMult(scaUpgrades?: ScaUpgrades | null): number {
  if (!isMiningAmplifierUnlocked(scaUpgrades)) return 1;
  const lv = Number(scaUpgrades!.miningAmplifierSpeed) || 0;
  const frames = Math.max(MINING_MIN_SPEED_FRAMES, MINING_BASE_SPEED_FRAMES - lv);
  return MINING_BASE_SPEED_FRAMES / frames;
}
