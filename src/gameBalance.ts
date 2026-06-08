import fs from 'fs';
import path from 'path';
import vm from 'vm';

export interface RebirthParts {
  cpu?: { manufacturer?: string; level?: number; ddrGeneration?: string };
  gpu?: { level?: number };
  ram?: { level?: number; clockMhz?: number; capacityGb?: number; ddrGeneration?: string };
  cooler?: { level?: number; coolingCapacity?: number; coolerKind?: string };
  storage?: { level?: number; type?: string; capacityGb?: number; storageKind?: string };
}

export interface RebirthOutcome {
  statGain: number;
  baseStat: number;
  correctedStat: number;
  scaReward: number;
  tier: { min: number; max: number; scaBase: number; scaRate: number };
  extra: unknown;
}

export interface PartyTier {
  name: string;
  mineralPerTick: number;
  scaCoins: number;
  minPerfScore?: number;
  minRebirthStat?: number;
  minMiningPower?: number;
}

export interface PartyTierAccess {
  ok: boolean;
  failures: string[];
}

export interface OmgBalanceApi {
  calcRebirthOutcome: (parts: RebirthParts, prevRebirthStat: number) => RebirthOutcome;
  PARTY_HUNTING_TIERS: PartyTier[];
  calcGameSpeedTickMs: (scaUpgrades: Record<string, unknown>, baseMs: number) => number;
  calcPartyPerformanceScore: (parts: RebirthParts, scaUpgrades: Record<string, unknown>) => number;
  getMiningPower: (scaUpgrades: Record<string, unknown>) => number;
  canSelectPartyTier: (
    tierIndex: number,
    perfScore: number,
    rebirthStat: number,
    miningPower: number
  ) => boolean;
  evaluatePartyTierAccess: (
    tierIndex: number,
    perfScore: number,
    rebirthStat: number,
    miningPower: number
  ) => PartyTierAccess;
  resolvePartyHuntingTierIndex: (
    tierIndex: number,
    perfScore: number,
    rebirthStat: number,
    miningPower: number
  ) => number;
}

let cached: OmgBalanceApi | null = null;

/** 클라이언트 originalMapData.js와 동일한 밸런스 로직을 서버에서 재사용 */
export function getOmgBalance(): OmgBalanceApi {
  if (cached) return cached;
  const filePath = path.join(__dirname, '..', 'public', 'originalMapData.js');
  const code = fs.readFileSync(filePath, 'utf8');
  const sandbox: Record<string, unknown> = {};
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  const omg = sandbox.OriginalMapGame as OmgBalanceApi | undefined;
  if (!omg?.calcRebirthOutcome || !omg.PARTY_HUNTING_TIERS || !omg.canSelectPartyTier) {
    throw new Error('originalMapData.js OriginalMapGame 로드 실패');
  }
  cached = omg;
  return cached;
}
