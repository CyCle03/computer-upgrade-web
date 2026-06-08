import { ComputerParts, ComputerSpecs } from './types';
import { HardwareSimulator } from './hardwareSimulator';

/** originalMapData MINING_AMPLIFIER_SPEC 과 동기화 */
const MINING_POWER_PER_LEVEL = 500;
const MINING_BASE_SPEED_FRAMES = 24;
const MINING_MIN_SPEED_FRAMES = 8;

function isMiningAmplifierUnlocked(scaUpgrades?: any): boolean {
  if (!scaUpgrades) return false;
  return !!(scaUpgrades.miningAmplifierUnlock || (Number(scaUpgrades.miningAmplifier) || 0) > 0);
}

function calcMiningPower(scaUpgrades?: any): number {
  if (!isMiningAmplifierUnlocked(scaUpgrades)) return 0;
  return (Number(scaUpgrades!.miningAmplifier) || 0) * MINING_POWER_PER_LEVEL;
}

function calcMiningSpeedMult(scaUpgrades?: any): number {
  if (!isMiningAmplifierUnlocked(scaUpgrades)) return 1;
  const lv = Number(scaUpgrades!.miningAmplifierSpeed) || 0;
  const frames = Math.max(MINING_MIN_SPEED_FRAMES, MINING_BASE_SPEED_FRAMES - lv);
  return MINING_BASE_SPEED_FRAMES / frames;
}

/**
 * 레이드 참여 플레이어 상태 정보
 */
export interface RaidPlayer {
  socketId: string;
  userId: string;
  nickname: string;
  isReady: boolean;
  parts: ComputerParts;
  specs: ComputerSpecs;
  currentHp: number;        // DDR 오류에 의한 HP Decay 적용용 실시간 HP
  isDead: boolean;           // 유닛 사망 상태 여부
  dpsContribution: number;   // 실시간 초당 DPS 기여량
  miningPower: number;       // 채굴증폭기에 의한 채굴력
  miningSpeedMult: number;   // 채굴증폭기 공속 배율
}

/**
 * 10층 단위 마일스톤 클리어 콜백 타입
 */
export type MilestoneClearCallback = (userId: string, clearedFloor: number) => Promise<any>;

/**
 * 실시간 레이드 방 객체 (상태 제어 및 시뮬레이션 핵심)
 */
export class RaidRoomState {
  public roomId: string;
  public players: Map<string, RaidPlayer> = new Map();
  public status: 'waiting' | 'fighting' | 'won' | 'lost' = 'waiting';
  
  public currentFloor: number = 1;
  public bossMaxHp: number = 0;
  public bossCurrentHp: number = 0;
  public timeLeft: number = 30; // 층당 30초 제한 시간
  public totalDps: number = 0;

  private timerInterval: NodeJS.Timeout | null = null;
  private resetTimeout: NodeJS.Timeout | null = null;
  private tickInProgress = false;
  private onBroadcast: (state: any) => void;
  private onMilestoneCleared: MilestoneClearCallback;

  constructor(roomId: string, onBroadcast: (state: any) => void, onMilestoneCleared: MilestoneClearCallback) {
    this.roomId = roomId;
    this.onBroadcast = onBroadcast;
    this.onMilestoneCleared = onMilestoneCleared;
  }

  /**
   * 플레이어 추가
   */
  public addPlayer(socketId: string, userId: string, nickname: string, parts: ComputerParts, scaUpgrades?: any) {
    if (this.players.size >= 4) {
      throw new Error('방이 꽉 찼습니다. (최대 4인)');
    }
    if (this.status !== 'waiting') {
      throw new Error('이미 게임이 시작되었거나 종료되었습니다.');
    }

    // 하드웨어 사양 사전 계산
    const specs = HardwareSimulator.calculateComputerSpecs(parts, scaUpgrades);
    const miningPower = calcMiningPower(scaUpgrades);
    const miningSpeedMult = calcMiningSpeedMult(scaUpgrades);

    const newPlayer: RaidPlayer = {
      socketId,
      userId,
      nickname,
      isReady: false,
      parts,
      specs,
      currentHp: specs.unitHp, // 초기 HP
      isDead: false,
      dpsContribution: 0,
      miningPower,
      miningSpeedMult,
    };

    // 실시간 DPS 기여도 계산 (초당 공격 횟수 * 데미지 * 유닛수 * 채굴증폭기 배율)
    newPlayer.dpsContribution = this.calculatePlayerDps(newPlayer);
    this.players.set(socketId, newPlayer);
  }

