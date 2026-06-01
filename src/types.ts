// '컴퓨터 강화하기' 웹 복원판 핵심 데이터 구조 및 API 타입 정의

/**
 * 유저 기본 정보 모델
 */
export interface User {
  id: string; // UUID v4
  nickname: string;
  createdAt: Date;
}

/**
 * 인게임 휘발성 재화 모델 (방 입장/퇴장 시 휘발 가능)
 */
export interface InGameCurrency {
  userId: string;
  minerals: number;
  normalCoins: number;
}

/**
 * 클라우드 저장 영구 재화 모델 (보안 보증)
 */
export interface PermanentCurrency {
  userId: string;
  scaCoins: number;
}

/**
 * 일일 레이드 진행 및 마일스톤 모델
 */
export interface DailyRaidProgress {
  userId: string;
  lastPlayedDate: string; // YYYY-MM-DD 형식 (서버 기준 날짜)
  highestClaimedFloor: number; // 오늘 수령 완료한 최고 층수 (0, 10, 20 ... 100)
}

/**
 * 일일 마일스톤 보상 검증 API 요청 DTO
 */
export interface ClaimRewardRequest {
  userId: string;
  currentFloor: number; // 클라이언트가 달성했다고 주장하는 층수 (10의 배수)
}

/**
 * 일일 마일스톤 보상 검증 API 응답 DTO
 */
export interface ClaimRewardResponse {
  success: boolean;
  message: string;
  claimedCoins: number; // 이번 요청으로 새롭게 지급된 SCA 코인 양
  newHighestFloor: number; // 업데이트된 최고 수령 층수
  currentTotalCoins: number; // 유저의 현재 총 SCA 코인 잔액
}

// ============================================================================
// 로그인(계정) 및 게임 진행도 동기화 관련 타입 정의
// ============================================================================

/**
 * 회원가입 / 로그인 요청 DTO
 */
export interface AuthRequest {
  username: string; // 닉네임 = 로그인 ID
  password: string;
}

/**
 * 인증 성공 응답 DTO
 */
export interface AuthResponse {
  token: string; // 세션 Bearer 토큰
  userId: string; // 유저 UUID
  nickname: string;
}

/**
 * 계정별로 서버에 저장되는 게임 진행도 (클라이언트 localStorage 스냅샷)
 * 키는 'sca_*' 형식이며 값은 localStorage에 저장된 문자열 그대로다.
 */
export type GameStatePayload = Record<string, string>;

// ============================================================================
// 하드웨어 시뮬레이터 관련 데이터 구조 및 스펙 타입 정의
// ============================================================================

export type DdrGeneration = 'DDR3' | 'DDR4' | 'DDR5';
export type Manufacturer = 'Intel' | 'AMD';
export type StorageType = 'HDD' | 'SSD';

/**
 * CPU 부품 사양
 */
export interface CpuPart {
  manufacturer: Manufacturer;
  level: number; // 1 이상
  ddrGeneration: DdrGeneration;
}

/**
 * GPU 부품 사양
 */
export interface GpuPart {
  level: number; // 1 이상
}

/**
 * RAM 부품 사양
 */
export interface RamPart {
  level: number; // 1 이상
  clockMhz: number; // 예: 2400, 3200, 4800, 5600 등
  capacityGb: number; // RAM 용량 (예: 8, 16, 32, 64)
  ddrGeneration: DdrGeneration;
}

/**
 * 쿨러 부품 사양
 */
export interface CoolerPart {
  level: number; // 1 이상
  coolingCapacity: number; // 제공하는 발열 해소 수치
}

/**
 * 메인보드 부품 사양 (확률 강화 불가, 완제품 개념)
 */
export interface MotherboardPart {
  socketManufacturer: Manufacturer; // 메인보드 소켓 제조사
  supportedDdrGeneration: DdrGeneration; // 지원하는 DDR 세대
  shieldIncrease: number; // 고정 실드량 가산치 (완제품 스펙)
}

/**
 * 저장장치 부품 사양
 */
export interface StoragePart {
  type: StorageType;
  capacityGb: number; // 저장 용량
}

/**
 * 조립을 위한 전체 컴퓨터 부품 세트
 */
export interface ComputerParts {
  cpu: CpuPart;
  gpu: GpuPart;
  ram: RamPart;
  cooler: CoolerPart;
  motherboard: MotherboardPart;
  storage: StoragePart;
}

/**
 * 페널티 및 오류 시뮬레이션 상태 정보
 */
export interface PenaltyStatus {
  isOverheated: boolean;        // 과열 상태 여부 (CPU 발열 요구량 > 쿨러 성능)
  isSocketMismatched: boolean; // 소켓 불일치 여부 (CPU 제조사 != 보드 소켓 제조사)
  isDdrMismatched: boolean;    // DDR 세대 불일치 여부 (CPU, RAM, 보드 세대 중 불일치 발생)
  hpDecayRate: number;         // 초당 HP 감쇠 비율 (0 ~ 1.0 사이, DDR 오류 시 작동)
  mineralMultiplier: number;   // 초당 미네랄 수익 배율 (정상 1.0, 과열 시 0.5)
}

/**
 * 하드웨어 조립 완료 후 최종 계산되는 가상 유닛 및 부품 총합 스펙
 */
export interface ComputerSpecs {
  unitLimit: number;           // 가용 코어 기반 최대 소환 가능 필드 유닛 수
  maxHuntingUnits: number;     // RAM GB 점유 기반 작업 사냥터 동시 배치 가용 최대 유닛 수
  unitHp: number;              // 유닛 최대 HP
  unitShield: number;          // 메인보드에 의해 가산된 유닛의 최종 고정 실드 수치
  attackSpeedSec: number;      // RAM 클럭 기반 유닛 공격 주기 (초 단위, 낮을수록 빠름)
  unitDamage: number;          // GPU 기반 유닛 공격 데미지
  unitDefense: number;         // Cooler에 기반한 기본 방어력
  downloadSpeedMb: number;     // SSD/HDD 구분에 기반한 상위 사냥터 다운로드 속도
  penalties: PenaltyStatus;    // 실시간 페널티 상태
}

