import { ComputerParts, ComputerSpecs, PenaltyStatus } from './types';

/**
 * 하드웨어 스펙 연산 및 페널티 시뮬레이션 유틸리티 클래스
 */
export class HardwareSimulator {
  
  /**
   * 부품들의 상세 물리 스펙과 페널티 상태를 실시간 계산하는 핵심 함수
   * 
   * @param parts 조립된 컴퓨터 부품 세트
   * @returns 최종 계산된 스펙 및 페널티 상태
   */
  static calculateComputerSpecs(parts: ComputerParts): ComputerSpecs {
    const { cpu, gpu, ram, cooler, motherboard, storage } = parts;

    // ------------------------------------------------------------------------
    // 1단계: 페널티 및 오류 감지 (물리 조건 검증)
    // ------------------------------------------------------------------------

    // A. 과열 시스템 (Overheat)
    // CPU 요구 발열량 공식: 레벨당 15 발열량 생성 (1레벨 = 15, 10레벨 = 150)
    const cpuHeatDemand = cpu.level * 15;
    const isOverheated = cpuHeatDemand > cooler.coolingCapacity;
    const mineralMultiplier = isOverheated ? 0.5 : 1.0;

    // B. 메인보드 소켓 미스매치 (Socket Mismatch)
    // CPU 제조사와 메인보드 소켓 지원 제조사가 다르면 소켓 미스매치 오류
    const isSocketMismatched = cpu.manufacturer !== motherboard.socketManufacturer;

    // C. DDR 세대 호환 오류 (DDR Generation Mismatch)
    // CPU, RAM, 메인보드의 DDR 세대 중 단 하나라도 다르면 DDR 세대 오류 발생
    const ddrSet = new Set([
      cpu.ddrGeneration,
      ram.ddrGeneration,
      motherboard.supportedDdrGeneration
    ]);
    const isDdrMismatched = ddrSet.size > 1;

    // DDR 오류 시 초당 HP decay(감소) 비율 계산
    // 3가지 부품 중 2가지 다른 세대가 섞여 있으면 초당 50% (0.50)
    // 3가지 부품 모두 다른 세대면 초당 100% (1.00) (실시간 즉사급 페널티)
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
    // CPU 코어 수: 레벨당 2코어 (1레벨 = 2, 10레벨 = 20)
    let unitLimit = cpu.level * 2;
    
    // [소켓 페널티 적용] 소켓 미스매치 시 가용 유닛 수가 절반으로 깎임 (최소 1기 보장)
    if (isSocketMismatched) {
      unitLimit = Math.max(1, Math.floor(unitLimit * 0.5));
    }

    // B. 사냥터 배치 가용 유닛 수 (RAM 용량 GB 기반)
    // 유닛당 4GB 메모리 점유로 가정
    const memoryPerUnit = 4;
    const maxHuntingUnits = Math.floor(ram.capacityGb / memoryPerUnit);

    // C. 유닛 체력 (CPU 기반)
    // 기본 HP 100에 CPU 레벨당 100씩 상승
    const unitHp = 100 * cpu.level;

    // D. 유닛 실드 수치 (메인보드 고정 사양)
    const unitShield = motherboard.shieldIncrease;

    // E. 유닛 공격 속도 (RAM 클럭 Clock 기반, 낮을수록 자주 공격하므로 성능 높음)
    // 클럭이 높을수록 선딜레이가 감소하는 공식
    // 3200MHz일 때 약 1.2초 공격 주기, 6400MHz일 때 약 0.4초
    // 최소 쿨타임인 0.1초 한계 도달 적용
    const calculatedAttackSpeed = 2.0 - (ram.clockMhz / 4000);
    const attackSpeedSec = Math.max(0.1, Math.round(calculatedAttackSpeed * 100) / 100);

    // F. 유닛 데미지 (GPU 기반)
    // GPU 레벨에 따라 기하급수적으로 데미지 폭등 (공식: 10 * 1.5 ^ (level - 1))
    const baseDamage = 10;
    const unitDamage = Math.round(baseDamage * Math.pow(1.5, gpu.level - 1));

    // G. 유닛 기본 방어력 (Cooler 기반)
    // 쿨러 레벨당 3의 기본 방어력 추가
    let unitDefense = cooler.level * 3;
    
    // [과열 페널티 적용] 쿨링이 제대로 안 될 시 금속 피로도로 인해 유닛 방어력도 50% 깎임
    if (isOverheated) {
      unitDefense = Math.max(0, Math.floor(unitDefense * 0.5));
    }

    // H. 상위 사냥터 다운로드 속도 (Storage 기반)
    // HDD: 기본 25MB/s + 용량비례 0.01MB
    // SSD: 기본 100MB/s (HDD의 4배) + 용량비례 0.05MB
    let downloadSpeedMb = 25 + (storage.capacityGb * 0.01);
    if (storage.type === 'SSD') {
      downloadSpeedMb = (25 * 4) + (storage.capacityGb * 0.05); // HDD 속도의 정확한 4배 베이스 적용
    }
    downloadSpeedMb = Math.round(downloadSpeedMb * 10) / 10; // 소수점 첫째자리 반올림

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
