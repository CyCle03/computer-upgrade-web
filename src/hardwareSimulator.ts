import { ComputerParts, ComputerSpecs, PenaltyStatus } from './types';
import { loadOmg } from './omgLoader';

/**
 * 하드웨어 스펙 연산 및 페널티 시뮬레이션 유틸리티 클래스
 */
export class HardwareSimulator {
  
  /**
   * 부품들의 상세 물리 스펙과 페널티 상태를 실시간 계산하는 핵심 함수
   * 
   * @param parts 조립된 컴퓨터 부품 세트
   * @param scaUpgrades 영구 업그레이드 상태 (선택적)
   * @returns 최종 계산된 스펙 및 페널티 상태
   */
  static calculateComputerSpecs(parts: ComputerParts, scaUpgrades?: any): ComputerSpecs {
    const OMG = loadOmg();

    const { cpu, gpu, cooler, motherboard, storage } = parts;
    let ram = parts.ram;

    if (ram && scaUpgrades) {
      if (ram.level === 9 && scaUpgrades.ddr4Overclocked) {
        ram = OMG.applyRamOverclock(ram);
      } else if (ram.level === 13 && scaUpgrades.ddr5OverclockedStep > 0) {
        ram = OMG.applyRamOverclock(ram, scaUpgrades.ddr5OverclockedStep);
      }
    }

    // ------------------------------------------------------------------------
    // 1단계: 페널티 및 오류 감지 (물리 조건 검증)
    // ------------------------------------------------------------------------

    // A. 과열 시스템 (Overheat)
    const cpuHeatDemand = OMG.getCpuCoolingRequired(cpu);
    const isOverheated = cpuHeatDemand > cooler.coolingCapacity;
    const mineralMultiplier = isOverheated ? 0.5 : 1.0;

    // B. 메인보드 소켓 미스매치 (Socket Mismatch)
    const isSocketMismatched = cpu.manufacturer !== motherboard.socketManufacturer;

    // C. DDR 세대 호환 오류 (DDR Generation Mismatch)
    const ddrSet = new Set([
      cpu.ddrGeneration,
      ram.ddrGeneration,
      motherboard.supportedDdrGeneration
    ]);
    const isDdrMismatched = ddrSet.size > 1;

    let hpDecayRate = 0;
    if (isDdrMismatched) {
      hpDecayRate = ddrSet.size === 2 ? 0.50 : 1.00;
    }

    const penalties: PenaltyStatus = {
      isOverheated,
      isSocketMismatched,
      isDdrMismatched,
      hpDecayRate,
      mineralMultiplier,
    };

    // ------------------------------------------------------------------------
    // 2단계: 하드웨어 고유 성능 및 시너지 연산
    // ------------------------------------------------------------------------

    // A. 가용 필드 유닛 개수 (CPU 기반)
    let unitLimit = OMG.getCpuCores(cpu);
    if (isSocketMismatched) {
      unitLimit = Math.max(1, Math.floor(unitLimit * 0.5));
    }

    // B. 사냥터 배치 가용 유닛 수 (RAM 용량 GB 기반)
    const ramAttackFrames = OMG.calcRamAttackFrames(ram);
    // 유닛 데미지(GPU 공격력 × CPU 소환 배율)는 OMG를 단일 소스로 사용 —
    // 프론트 수입 경로와 동일한 값을 보장한다. (CPU 11강 이상에서 배율은 10강으로 clamp됨.)
    const unitDamage = OMG.calcUnitDamageForIncome(parts, scaUpgrades || {});
    const _workUnitsForSpecs = 0; // 백엔드 보스 레이드 시점 사냥터 용량 계산을 위함 (기본 0)
    const ramAllocation = OMG.calcRamAllocation(
      parts, 0, unitLimit, _workUnitsForSpecs, scaUpgrades || {}, unitDamage, ramAttackFrames
    );
    const maxHuntingUnits = ramAllocation.activeHuntingUnits;

    // C. 유닛 체력 (CPU 기반)
    const unitHp = 100 * cpu.level;

    // D. 유닛 실드 수치 (메인보드 고정 사양)
    const unitShield = motherboard.shieldIncrease;

    // E. 유닛 공격 속도 (RAM 프레임 기반, 초 단위)
    const attackSpeedSec = Math.max(0.1, Math.round((ramAttackFrames / 24) * 100) / 100);

    // F. 유닛 데미지 (GPU 및 CPU 소환수 배율 시너지 적용) — 위에서 선계산

    // G. 유닛 기본 방어력 (Cooler 기반)
    let unitDefense = cooler.level * 3;
    if (isOverheated) {
      unitDefense = Math.max(0, Math.floor(unitDefense * 0.5));
    }

    // H. 상위 사냥터 다운로드 속도 (Storage 기반)
    const downloadSpeedMb = OMG.calcDownloadSpeedMb(storage, scaUpgrades || {});

    // ------------------------------------------------------------------------
    // 3단계: 최종 데이터 취합 및 반환
    // ------------------------------------------------------------------------
    return {
      unitLimit,
      maxHuntingUnits,
      unitHp,
      unitShield,
      attackSpeedSec,
      unitDamage,
      unitDefense,
      downloadSpeedMb,
      penalties,
    };
  }
}
