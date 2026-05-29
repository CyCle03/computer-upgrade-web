import { createServer } from 'http';
import { io as clientIo } from 'socket.io-client';
import { setupSocketServer } from './socketServer';
import { ComputerParts } from './types';

// 테스트 전용 HTTP 포트
const TEST_PORT = 4500;

/**
 * 실시간 100층 레이드 및 Socket.io 방 동기화 Carry(버스) 시뮬레이션
 */
async function runRaidSimulation() {
  console.log('==================================================');
  console.log('[RaidTest] 실시간 100층 레이드 & 웹소켓 Carry 통합 테스트 시작');
  console.log('==================================================');

  // 1. 테스트 전용 독립 HTTP 서버 및 Socket.io 기동
  const server = createServer((req, res) => {
    res.writeHead(200);
    res.end('Raid Test Server');
  });
  
  // 소켓 서버 바인딩
  setupSocketServer(server);

  await new Promise<void>((resolve) => {
    server.listen(TEST_PORT, () => {
      console.log(`[RaidTest] 가상 웹소켓 서버 기동 완료: Port ${TEST_PORT}`);
      resolve();
    });
  });

  const serverUrl = `http://localhost:${TEST_PORT}`;

  // 2. 가상 시뮬레이션 플레이어 4명 사양 데이터 정의 (졸업 기사 2명 + 뉴비 2명)
  
  // A. 버스 기사 1 (압도적인 하이엔드 졸업 스펙)
  const carryIntelParts: ComputerParts = {
    cpu: { manufacturer: 'Intel', level: 20, ddrGeneration: 'DDR5' }, // 40코어
    gpu: { level: 60 }, // 초고도 졸업 GPU 스펙 (48조 DPS 확보용)
    ram: { level: 10, clockMhz: 8000, capacityGb: 128, ddrGeneration: 'DDR5' }, // 공속 0.1초 (초당 10회 공격)
    cooler: { level: 10, coolingCapacity: 500 }, // 정상 (과열 없음)
    motherboard: { socketManufacturer: 'Intel', supportedDdrGeneration: 'DDR5', shieldIncrease: 10000 },
    storage: { type: 'SSD', capacityGb: 2000 },
  };

  // B. 버스 기사 2 (압도적인 하이엔드 졸업 스펙)
  const carryAmdParts: ComputerParts = {
    cpu: { manufacturer: 'AMD', level: 20, ddrGeneration: 'DDR5' }, // 40코어
    gpu: { level: 60 }, // 초고도 졸업 GPU 스펙 (48조 DPS 확보용)
    ram: { level: 10, clockMhz: 8000, capacityGb: 128, ddrGeneration: 'DDR5' }, // 공속 0.1초 (초당 10회 공격)
    cooler: { level: 10, coolingCapacity: 500 }, // 정상 (과열 없음)
    motherboard: { socketManufacturer: 'AMD', supportedDdrGeneration: 'DDR5', shieldIncrease: 10000 },
    storage: { type: 'SSD', capacityGb: 2000 },
  };

  // C. 뉴비 1 (소켓 불일치 페널티 유저 - AMD CPU를 Intel 보드에 장착)
  const socketMismatchedNewbie: ComputerParts = {
    cpu: { manufacturer: 'AMD', level: 5, ddrGeneration: 'DDR4' }, // 원래 10기 유닛 제한 -> 5기로 깎임
    gpu: { level: 1 },
    ram: { level: 2, clockMhz: 3200, capacityGb: 16, ddrGeneration: 'DDR4' },
    cooler: { level: 4, coolingCapacity: 100 },
    motherboard: { socketManufacturer: 'Intel', supportedDdrGeneration: 'DDR4', shieldIncrease: 200 }, // Intel 보드
    storage: { type: 'HDD', capacityGb: 250 },
  };

  // D. 뉴비 2 (DDR 세대 난립 호환 오류 HP Decay 페널티 유저 - 3종 DDR 난립)
  const ddrChaosNewbie: ComputerParts = {
    cpu: { manufacturer: 'Intel', level: 3, ddrGeneration: 'DDR3' }, // CPU DDR3, HP 300
    gpu: { level: 1 },
    ram: { level: 2, clockMhz: 2400, capacityGb: 16, ddrGeneration: 'DDR4' }, // RAM DDR4
    cooler: { level: 4, coolingCapacity: 100 },
    motherboard: { socketManufacturer: 'Intel', supportedDdrGeneration: 'DDR5', shieldIncrease: 200 }, // 보드 DDR5
    storage: { type: 'SSD', capacityGb: 250 },
  };

  // 3. 소켓 클라이언트 4개 다발성 커넥션 형성 및 방 입장
  console.log('\n[RaidTest] 가상 클라이언트 4명 소켓 연결 및 joinRoom 전송...');
  
  const client1 = clientIo(serverUrl);
  const client2 = clientIo(serverUrl);
  const client3 = clientIo(serverUrl);
  const client4 = clientIo(serverUrl);

  const roomId = 'carry-room-100';

  // 클라이언트들 조인
  client1.emit('joinRoom', { roomId, userId: 'u-carry-01', nickname: '기사님인텔', parts: carryIntelParts });
  client2.emit('joinRoom', { roomId, userId: 'u-carry-02', nickname: '기사님암드', parts: carryAmdParts });
  client3.emit('joinRoom', { roomId, userId: 'u-newbie-03', nickname: '소켓미스뉴비', parts: socketMismatchedNewbie });
  client4.emit('joinRoom', { roomId, userId: 'u-newbie-04', nickname: 'DDR혼용헬뉴비', parts: ddrChaosNewbie });

  // 4. 실시간 상태 브로드캐스트 이벤트('room_state') 관측 및 로깅
  let battleTickCount = 0;
  let newbie2DiedTick = -1;

  client1.on('room_state', (state: any) => {
    if (state.status === 'fighting') {
      battleTickCount++;
      
      console.log(`\n[RealTime Floor ${state.currentFloor}] ---------------------------------`);
      console.log(`- 보스 HP: ${state.bossCurrentHp} / ${state.bossMaxHp} (${Math.round((state.bossCurrentHp / state.bossMaxHp) * 100)}%)`);
      console.log(`- 남은 제한시간: ${state.timeLeft}초`);
      console.log(`- 방 합산 누적 DPS: ${state.totalDps}`);

      // 유저별 상태 출력
      state.players.forEach((p: any) => {
        console.log(`  * [${p.nickname}] HP: ${p.currentHp}/${p.maxHp} | 상태: ${p.isDead ? '사망' : '생존'} | DPS 기여: ${p.dpsContribution}`);
        
        // 뉴비 2의 HP Decay로 인한 실시간 사망 시점 캡처
        if (p.nickname === 'DDR혼용헬뉴비' && p.isDead && newbie2DiedTick === -1) {
          newbie2DiedTick = battleTickCount;
          console.log(`  >>> [EVENT DETECTED] 'DDR혼용헬뉴비'가 HP Decay 페널티로 사망하였습니다. DPS 기여도 0 수렴 완료.`);
        }
      });
    }
  });

  // 개별 마일스톤 돌파 보상 수신 이벤트 구독
  client1.on('milestone_reward_claimed', (data) => {
    console.log(`\n==================================================`);
    console.log(`[REWARD RECEIVED] 기사님인텔: ${data.clearedFloor}층 돌파 보상 마일스톤 지급 성공.`);
    console.log(`==================================================`);
  });

  client4.on('milestone_reward_claimed', (data) => {
    console.log(`\n==================================================`);
    console.log(`[REWARD RECEIVED] DDR혼용헬뉴비: ${data.clearedFloor}층 돌파 보상 마일스톤 지급 성공.`);
    console.log(`==================================================`);
  });

  // 5. 4명 모두 준비 전송 -> 레이드 격발
  await new Promise<void>((resolve) => setTimeout(resolve, 1500));
  console.log('\n[RaidTest] 방 내부 모든 플레이어 readyStatus 전송 (레이드 기동)...');
  client1.emit('readyStatus', { isReady: true });
  client2.emit('readyStatus', { isReady: true });
  client3.emit('readyStatus', { isReady: true });
  client4.emit('readyStatus', { isReady: true });

  // 6. 등반 완료 시점 관측 대기
  const maxWaitMs = 90000; // 90초 대기 (기사들이 100층 보스 기하급수 HP 성장을 뚫고 최종 등반할 때까지 넉넉히 대기)
  const finalState = await new Promise<any>((resolve) => {
    const timeout = setTimeout(() => {
      resolve(null);
    }, maxWaitMs);

    // 승리 혹은 패배 완료 수신 시 즉시 종료
    client1.on('room_state', (state: any) => {
      if (state.status === 'won' || state.status === 'lost') {
        clearTimeout(timeout);
        resolve(state);
      }
    });
  });

  // 7. 결과 분석 및 정밀 밸리데이션 검증
  console.log('\n==================================================');
  console.log('[RaidTest] 시뮬레이션 종료. 최종 검증 보고서 작성.');
  console.log('==================================================');

  let passed = true;

  if (finalState) {
    console.log(`- 최종 상태: ${finalState.status === 'won' ? '100층 등반 승리 (SUCCESS)' : '제한시간 초과 패배 (FAIL)'}`);
    console.log(`- 돌파 층수: ${finalState.currentFloor}층`);
    
    if (finalState.status === 'won' && finalState.currentFloor === 100) {
      console.log('=> [PASSED] 버스 기사 2인의 DPS 시너지로 100층 보스 레이드 최종 돌파 성공');
    } else {
      console.error('=> [FAILED] 100층 레이드 클리어 실패');
      passed = false;
    }
  } else {
    console.error('=> [FAILED] 레이드 제한 시간 내에 진행이 수렴되지 않았습니다.');
    passed = false;
  }

  // HP Decay 페널티 검증 결과 확인
  if (newbie2DiedTick > 0) {
    console.log(`=> [PASSED] DDR 불일치 뉴비의 HP 감쇠 사망 로직 정상 작동 (사망 틱: ${newbie2DiedTick}s)`);
  } else {
    console.error('=> [FAILED] DDR HP Decay 사망 로직 미작동');
    passed = false;
  }

  // 8. 사용 리소스 반환 및 서버 클린업
  console.log('\n[RaidTest] 소켓 연결 해제 및 HTTP 가상 소켓 서버 종료...');
  client1.disconnect();
  client2.disconnect();
  client3.disconnect();
  client4.disconnect();

  await new Promise<void>((resolve) => {
    server.close(() => {
      console.log('[RaidTest] 서버 정상 닫힘. 테스트 프로세스 리소스 해제 완료.');
      resolve();
    });
  });

  console.log('==================================================');
  if (passed) {
    console.log('[RaidTest] 축하합니다! 실시간 레이드 Carry 동기화 테스트에 통과했습니다.');
  } else {
    console.error('[RaidTest] 경고: 일부 멀티플레이어 레이드 동기화 기능 검증에 실패했습니다.');
  }
  console.log('==================================================');
}

// 스크립트 실행
runRaidSimulation();