  /**
   * 플레이어 제거
   */
  public removePlayer(socketId: string): boolean {
    const deleted = this.players.delete(socketId);
    if (deleted) {
      // 진행 중 기사 이탈 시 실시간 합산 DPS 재계산
      if (this.status === 'fighting') {
        this.recalculateTotalDps();
      }
    }
    return deleted;
  }

  /**
   * 준비 상태 변경
   */
  public setReady(socketId: string, isReady: boolean) {
    const player = this.players.get(socketId);
    if (player) {
      player.isReady = isReady;
    }
  }

  /**
   * 모든 방 인원 준비 완료 상태 체크
   */
  public isAllReady(): boolean {
    if (this.players.size === 0) return false;
    for (const player of this.players.values()) {
      if (!player.isReady) return false;
    }
    return true;
  }

  /**
   * 보스 HP 공식 (1층 1000부터 시작하여 기하급수 성장)
   */
  private getBossMaxHpForFloor(floor: number): number {
    const baseHp = 1000;
    // 100층 도달 시 약 700억 수준의 보스 HP 설정으로 졸업 유저 합산 스펙만 처치 가능하게 조율
    return Math.round(baseHp * Math.pow(1.28, floor - 1));
  }

  /**
   * 개별 플레이어의 정상 DPS 연산 (보스전 한정 채굴증폭기 보너스 가산)
   */
  private calculatePlayerDps(player: RaidPlayer): number {
    if (player.isDead) return 0;
    
    const { unitDamage, attackSpeedSec, unitLimit } = player.specs;
    // 기본 DPS = (1초 / 공격주기) * 데미지 * 유닛수
    const shotsPerSec = 1 / attackSpeedSec;
    const baseDps = Math.round(shotsPerSec * unitDamage * unitLimit);
    
    const ampMult = player.miningPower > 0 ? 1 + (player.miningPower / 10000) : 1;
    const speedMult = player.miningSpeedMult || 1;
    return Math.round(baseDps * ampMult * speedMult);
  }

  /**
   * 생존 플레이어 DPS 총합 재계산
   */
  private recalculateTotalDps() {
    let sum = 0;
    for (const player of this.players.values()) {
      player.dpsContribution = this.calculatePlayerDps(player);
      sum += player.dpsContribution;
    }
    this.totalDps = sum;
  }

  /**
   * 레이드 시작
   */
  public startRaid() {
    if (this.status !== 'waiting') return;
    this.status = 'fighting';
    this.currentFloor = 1;
    this.timeLeft = 30;
    
    // 생존 플레이어들 HP 리셋 및 실시간 DPS 세팅
    for (const player of this.players.values()) {
      player.currentHp = player.specs.unitHp;
      player.isDead = false;
      player.dpsContribution = this.calculatePlayerDps(player);
    }
    this.recalculateTotalDps();
    this.initFloor(1);

    // 1초 단위 실시간 시뮬레이션 타이머 시작
    this.timerInterval = setInterval(() => this.tickCombat(), 1000);
  }

  /**
   * 새로운 층 초기화
   */
  private initFloor(floor: number) {
    this.currentFloor = floor;
    this.bossMaxHp = this.getBossMaxHpForFloor(floor);
    this.bossCurrentHp = this.bossMaxHp;
    this.timeLeft = 30; // 제한시간 리셋
  }

  /**
   * 실시간 전투 시뮬레이션 매 초 루프
   */
  private async tickCombat() {
    if (this.status !== 'fighting' || this.tickInProgress) {
      if (this.status !== 'fighting') this.stopTimer();
      return;
    }
    this.tickInProgress = true;

    try {
    // 1. 시간 감소 및 타임아웃 패배 체크
    this.timeLeft -= 1;
    if (this.timeLeft <= 0) {
      this.status = 'lost';
      this.stopTimer();
      this.onBroadcast(this.getSummaryState('시간 제한이 초과되어 레이드에 패배하였습니다.'));
      this.scheduleReset();
      return;
    }

    // 2. DDR 세대 불일치 유저 실시간 체력 감쇠(HP Decay) 및 사망 판별
    for (const player of this.players.values()) {
      if (player.isDead) continue;

      if (player.specs.penalties.isDdrMismatched) {
        const decayAmount = player.specs.unitHp * player.specs.penalties.hpDecayRate;
        player.currentHp = Math.max(0, player.currentHp - decayAmount);

        // 체력이 다하면 유닛 사망 처리 및 DPS 0으로 즉시 강하
        if (player.currentHp <= 0) {
          player.isDead = true;
          player.dpsContribution = 0;
          console.log(`[Raid] 플레이어 ${player.nickname}의 유닛들이 DDR 세대 호환 오류에 의한 HP Decay로 전부 파괴되었습니다.`);
        }
      }
    }

    // 3. 합산 DPS 재계산
    this.recalculateTotalDps();
    
    // 4. 연쇄 관통(Overkill Multi-Floor Clear) 로직
    // 한 틱에 DPS 잔여 데미지로 하위 보스들을 연속으로 격파
    let damageRemaining = this.totalDps;
    const milestoneFloors: number[] = [];

    while (damageRemaining > 0 && this.status === 'fighting') {
      const damageApplied = Math.min(this.bossCurrentHp, damageRemaining);
      this.bossCurrentHp -= damageApplied;
      damageRemaining -= damageApplied;

      if (this.bossCurrentHp <= 0) {
        const clearedFloor = this.currentFloor;

        // 10층 단위 돌파 — 틱 종료 후 순차 지급 (동시 claim 레이스 방지)
        if (clearedFloor % 10 === 0) {
          milestoneFloors.push(clearedFloor);
        }

        if (clearedFloor >= 100) {
          // 100층 최종 등반 승리
          this.status = 'won';
          this.stopTimer();
          this.onBroadcast(this.getSummaryState('축하합니다! 100층 보스 레이드 등반에 최종 성공하셨습니다.'));
          this.scheduleReset();
          return;
        } else {
          // 다음 층 자동 진입 및 새로운 보스 HP 충전
          this.initFloor(clearedFloor + 1);
        }
      } else {
        // 보스가 생존한 경우 잔여 공격력 소진
        damageRemaining = 0;
      }
    }

    for (const floor of milestoneFloors) {
      console.log(`[Raid] ${floor}층 마일스톤 돌파 완료. 보상 지급 시작.`);
      for (const player of this.players.values()) {
        try {
          const res = await this.onMilestoneCleared(player.userId, floor);
          console.log(`[Raid Reward] 유저 ${player.nickname} 보상 결과:`, res);
        } catch (err) {
          console.error(`[Raid Reward] 유저 ${player.nickname} 보상 실패:`, err);
        }
      }
    }

    // 5. 실시간 상태 브로드캐스트 전송
    this.onBroadcast(this.getSummaryState());
    } finally {
      this.tickInProgress = false;
    }
  }

  /**
   * 타이머 제거
   */
  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * 레이드 종료 후 대기 상태로의 자동 리셋 예약
   */
  private scheduleReset() {
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
    }
    this.resetTimeout = setTimeout(() => {
      this.resetToWaiting();
    }, 7000); // 7초 후 대기실 복귀
  }

  /**
   * 대기실(waiting) 상태 및 1층으로 복귀
   */
  private resetToWaiting() {
    this.status = 'waiting';
    this.currentFloor = 1;
    this.timeLeft = 30;
    this.bossMaxHp = 0;
    this.bossCurrentHp = 0;
    for (const player of this.players.values()) {
      player.isReady = false;
      player.isDead = false;
      player.currentHp = player.specs.unitHp;
      player.dpsContribution = this.calculatePlayerDps(player);
    }
    this.recalculateTotalDps();
    this.onBroadcast(this.getSummaryState('이전 레이드가 종료되어 대기실 상태로 복귀했습니다.'));
  }

  /**
   * 레이드 강제 파괴/종료
   */
  public destroy() {
    this.stopTimer();
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
      this.resetTimeout = null;
    }
    this.players.clear();
  }

  /**
   * 전송용 요약 데이터 생성
   */
  public getSummaryState(customMessage?: string) {
    const playersSummary: any[] = [];
    this.players.forEach((p) => {
      playersSummary.push({
        userId: p.userId,
        nickname: p.nickname,
        isDead: p.isDead,
        currentHp: Math.round(p.currentHp),
        maxHp: p.specs.unitHp,
        dpsContribution: p.dpsContribution,
      });
    });

    return {
      roomId: this.roomId,
      status: this.status,
      currentFloor: this.currentFloor,
      bossMaxHp: this.bossMaxHp,
      bossCurrentHp: this.bossCurrentHp,
      timeLeft: this.timeLeft,
      totalDps: this.totalDps,
      players: playersSummary,
      message: customMessage || `현재 ${this.currentFloor}층 레이드 진행 중`,
    };
  }
}
