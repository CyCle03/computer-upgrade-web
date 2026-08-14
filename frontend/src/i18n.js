/**
 * 한국어 / 영어 전환.
 * ---------------------------------------------------------------------------
 * **이 게임의 원문은 한국어다.** 스타크래프트 유즈맵 '컴퓨터 강화하기'의 복원판이라
 * 부품·작업·유닛 이름이 전부 한국어에서 출발한다. 그래서 bm·cc·홈처럼 en 이 원본이
 * 아니라 **ko 가 원본이고 en 이 번역**이다 — 사전에 키가 없으면 en 이 아니라 ko 로
 * 되돌아가고, 번역이 빠져도 화면이 비지 않는다(pet 과 같은 방식).
 *
 * **언어 설정은 localStorage 에만 둔다. 쿠키를 쓰지 않는다.**
 * 개인정보처리방침 9.1 이 "쿠키는 로그인 유지 목적 하나만 씁니다"라고 못박고 있어서
 * 언어 쿠키를 하나 더 심으면 그 문장이 거짓이 된다. 서브도메인끼리 자동으로 공유되지
 * 않는 대신 링크로 넘긴다(`?lang=en`).
 *
 * **전역 스크립트(originalMapData.js · autoSimulator.js)는 이 모듈을 import 할 수 없다.**
 * 둘 다 ES 모듈이 아니고, originalMapData.js 는 서버(src/omgLoader.ts)가 vm 으로 같은
 * 파일을 읽어 밸런스 공식을 공유한다. 그래서 이 모듈이 `window.PcI18n` 다리를 깔고,
 * 그쪽에서는 **호출 시점에** 다리를 찾아 옮긴다(tx 헬퍼). 다리가 없으면(서버·테스트)
 * 원문 한국어가 그대로 나오므로 서버 동작·밸런스 스냅샷은 바뀌지 않는다.
 *
 * 그 결과 `omg.*` 키는 사전에 **en 만** 둔다. ko 원문은 데이터 파일(부품·작업 이름,
 * 실패 사유 문장)에 이미 있고, 사전이 그걸 복사해 두면 한쪽만 고쳐 어긋난다.
 */
import React from 'react';

const STORE_KEY = 'pc/lang/v1';
const SOURCE = 'ko';
export const LANGS = ['ko', 'en'];

const DICT = {
  ko: {
    'lang.other': 'English',
    'lang.switchTitle': '언어를 영어로 바꿉니다',
    'meta.title': "'컴퓨터 강화하기' 웹 복원판 대시보드",

    // ── 부팅 · 오류 ──
    'boot.fail': '게임 데이터를 불러오지 못했습니다.',
    'boot.failHint': '서버(npm start)로 접속했는지, /originalMapData.js 가 로드되는지 확인해 주세요.',
    'err.render': '화면을 표시하지 못했습니다',
    'err.reload': '새로고침',

    // ── 2D 씬(사냥 · 작업) ──
    'scene.kill': '처치!',
    'scene.idle': '대기 중',
    'scene.units': '{a}/{b}기',
    'scene.kills': '처치 {n}',
    'scene.respawn': ' · 리스폰 {n}기',
    'scene.huntPaused': '⏸ 사냥 대기',
    'scene.done': '완성!',
    'scene.workIdle': '작업 대기',
    'scene.cycles': '완성 {n}',
    'scene.workPaused': '⏸ 작업 대기',

    // ── 레이드 ──
    'raid.title': '실시간 100층 보스 등반 레이드',
    'raid.leave': '레이드 나가기',
    'raid.won': '🏆 100층 등반 성공!',
    'raid.lost': '⛔ 레이드 종료 · 시간 초과',
    'raid.floorReached': '도달 층',
    'raid.floorN': '{n}층',
    'raid.thisRun': '이번 레이드 획득',
    'raid.todayTop': '오늘 수령 최고 층',
    'raid.dailyNote': '보상은 하루 1회 · 오늘 남은 구간: {range}',
    'raid.toLobby': '대기실로',
    'raid.errorDetected': '⚠️ 에러 감지: {msg}',
    'raid.lobbyEnter': '레이드 대기실에 진입했습니다. 버스 방 번호:',
    'raid.noCounter': '보스는 반격하지 않습니다 · 합산 DPS로 층당 30초 내 격파',
    'raid.allReadyNote': '모든 인원이 준비 완료 버튼을 누르면 실시간 100층 시뮬레이션 전투에 돌입합니다.',
    'raid.me': '(나)',
    'raid.ready': '준비 완료',
    'raid.waiting': '대기 중',
    'raid.emptySlot': '대기 중...',
    'raid.cancelReady': '준비 취소',
    'raid.setReady': '레이드 준비 완료',
    'raid.target': '🎯 타겟 보스: {name}',
    'raid.statusWon': '100층 완전 등반 성공',
    'raid.statusLost': '시간 초과 패배',
    'raid.statusFighting': '전투 연산 진행 중',
    'raid.bossHp': '보스 개체 체력',
    'raid.timeLeft': '남은 타임아웃 제한 시간',
    'raid.sec': '{n} 초',
    'raid.contrib': '실시간 파티원 기여도',
    'raid.dead': '(⚠️사망)',
    'raid.unitDestroyed': 'DDR에러 유닛 파괴됨',
    'raid.share': '지분: {p}%',
    'raid.totalDps': '파티 합산 누적 DPS:',
    'raid.rewardLeft': '오늘 남은 보상 구간',
    'raid.milestones': '수령 가능 마일스톤:',
    'raid.milestoneRange': '10층 ~ 100층 (10층단위)',
    'raid.claimedTop': '오늘 수령 완료 최고 층:',
    'raid.remainRange': '오늘 남은 보상 구간:',
    'raid.note1': '* 100층 완등 시 최대 80,000 SCA 코인 획득 가능 (유저 환생 수치 비례 증폭)',
    'raid.note2': '* 보상은 하루에 단 한 번, 날짜가 바뀌면 수령 완료 최고 층수가 0으로 리셋되며 다시 처음부터 순차로 차분 획득 가능합니다.',
    'raid.rangeAllDone': '모든 구간 수령 완료',
    'raid.rangeFrom': '{from}층 ~ 100층',
    'raid.connectFail': '레이드 서버 연결에 실패했습니다. 로그인 상태를 확인해 주세요.',
    'raid.disconnected': '🔴 [실시간 연결 끊김] 서버와의 실시간 네트워크 연결이 유실되었습니다 (원인: {reason}). 레이드 참여방에서 이탈되었으니 다시 [레이드 입장]을 눌러 도전해 주시기 바랍니다.',
    'raid.claimToast': '레이드 {floor}층 · SCA +{sca} (잔액 {total})',
    'raid.claimMsg': '돌파 성공. {floor}층 마일스톤 보상 SCA 코인 +{sca} 지급 완료. (잔액 {total})',
    'raid.claimInfo': '레이드 보상: {msg}',
    'raid.join': '100층 레이드 참가',
    'raid.bossFallback': 'Raid Boss Level {floor} (수호 가디언)',

    // ── 설정 ──
    'settings.title': '⚙️ 설정',
    'settings.account': '계정',
    'settings.resetDesc': '진행도를 처음부터 다시 시작합니다. SCA·부품·환생·레이드 기록이 모두 삭제되며, 닉네임과 비밀번호는 그대로 유지됩니다.',
    'settings.resetting': '초기화 중...',
    'settings.reset': '🗑️ 계정 초기화',
    'settings.confirm1': '계정의 모든 진행도(부품·미네랄·SCA·환생·레이드 기록 등)가 삭제됩니다.\n닉네임과 로그인 정보는 유지됩니다.\n\n계속할까요?',
    'settings.confirm2': '정말 초기화합니다. 이 작업은 되돌릴 수 없습니다.',
    'settings.resetFail': '계정 초기화에 실패했습니다.',

    // ── 오버클럭 연구소 ──
    'oc.title': '🧪 오버클럭 연구소',
    'oc.farmLv': '파밍 Lv.{lv}',
    'oc.nextNeed': 'Lv.{lv} 필요 1기 DPS ≥ {dps}',
    'oc.maxFarm': '최고 레벨 파밍 중',
    'oc.ddr4': 'DDR4 오버클럭:',
    'oc.ddr5': 'DDR5 오버클럭 단계:',
    'oc.oc4000': 'OC-4000 해금됨',
    'oc.oc6000': 'OC-6000 해금됨',
    'oc.oc7200': 'OC-7200 해금됨',
    'oc.oc8000': 'OC-8000 해금됨',
    'oc.locked': '미해금',
    'oc.buildingSpec': '건물 스펙 (원작: 레벨별 연구소 트리거명)',
    'oc.level': '레벨',
    'oc.shield': '실드',
    'oc.defense': '방어',
    'oc.needDps': '필요 DPS',
    'oc.labLv': '연구소 {lv}레벨',
    'oc.dropNote': '파괴 시 OC 파츠 30% · 재생 {sec}초 · 순DPS = 차출 1기 DPS − 방어력',
    'oc.hpShield': '연구소 건물 내구도 및 실드',
    'oc.noUnit': '⏸️ 유닛 미차출',
    'oc.respawning': '🔄 건물 재생성 ({sec}초)',
    'oc.attacking': '⚔️ 차출 유닛 1기 공격 중',
    'oc.defenseVal': '방어력: {n}',
    'oc.unitDps': '차출 1기 DPS:',
    'oc.recall': '유닛 복귀 (작업·사냥 풀 +1기)',
    'oc.assignDesc1a': '작업·사냥 유닛 ',
    'oc.assignDesc1b': '를 차출해 연구소 건물을 공격합니다. (건물 반격 없음)',
    'oc.oneUnit': '1기',
    'oc.assignDesc2': '건물을 파괴하면 오버클럭 조율 파츠를 획득할 수 있습니다. (미네랄 불필요)',
    'oc.assign': '유닛 1기 차출 · 연구소 공격 시작',
    'oc.vault': '🧰 미확인 재료 보관함',
    'oc.held': '보유 {n} / 30',
    'oc.vaultEmpty': '작업·사냥 유닛 1기 차출 공격으로 연구소를 파밍하면 미확인 재료가 이곳에 쌓입니다.',
    'oc.vaultEmpty2': '(드랍률 30% · 미네랄·레벨업 불필요 · 성능은 강화 성공 전까지 알 수 없음)',
    'oc.unknown': '미확인 {gen}',
    'oc.tuning': '🔧 조율 중: 미확인 {gen} 재료',
    'oc.targetHidden': '(목표 성능 비공개)',
    'oc.paramDown': '{label} 감소',
    'oc.paramUp': '{label} 증가',
    'oc.successProb': '현재 조율 성공 확률 ',
    'oc.testHint': '값을 조정한 뒤 [확률 테스트]로 성공 확률을 확인하세요.',
    'oc.test': '🔍 확률 테스트',
    'oc.upgrade': '⚡ 강화 (성공 시 해금 · 실패 시 폭발)',
    'oc.needFloor20': '파티 보스 20층 이상 클리어 보상을 수령해야 오버클럭 연구소가 해금됩니다. (현재 최고: {floor}층)',
    'oc.noUnitToAssign': '차출할 유닛이 없습니다. CPU 코어(유닛 상한)를 늘려 주세요.',

    // ── SCA 센터 ──
    'sca.center': '🏛️ SCA 센터',
    'sca.wonAmount': '{n}원',
    'sca.rebirthStart': '다음 환생 시작 미네랄: ',
    'sca.rebirthCap': ' (상한 {cap}) · 환생 미네랄 ',
    'sca.rebirthPer10': '+10원 = {sca} SCA',
    'sca.rebirthFixed': ' 고정',
    'sca.speedLine': '게임 배속 {frames}프레임 (x{mult}) · RAM 공속 {ram}f · 다운로드 x{dl} · {mining}',
    'sca.miningOn': '채굴력 {power} · {frames}f',
    'sca.miningOff': '채굴증폭기 미구축',
    'sca.groupRebirth': '환생 미네랄',
    'sca.groupPermanent': '영구 업그레이드',
    'sca.groupMining': '레이드 · 채굴증폭기',
    'sca.soldOut': '완료',
    'sca.maxBuys': '최대 구매 횟수 도달',
    'sca.alreadyMining': '이미 채굴증폭기를 구축했습니다.',
    'sca.needMining': '먼저 채굴증폭기를 구축해야 합니다.',
    'sca.gpuMaxGrade': 'GPU 등급이 이미 하이엔드입니다.',
    'sca.cannotBuy': '현재 구매할 수 없습니다.',
    'sca.mineralCapReached': '시작 미네랄이 이미 최대 상한선({cap}원)에 도달했습니다.',
    'sca.needCoins': 'SCA 코인 부족 (필요 {cost})',
    'sca.buyFail': 'SCA 상점 구매에 실패했습니다.',
    'sca.toastGpuGrade': 'GPU 등급 → {grade}',
    'sca.toastMiningUnlock': '채굴증폭기 구축 완료 · 레이드 채굴봇 활성화',
    'sca.toastMiningPower': '채굴 공격력 +{add} (채굴력 {power})',
    'sca.toastMiningSpeed': '채굴증폭기 공속 강화 ({frames}f)',
    'sca.toastRebirthMineral': '환생 미네랄 +{n}',

    // ── 하드웨어 모니터 ──
    'hw.title': '내 하드웨어 모니터',
    'hw.warn': '시스템 임계 경고 감지됨',
    'hw.overheat': '⚠️ OVERHEAT ERROR: CPU 요구 열량({demand})이 쿨러 능력({capacity})을 초과했습니다. 초당 미네랄 수입이 50% 삭감되었으며 유닛 방어력이 반감되었습니다.',
    'hw.socket': '⚠️ SOCKET MISMATCH: CPU 제조사({cpu})와 메인보드 소켓 제조사({board})가 불일치하여 유닛 한도가 절반으로 축소됩니다.',
    'hw.ddr': '❌ COMPATIBILITY ERROR: DDR 규격 혼용 오류 발생. 초당 HP Decay 디버프({rate}%/초)가 활성화됩니다.',
    'hw.grade': 'Grade: +{lv}강',
    'hw.gpuLine': '+{lv}강 · {grade} · 공격 {atk}',
    'hw.ramLine': 'Grade: +{lv}강{oc} · 유효 {gb}GB ({slots}슬롯×{per}GB) · {mhz}MHz · 공속 {frames}f · 성능 {perf}',
    'hw.coolerLine': '{kind} · Cap: {cap}W / +{lv}강',
    'hw.air': '공랭',
    'hw.water': '수랭',
    'hw.boardLine': '{mfr} · {ddr} · 실드 +{shield}',
    'hw.storageLine': '+{lv}강 · {gb}GB · {kind} · 다운로드 x{mult}',
    'hw.manifest': '유닛 전투 스펙 매니페스트',
    'hw.unitLimit': '필드 유닛 상한:',
    'hw.unitsN': '{n}기',
    'hw.ramWorkHunt': 'RAM (작업/사냥):',
    'hw.ramWorkHuntVal': '{used}GB / {free}GB · GPU {per}GB/기',
    'hw.huntUnits': '게임 사냥 유닛:',
    'hw.summon': '👾 소환 스타 유닛:',
    'hw.unitHpShield': '유닛 HP/실드:',
    'hw.unitDamage': '유닛 단일데미지:',
    'hw.attackCycle': '공격 주기(공속):',
    'hw.attackCycleVal': '{sec}초 · RAM {frames}f · {mhz}MHz · 성능 {perf}',
    'hw.unitDefense': '방어력(쿨러반영):',
    'hw.dpsOne': '1기 DPS (연구소 기준):',
    'hw.dpsAll': '전체 {n}기 합산 DPS:',
    'hw.raidDps': '⚔️ 레이드 예상 DPS:',
    'hw.raidDpsBreak': '채굴봇 {mining} + 하드웨어 {hardware}(성능수치 {perf})',

    // ── 창고(인벤토리) ──
    'inv.title': '📦 내 보유 장비 창고 (Inventory Warehouse)',
    'inv.count': '보관 {n}개',
    'inv.empty': '창고에 보관 중인 여비 장비가 없습니다. 위 상점에서 원하는 강 티어를 구매하세요.',
    'inv.cpuSpec': '호환: {mfr} / {ddr}',
    'inv.gpuSpec': '데미지 배율: x{mult}',
    'inv.ramSpec': '클럭: {mhz}Mhz / {gb}GB / {ddr}',
    'inv.coolerSpec': '쿨링: {cap}W / 방어력: +{def}',
    'inv.storageSpec': '속도: {kind}',
    'inv.ssdFast': 'SSD 4X 가속',
    'inv.hddBase': 'HDD 기본',
    'inv.level': '+{lv}강',
    'inv.prob': '[확률: {p}%] ',
    'inv.explodeWarn': '⚠️실패 시 파괴',
    'inv.max': '최고강',
    'inv.upgrade': '강화하기',
    'inv.equip': '장착',

    // ── 작업(Work) ──
    'work.title': '💼 작업 (Work) · 실행 가능 {done}/{total}',
    'work.tooltip': '1기 {sec}초/파괴 · RAM {gb}GB+ · 처치당 {income}/기',
    'work.perKillCoin': '+{income}/처치·기',
    'work.perKillActual': ' (실제 {income})',
    'work.perKillMineral': '+{income}원/처치·기',
    'work.perKillMineralActual': ' (실제 {income}원)',
    'work.killLine': '{sec}초/기 · RAM {gb}GB',
    'work.noClear': '처치 불가',
    'work.deploy': '배치',
    'work.unitDown': '작업 유닛 1기 감소',
    'work.unitUp': '작업 유닛 1기 증가',
    'work.unitsN': '{n}기',
    'work.ofN': '/ {n}기',
    'work.slashUnits': '/{n}기',
    'work.auto': '자동 최적',
    'work.manual': '수동',
    'work.perKill': '처치당 ',
    'work.perUnit': '/기',
    'work.perSec': ' · 초당 약 ',
    'work.partyOnStop': ' · 파티 ON — 작업 중단',
    'work.engaged': ' · 교전 ',
    'work.respawning': ' · 리스폰 {n}기',
    'work.reasonPrefix': ' · {reason}',
    'work.noClearSuffix': ' · 처치 불가',
    'work.groundTitle': '작업 사냥터',
    'work.groundDesc1': '작업(Work)과 게임 사냥(Gaming)은 ',
    'work.groundDescBold': '동시 진행',
    'work.groundDesc2': ' · 작업 목록은 원작처럼 모두 표시, ',
    'work.groundDescBold2': '실제 파괴 가능',
    'work.groundDesc3': '할 때만 선택 (GPU·공속·건물 내구 종합 · 1기 {sec}초 이내)',
    'work.statLine': 'GPU 공격 {atk} · RAM {frames}f({ms}ms/타격) · 배속 {speed}×',
    'work.statLine2': ' · 작업 건물 반격 없음 · HP{hp}{shield}{defense} → {hits}타격/{sec}초/파괴',
    'work.statShield': '+실드{n}',
    'work.statDefense': ' 방{n}',
    'work.statLine3': ' · 게임 몬스터 공{atk} HP{hp}{shield} → {hits}타격/{sec}초/처치',
    'work.statLine4': ' · 게임 사냥 유닛 HP{hp}+실드{shield} 방{def} · 몬스터 반격 사망 시 {sec}초 후 자동 재배치',

    // ── 게임 사냥(Gaming) ──
    'game.title': '🎮 게임 사냥 (Gaming)',
    'game.hunting': '사냥 중: ',
    'game.unlocked': ' · 해금 {n}/{total}',
    'game.perKill': ' · +{income}/처치·기',
    'game.perKillActual': ' (실제 {income})',
    'game.hunt': ' · 사냥',
    'game.deploy': '배치 ',
    'game.deployInfo': '(RAM 잔여 {free}GB / CPU {per}GB·기 · 코어 {cores} · GPU참고 {gpu}GB·기)',
    'game.partyOnStop': ' · 파티 ON — 사냥 중단',
    'game.engaged': ' · 교전 ',
    'game.respawning': ' · 리스폰 {n}기',
    'game.perKill2': ' · 처치당 ',
    'game.perUnit': '/기',
    'game.perSec': ' · 초당 약 ',
    'game.zeroWon': '0원',
    'game.download': '다운로드: ',
    'game.downloadInfo': ' · +{gb}GB (여유 {free}GB / 사용 {used}GB / {total}GB) · {cost}',
    'game.downloadBtn': '게임 다운로드',
    'game.downloading': '다운로드 중…',
    'game.allDownloaded': '모든 게임 다운로드 완료',

    // ── 파티 사냥터 ──
    'party.title': '파티 사냥터',
    'party.desc': '원 + SCA 코인 · 파티 ON 시 작업 수입 중단 · 성능 {perf} · 환생수치 {rebirth} · 채굴력 {mining} (틱 가속·생존율)',
    'party.desc2': '1-x=미네랄 특화(반격 없음) · 2-x=SCA 특화(보스 반격 → 채굴력이 생존율 결정). 채굴력 부족한 채 상위 티어 가면 실효 수입 급감.',
    'party.on': '파티 ON',
    'party.off': '파티 OFF',
    'party.optMineral': '💎 미네랄 최적',
    'party.optSca': '🪙 SCA 최적',
    'party.tierTip': '성능 {perf}+ · 환생 {rebirth}+ · 채굴 {mining}+{counter}',
    'party.tierTipCounter': ' · 보스 반격(생존율 {up}%)',
    'party.tierTipNoCounter': ' · 반격 없음',
    'party.tierIncome': '+{mineral}원 / +{sca}SCA',
    'party.uptime': '생존 {up}%',
    'party.selected': '선택: {tier} · {sec}초당 +{mineral}원 +{sca}C{uptime}',
    'party.selectedUptime': ' · 생존율 {up}%',
    'party.elapsed': '⏱ 경과 {elapsed} · 다음 틱까지 {next}초',
    'party.elapsedMin': '{m}분 {s}초',
    'party.elapsedSec': '{s}초',

    // ── AUTO ──
    'auto.live': 'AUTO 실시간',
    'auto.feedEmpty': '구매·강화·수입 이벤트가 여기 표시됩니다.',
    'auto.on': 'AUTO ON',
    'auto.off': 'AUTO OFF',
    'auto.targetDown': '자동 목표 강화 단계 감소',
    'auto.targetUp': '자동 목표 강화 단계 증가',
    'auto.targetLine': '+{cur}강 → {goal}강',
    'auto.idleSummary': '⏳ 방치 정산 · {parts}',
    'auto.sumIncome': '수입 +{amount}',
    'auto.sumUpgrade': '강화 {n}',
    'auto.sumBuy': '구매 {n}',
    'auto.sumExplode': '파괴 {n}',
    // autoSimulator.js 가 {k, v} 로 쌓는 문장 — 그 파일은 브라우저에서만 돌아서
    // 원문도 여기 둔다(데이터 파일과 달리 서버가 읽지 않는다).
    'auto.buy': '[AUTO] {label} {name} +{level}강 구매 (−{cost})',
    'auto.upgradeOk': '[AUTO] {label} +{from}강 → +{to}강 성공',
    'auto.exploded': '[AUTO] {label} +{level}강 파괴',
    'auto.noBuyable': '⚠️ [AUTO] {label} 직접 구매 가능한 강 없음 → 중단',
    'auto.goalReached': '🎉 [AUTO] {label} 목표 {goal}강 달성',
    'auto.statusOff': 'AUTO 꺼짐',
    'auto.statusManual': '수동 강화 중 — AUTO 일시 정지',
    'auto.statusRunning': 'AUTO 진행 중',
    'auto.statusWaiting': '미네랄 부족 — 수입 대기 중',
    'auto.statusIdle': 'AUTO 대기 (목표 달성 또는 작업 없음)',
    'auto.wipeBoth': '⚠️ 작업 {work}기 전멸 · 사냥 {hunt}기 전멸 → {sec}초 후 자동 재배치',
    'auto.wipeWork': '⚠️ 작업 {work}기 전멸 → {sec}초 후 자동 재배치',
    'auto.wipeHunt': '⚠️ 사냥 {hunt}기 전멸 → {sec}초 후 자동 재배치',

    // ── 부품 상점 ──
    'shop.title': '부품 조립 및 고도 강화 상점',
    'shop.partsTitle': '📦 부품 상점 — 부품별 구매 가능 강 (미네랄)',
    'shop.partsDesc': '스프레드시트 구매가 = 미네랄(원) 1:1 (C = N×천만). Intel CPU 1·4·7·10·11강, AMD 1·3강, GPU 1·3·5·7강, RAM 1·5·10강, 쿨러·드라이브 1강, 메인보드(DDR·소켓 표시) 직접 구매. ◀▶로 강 선택 · AUTO는 목표 미만 구매 가능 최고 강 구매 후 목표까지 강화. 램 슬롯 2·4 구매 · 판매 50% 환급.',
    'shop.rebirthPreview': '환생 시: SCA +',
    'shop.rebirthPreview2': ' · 수치 +{gain} (누적 {total}) · {tier}',
    'shop.rebirthBtn': '✨ GPU 환생 (REBIRTH)',
    'shop.ramSlots': '⚡ 램 슬롯 (장착 1개 = 슬롯 수만큼 동일 효과)',
    'shop.ramSlotsNow': '현재 ',
    'shop.ramSlotsN': '{n}슬롯',
    'shop.ramSlotsCap': ' · 유효 용량 ',
    'shop.ramSlotOwned': '✓ {n}슬롯',
    'shop.ramSlotBuy': '{n}슬롯 · {cost}',
    'shop.ramSlotNote': '기본 1슬롯 무료 · 2슬롯 5,000원 · 4슬롯 500,000원',
    'shop.prevLevel': '이전 강화 단계',
    'shop.nextLevel': '다음 강화 단계',
    'shop.levelN': '+{n}강',
    'shop.buy': '구매 {cost}',
    'shop.prevBoard': '이전 메인보드',
    'shop.nextBoard': '다음 메인보드',
    'shop.boardLine': '{ddr} · 실드+{shield}',
    'shop.notBuyable': '{type} +{level}강은 상점에서 직접 구매할 수 없습니다. 구매 가능: {list}. 그 외 강은 강화로 올려야 합니다.',
    'shop.buyableNone': '없음',
    'shop.needMinerals': '미네랄 부족 (필요 {cost} · 보유 {have})',
    'shop.needMineralsShort': '미네랄 부족 (필요 {cost})',
    'shop.ramSlotToast': '램 슬롯 {n}개',

    // ── 환생 ──
    'rebirth.needGpu10': 'GPU 10강 필요',
    'rebirth.downloading': '게임 다운로드 중에는 환생할 수 없습니다. (v1.0.6)',
    'rebirth.confirm': '환생 시 부품·미네랄이 초기화됩니다. SCA 코인/센터·환생 수치는 유지됩니다.',
    'rebirth.needLogin': '환생 SCA 지급을 위해 로그인이 필요합니다.',
    'rebirth.fail': '환생 SCA 지급에 실패했습니다.',
    'rebirth.done': '환생 완료 · SCA +{sca}',

    // ── 자원 바 · 수입 로그 ──
    'res.title': '복원 제어 터미널',
    'res.rebirthLine': '환생 {count}회 · 환생수치 {stat} · 수입 x{mult} · 배속 {frames}f',
    'res.logout': '로그아웃',
    'res.minerals': 'MINERALS (원)',
    'res.won': '원',
    'log.title': '수입 로그',
    'log.system1': '💬 [SYSTEM] 사이버네틱 배틀 매트릭스 기동 완료.',
    'log.system2': '💬 [SYSTEM] 100층 레이드용 소켓 프로토콜 대기 중.',
    'log.party': '[{time}] 👥 파티 :: {tier} +{mineral}원 +{sca}C',
    'log.workHunt': '[{time}] 💼작업 {units}기 처치 +{workIncome}/기 · 🎮{game} {huntUnits}기 처치 +{huntIncome}/기 · 합산 초당 ~{total}',
    'log.noGame': '게임 없음',
    'log.buy': '구매 {name} +{level}강',
    'log.sell': '판매 +{amount}',
    'log.upgraded': '{label} +{level}강',
    'log.exploded': '{label} +{level}강 파괴',
    'log.equipped': '장착 {label} +{level}강',
    'log.partyIncome': '💎 [PARTY] {tier} 파티 {ticks}틱 수입 +{mineral} 미네랄',
    'log.vaultFull': '⚠️ [RESEARCH] 재료 보관함이 가득 차(30개) 드랍한 파츠를 폐기했습니다.',
    'log.labDrop': '🎉 [RESEARCH] Lv.{lv} 연구소 파괴 — 미확인 {gen} 재료 획득! (보유 {count}개)',
    'log.labNoDrop': '⚙️ [RESEARCH] Lv.{lv} 연구소를 파괴했으나 파츠 드랍 실패.',
    'log.ocDdr4': '🎉 [RESEARCH] DDR4 오버클럭 강화 성공! (성공 확률 {pct}%) 이제 DDR4 9강 장착 시 자동으로 OC-4000 사양으로 작동합니다.',
    'log.ocDdr5': '🎉 [RESEARCH] DDR5-{mhz} 오버클럭 강화 성공! (성공 확률 {pct}%) DDR5 13강 장착 시 자동으로 해당 OC 사양으로 작동합니다.',
    'log.ocFail': '❌ [RESEARCH] 오버클럭 강화 실패 (성공 확률 {pct}%). 미확인 재료가 과부하로 폭발하였습니다.',
    'log.labAssign': '⚔️ [RESEARCH] 작업·사냥 유닛 1기를 차출하여 오버클럭 연구소 건물 공격을 시작합니다.',
    'log.labRecall': '↩️ [RESEARCH] 연구소 공격 유닛을 복귀시켰습니다. (작업·사냥 풀 +1기)',
    'fx.upgradeOk': '강화 성공!',
    'fx.exploded': '💥 파괴!',

    // ── 소환 유닛 · 레이드 보스 ──
    'unit.1': '테란 마린 (Marine)',
    'unit.2': '테란 고스트 (Ghost)',
    'unit.3': '프로토스 드라군 (Dragoon)',
    'unit.4': '저그 히드라리스크 (Hydralisk)',
    'unit.5': '테란 영웅 시즈 탱크 (Siege Tank)',
    'unit.6': '프로토스 하이 템플러 / 아칸 (Archon)',
    'unit.7': '프로토스 우주모함 캐리어 (Carrier)',
    'unit.8': '테란 전투순양함 배틀크루저 (Battlecruiser)',
    'unit.9': '프로토스 전설 영웅 제라툴 (Zeratul)',
    'unit.10': '최종 테란 기함 하이페리온 (Hyperion)',
    'unit.11': '프로토스 모선 마더십 (Mothership)',
    'unit.12': '저그 초월체 오버마인드 (Overmind)',
    'unit.13': '공허의 지배자 아몬 (Amon)',
    'unit.14': "초월 존재 젤나가 (Xel'Naga)",
    'unit.unknown': '미확인 차원 유닛',
    'boss.10': 'Guarder (폭주한 광전사 영웅)',
    'boss.20': 'Torrasque (울트라리스크 융합수)',
    'boss.30': 'Matriarch (뮤탈리스크 군락 영웅)',
    'boss.40': 'Unclean One (디파일러 불사 보스)',
    'boss.50': 'General Duke (크론 배틀크루저)',
    'boss.60': 'Fenix (드라군 기계 거신 영웅)',
    'boss.70': 'Zeratul (공허의 방랑자 제라툴)',
    'boss.80': 'Infested Kerrigan (칼날의 여왕 케리건)',
    'boss.90': 'The Overmind (초월체 생체 거대 코어)',
    'boss.100': 'Amon (어두운 공허의 지배자 아몬)',

    // ── 로그인 ──
    'auth.syncing': '⏳ 진행도 동기화 중...',
    'auth.appTitle': '컴퓨터 강화하기',
    'auth.loginDesc': '로그인하여 진행도를 불러옵니다',
    'auth.registerDesc': '계정을 만들어 진행도를 저장합니다',
    'auth.nickname': '닉네임',
    'auth.nicknamePh': '2~50자',
    'auth.password': '비밀번호',
    'auth.passwordPh': '최소 4자',
    'auth.consent1': '만 14세 이상이며, ',
    'auth.terms': '이용약관',
    'auth.consentAnd': '과 ',
    'auth.privacy': '개인정보처리방침',
    'auth.consent2': '에 동의합니다.',
    'auth.loading': '처리 중...',
    'auth.login': '로그인',
    'auth.register': '회원가입',
    'auth.noAccount': '계정이 없으신가요? ',
    'auth.hasAccount': '이미 계정이 있으신가요? ',
    'auth.myAccount': '내 계정',
    'auth.syncTimeout': '서버 동기화 시간이 초과되었습니다. 다시 로그인해 주세요.',
    'auth.expired': '세션이 만료되었습니다. 다시 로그인해 주세요.',
    'auth.loadFail': '진행도를 불러오지 못했습니다.',
    'auth.genericError': '오류가 발생했습니다.',
  },

  en: {
    'lang.other': '한국어',
    'lang.switchTitle': 'Switch the language to Korean',
    'meta.title': "'PC Upgrade' Web Restoration Dashboard",

    'boot.fail': 'Could not load the game data.',
    'boot.failHint': 'Check that you opened the site through the server (npm start) and that /originalMapData.js loads.',
    'err.render': 'Could not render the screen',
    'err.reload': 'Reload',

    'scene.kill': 'Killed!',
    'scene.idle': 'Idle',
    'scene.units': '{a}/{b} units',
    'scene.kills': '{n} kills',
    'scene.respawn': ' · {n} respawning',
    'scene.huntPaused': '⏸ Hunt idle',
    'scene.done': 'Done!',
    'scene.workIdle': 'Work idle',
    'scene.cycles': '{n} done',
    'scene.workPaused': '⏸ Work idle',

    'raid.title': 'Live 100-Floor Boss Climb Raid',
    'raid.leave': 'Leave the raid',
    'raid.won': '🏆 All 100 floors cleared!',
    'raid.lost': '⛔ Raid over · timed out',
    'raid.floorReached': 'Floor reached',
    'raid.floorN': 'Floor {n}',
    'raid.thisRun': 'Earned this raid',
    'raid.todayTop': 'Highest floor claimed today',
    'raid.dailyNote': 'Rewards once a day · remaining today: {range}',
    'raid.toLobby': 'Back to lobby',
    'raid.errorDetected': '⚠️ Error: {msg}',
    'raid.lobbyEnter': 'You are in the raid lobby. Room:',
    'raid.noCounter': 'The boss does not counterattack · clear each floor within 30s on combined DPS',
    'raid.allReadyNote': 'Once everyone is ready, the live 100-floor simulated battle begins.',
    'raid.me': '(you)',
    'raid.ready': 'Ready',
    'raid.waiting': 'Waiting',
    'raid.emptySlot': 'Waiting...',
    'raid.cancelReady': 'Cancel ready',
    'raid.setReady': 'Ready up',
    'raid.target': '🎯 Target boss: {name}',
    'raid.statusWon': 'All 100 floors cleared',
    'raid.statusLost': 'Timed out',
    'raid.statusFighting': 'Battle in progress',
    'raid.bossHp': 'Boss HP',
    'raid.timeLeft': 'Time left before timeout',
    'raid.sec': '{n} s',
    'raid.contrib': 'Live party contribution',
    'raid.dead': '(⚠️dead)',
    'raid.unitDestroyed': 'DDR error — unit destroyed',
    'raid.share': 'Share: {p}%',
    'raid.totalDps': 'Party total DPS:',
    'raid.rewardLeft': "Today's remaining rewards",
    'raid.milestones': 'Claimable milestones:',
    'raid.milestoneRange': 'Floors 10–100 (every 10)',
    'raid.claimedTop': 'Highest claimed today:',
    'raid.remainRange': 'Remaining today:',
    'raid.note1': '* Clearing floor 100 grants up to 80,000 SCA coins (scaled by your rebirth stat)',
    'raid.note2': '* Rewards are granted once a day. When the date changes, the highest claimed floor resets to 0 and you can earn each step again.',
    'raid.rangeAllDone': 'All ranges claimed',
    'raid.rangeFrom': 'Floors {from}–100',
    'raid.connectFail': 'Could not connect to the raid server. Check that you are signed in.',
    'raid.disconnected': '🔴 [Connection lost] The live connection to the server was lost (reason: {reason}). You left the raid room — press [Join raid] to try again.',
    'raid.claimToast': 'Raid floor {floor} · SCA +{sca} (balance {total})',
    'raid.claimMsg': 'Floor cleared. Milestone reward for floor {floor} paid: SCA +{sca}. (balance {total})',
    'raid.claimInfo': 'Raid reward: {msg}',
    'raid.join': 'Join the 100-floor raid',
    'raid.bossFallback': 'Raid Boss Level {floor} (Guardian)',

    'settings.title': '⚙️ Settings',
    'settings.account': 'Account',
    'settings.resetDesc': 'Start your progress over. SCA, parts, rebirths and raid records are all deleted; your nickname and password stay.',
    'settings.resetting': 'Resetting...',
    'settings.reset': '🗑️ Reset account',
    'settings.confirm1': 'All progress on this account (parts, minerals, SCA, rebirths, raid records) will be deleted.\nYour nickname and sign-in details stay.\n\nContinue?',
    'settings.confirm2': 'Resetting for real. This cannot be undone.',
    'settings.resetFail': 'Could not reset the account.',

    'oc.title': '🧪 Overclock Lab',
    'oc.farmLv': 'Farming Lv.{lv}',
    'oc.nextNeed': 'Lv.{lv} needs single-unit DPS ≥ {dps}',
    'oc.maxFarm': 'Farming the top level',
    'oc.ddr4': 'DDR4 overclock:',
    'oc.ddr5': 'DDR5 overclock step:',
    'oc.oc4000': 'OC-4000 unlocked',
    'oc.oc6000': 'OC-6000 unlocked',
    'oc.oc7200': 'OC-7200 unlocked',
    'oc.oc8000': 'OC-8000 unlocked',
    'oc.locked': 'Locked',
    'oc.buildingSpec': 'Building spec (original map: lab trigger name per level)',
    'oc.level': 'Level',
    'oc.shield': 'Shield',
    'oc.defense': 'Defense',
    'oc.needDps': 'DPS needed',
    'oc.labLv': 'Lab level {lv}',
    'oc.dropNote': 'On destruction: 30% OC part · respawn {sec}s · net DPS = single-unit DPS − defense',
    'oc.hpShield': 'Lab building HP and shield',
    'oc.noUnit': '⏸️ No unit assigned',
    'oc.respawning': '🔄 Building respawning ({sec}s)',
    'oc.attacking': '⚔️ 1 assigned unit attacking',
    'oc.defenseVal': 'Defense: {n}',
    'oc.unitDps': 'Assigned unit DPS:',
    'oc.recall': 'Recall the unit (work/hunt pool +1)',
    'oc.assignDesc1a': 'Assign ',
    'oc.assignDesc1b': ' from the work/hunt pool to attack the lab building. (No counterattack)',
    'oc.oneUnit': '1 unit',
    'oc.assignDesc2': 'Destroying the building can drop an overclock tuning part. (No minerals needed)',
    'oc.assign': 'Assign 1 unit · start attacking the lab',
    'oc.vault': '🧰 Unidentified part vault',
    'oc.held': 'Held {n} / 30',
    'oc.vaultEmpty': 'Farm the lab with one assigned work/hunt unit and unidentified parts pile up here.',
    'oc.vaultEmpty2': '(30% drop rate · no minerals or levels needed · performance stays hidden until the upgrade succeeds)',
    'oc.unknown': 'Unknown {gen}',
    'oc.tuning': '🔧 Tuning: unknown {gen} part',
    'oc.targetHidden': '(target performance hidden)',
    'oc.paramDown': 'Decrease {label}',
    'oc.paramUp': 'Increase {label}',
    'oc.successProb': 'Current tuning success chance ',
    'oc.testHint': 'Adjust the values, then press [Test chance] to see the success rate.',
    'oc.test': '🔍 Test chance',
    'oc.upgrade': '⚡ Upgrade (unlock on success · explodes on failure)',
    'oc.needFloor20': 'You must claim a party-boss reward for floor 20 or higher to unlock the Overclock Lab. (current best: floor {floor})',
    'oc.noUnitToAssign': 'No unit to assign. Raise your CPU cores (unit cap) first.',

    'sca.center': '🏛️ SCA Center',
    'sca.wonAmount': '{n} won',
    'sca.rebirthStart': 'Minerals at next rebirth: ',
    'sca.rebirthCap': ' (cap {cap}) · rebirth minerals ',
    'sca.rebirthPer10': '+10 won = {sca} SCA',
    'sca.rebirthFixed': ', fixed',
    'sca.speedLine': 'Game speed {frames} frames (x{mult}) · RAM attack {ram}f · download x{dl} · {mining}',
    'sca.miningOn': 'Mining power {power} · {frames}f',
    'sca.miningOff': 'Mining amplifier not built',
    'sca.groupRebirth': 'Rebirth minerals',
    'sca.groupPermanent': 'Permanent upgrades',
    'sca.groupMining': 'Raid · mining amplifier',
    'sca.soldOut': 'Done',
    'sca.maxBuys': 'Purchase limit reached',
    'sca.alreadyMining': 'The mining amplifier is already built.',
    'sca.needMining': 'Build the mining amplifier first.',
    'sca.gpuMaxGrade': 'The GPU grade is already high-end.',
    'sca.cannotBuy': 'This cannot be bought right now.',
    'sca.mineralCapReached': 'Starting minerals already reached the cap ({cap} won).',
    'sca.needCoins': 'Not enough SCA coins (need {cost})',
    'sca.buyFail': 'The SCA shop purchase failed.',
    'sca.toastGpuGrade': 'GPU grade → {grade}',
    'sca.toastMiningUnlock': 'Mining amplifier built · raid mining bot active',
    'sca.toastMiningPower': 'Mining attack +{add} (mining power {power})',
    'sca.toastMiningSpeed': 'Mining amplifier attack speed up ({frames}f)',
    'sca.toastRebirthMineral': 'Rebirth minerals +{n}',

    'hw.title': 'My hardware monitor',
    'hw.warn': 'Critical system warning detected',
    'hw.overheat': '⚠️ OVERHEAT ERROR: CPU heat demand ({demand}) exceeds cooler capacity ({capacity}). Mineral income per second is cut by 50% and unit defense is halved.',
    'hw.socket': '⚠️ SOCKET MISMATCH: the CPU maker ({cpu}) and the motherboard socket maker ({board}) do not match, so the unit cap is halved.',
    'hw.ddr': '❌ COMPATIBILITY ERROR: mixed DDR generations. An HP decay debuff ({rate}%/s) is active.',
    'hw.grade': 'Grade: +{lv}',
    'hw.gpuLine': '+{lv} · {grade} · attack {atk}',
    'hw.ramLine': 'Grade: +{lv}{oc} · effective {gb}GB ({slots} slots×{per}GB) · {mhz}MHz · attack {frames}f · perf {perf}',
    'hw.coolerLine': '{kind} · Cap: {cap}W / +{lv}',
    'hw.air': 'Air',
    'hw.water': 'Liquid',
    'hw.boardLine': '{mfr} · {ddr} · shield +{shield}',
    'hw.storageLine': '+{lv} · {gb}GB · {kind} · download x{mult}',
    'hw.manifest': 'Unit combat spec manifest',
    'hw.unitLimit': 'Field unit cap:',
    'hw.unitsN': '{n} units',
    'hw.ramWorkHunt': 'RAM (work/hunt):',
    'hw.ramWorkHuntVal': '{used}GB / {free}GB · GPU {per}GB per unit',
    'hw.huntUnits': 'Game hunting units:',
    'hw.summon': '👾 Summoned StarCraft unit:',
    'hw.unitHpShield': 'Unit HP/shield:',
    'hw.unitDamage': 'Unit hit damage:',
    'hw.attackCycle': 'Attack cycle (speed):',
    'hw.attackCycleVal': '{sec}s · RAM {frames}f · {mhz}MHz · perf {perf}',
    'hw.unitDefense': 'Defense (with cooler):',
    'hw.dpsOne': 'Single-unit DPS (vs lab):',
    'hw.dpsAll': 'Total DPS of all {n} units:',
    'hw.raidDps': '⚔️ Expected raid DPS:',
    'hw.raidDpsBreak': 'Mining bot {mining} + hardware {hardware} (perf score {perf})',

    'inv.title': '📦 My equipment warehouse (Inventory)',
    'inv.count': '{n} stored',
    'inv.empty': 'No spare equipment in the warehouse. Buy the tier you want from the shop above.',
    'inv.cpuSpec': 'Compatible: {mfr} / {ddr}',
    'inv.gpuSpec': 'Damage multiplier: x{mult}',
    'inv.ramSpec': 'Clock: {mhz}MHz / {gb}GB / {ddr}',
    'inv.coolerSpec': 'Cooling: {cap}W / defense: +{def}',
    'inv.storageSpec': 'Speed: {kind}',
    'inv.ssdFast': 'SSD 4X faster',
    'inv.hddBase': 'HDD base',
    'inv.level': '+{lv}',
    'inv.prob': '[chance: {p}%] ',
    'inv.explodeWarn': '⚠️destroyed on failure',
    'inv.max': 'Max tier',
    'inv.upgrade': 'Upgrade',
    'inv.equip': 'Equip',

    'work.title': '💼 Work · available {done}/{total}',
    'work.tooltip': '{sec}s per kill with 1 unit · RAM {gb}GB+ · {income} per kill per unit',
    'work.perKillCoin': '+{income} per kill·unit',
    'work.perKillActual': ' (actual {income})',
    'work.perKillMineral': '+{income} won per kill·unit',
    'work.perKillMineralActual': ' (actual {income} won)',
    'work.killLine': '{sec}s per unit · RAM {gb}GB',
    'work.noClear': 'Cannot clear',
    'work.deploy': 'Deployed',
    'work.unitDown': 'One fewer work unit',
    'work.unitUp': 'One more work unit',
    'work.unitsN': '{n} units',
    'work.ofN': '/ {n} units',
    'work.slashUnits': '/{n} units',
    'work.auto': 'Auto optimum',
    'work.manual': 'Manual',
    'work.perKill': 'Per kill ',
    'work.perUnit': ' per unit',
    'work.perSec': ' · about ',
    'work.partyOnStop': ' · party ON — work stopped',
    'work.engaged': ' · engaged ',
    'work.respawning': ' · {n} respawning',
    'work.reasonPrefix': ' · {reason}',
    'work.noClearSuffix': ' · cannot clear',
    'work.groundTitle': 'Work grounds',
    'work.groundDesc1': 'Work and Gaming run ',
    'work.groundDescBold': 'at the same time',
    'work.groundDesc2': ' · every task is listed as in the original map, but only the ',
    'work.groundDescBold2': 'actually clearable',
    'work.groundDesc3': ' ones can be picked (GPU, attack speed and building HP together · within {sec}s for one unit)',
    'work.statLine': 'GPU attack {atk} · RAM {frames}f ({ms}ms per hit) · speed {speed}×',
    'work.statLine2': ' · work buildings do not counterattack · HP{hp}{shield}{defense} → {hits} hits / {sec}s per kill',
    'work.statShield': '+shield{n}',
    'work.statDefense': ' def{n}',
    'work.statLine3': ' · game monster attack {atk} HP{hp}{shield} → {hits} hits / {sec}s per kill',
    'work.statLine4': ' · hunting unit HP{hp}+shield{shield} def{def} · redeployed automatically {sec}s after dying to a counterattack',

    'game.title': '🎮 Game hunting',
    'game.hunting': 'Hunting: ',
    'game.unlocked': ' · unlocked {n}/{total}',
    'game.perKill': ' · +{income} per kill·unit',
    'game.perKillActual': ' (actual {income})',
    'game.hunt': ' · hunting',
    'game.deploy': 'Deployed ',
    'game.deployInfo': '(RAM left {free}GB / CPU {per}GB per unit · cores {cores} · GPU ref {gpu}GB per unit)',
    'game.partyOnStop': ' · party ON — hunting stopped',
    'game.engaged': ' · engaged ',
    'game.respawning': ' · {n} respawning',
    'game.perKill2': ' · per kill ',
    'game.perUnit': ' per unit',
    'game.perSec': ' · about ',
    'game.zeroWon': '0 won',
    'game.download': 'Download: ',
    'game.downloadInfo': ' · +{gb}GB (free {free}GB / used {used}GB / {total}GB) · {cost}',
    'game.downloadBtn': 'Download the game',
    'game.downloading': 'Downloading…',
    'game.allDownloaded': 'All games downloaded',

    'party.title': 'Party hunting grounds',
    'party.desc': 'Won + SCA coins · work income stops while the party is ON · perf {perf} · rebirth stat {rebirth} · mining power {mining} (tick speed and survival)',
    'party.desc2': '1-x = mineral focused (no counterattack) · 2-x = SCA focused (the boss hits back, so mining power decides survival). Going to a higher tier without mining power tanks your real income.',
    'party.on': 'Party ON',
    'party.off': 'Party OFF',
    'party.optMineral': '💎 Best for minerals',
    'party.optSca': '🪙 Best for SCA',
    'party.tierTip': 'Perf {perf}+ · rebirth {rebirth}+ · mining {mining}+{counter}',
    'party.tierTipCounter': ' · boss counterattacks (survival {up}%)',
    'party.tierTipNoCounter': ' · no counterattack',
    'party.tierIncome': '+{mineral} won / +{sca} SCA',
    'party.uptime': 'Survival {up}%',
    'party.selected': 'Selected: {tier} · every {sec}s +{mineral} won +{sca}C{uptime}',
    'party.selectedUptime': ' · survival {up}%',
    'party.elapsed': '⏱ Elapsed {elapsed} · next tick in {next}s',
    'party.elapsedMin': '{m}m {s}s',
    'party.elapsedSec': '{s}s',

    'auto.live': 'AUTO live',
    'auto.feedEmpty': 'Buy, upgrade and income events show up here.',
    'auto.on': 'AUTO ON',
    'auto.off': 'AUTO OFF',
    'auto.targetDown': 'Lower the auto target tier',
    'auto.targetUp': 'Raise the auto target tier',
    'auto.targetLine': '+{cur} → +{goal}',
    'auto.idleSummary': '⏳ Idle earnings · {parts}',
    'auto.sumIncome': 'income +{amount}',
    'auto.sumUpgrade': '{n} upgrades',
    'auto.sumBuy': '{n} bought',
    'auto.sumExplode': '{n} destroyed',

    'shop.title': 'Parts assembly and upgrade shop',
    'shop.partsTitle': '📦 Parts shop — buyable tiers per part (minerals)',
    'shop.partsDesc': 'Spreadsheet price = minerals (won) 1:1 (C = N×10M). Buy directly: Intel CPU +1/4/7/10/11, AMD +1/3, GPU +1/3/5/7, RAM +1/5/10, cooler and drive +1, motherboards (DDR and socket shown). Pick a tier with ◀▶ · AUTO buys the highest buyable tier below the goal, then upgrades to the goal. RAM slots 2 and 4 buyable · selling refunds 50%.',
    'shop.rebirthPreview': 'On rebirth: SCA +',
    'shop.rebirthPreview2': ' · stat +{gain} (total {total}) · {tier}',
    'shop.rebirthBtn': '✨ GPU REBIRTH',
    'shop.ramSlots': '⚡ RAM slots (one stick = the same effect on every slot)',
    'shop.ramSlotsNow': 'Now ',
    'shop.ramSlotsN': '{n} slots',
    'shop.ramSlotsCap': ' · effective capacity ',
    'shop.ramSlotOwned': '✓ {n} slots',
    'shop.ramSlotBuy': '{n} slots · {cost}',
    'shop.ramSlotNote': '1 slot free · 2 slots 5,000 won · 4 slots 500,000 won',
    'shop.prevLevel': 'Previous tier',
    'shop.nextLevel': 'Next tier',
    'shop.levelN': '+{n}',
    'shop.buy': 'Buy {cost}',
    'shop.prevBoard': 'Previous motherboard',
    'shop.nextBoard': 'Next motherboard',
    'shop.boardLine': '{ddr} · shield +{shield}',
    'shop.notBuyable': '{type} +{level} cannot be bought directly in the shop. Buyable: {list}. Other tiers have to be reached by upgrading.',
    'shop.buyableNone': 'none',
    'shop.needMinerals': 'Not enough minerals (need {cost} · have {have})',
    'shop.needMineralsShort': 'Not enough minerals (need {cost})',
    'shop.ramSlotToast': '{n} RAM slots',

    'rebirth.needGpu10': 'GPU +10 required',
    'rebirth.downloading': 'You cannot rebirth while a game is downloading. (v1.0.6)',
    'rebirth.confirm': 'Rebirth resets your parts and minerals. SCA coins, the SCA center and your rebirth stat stay.',
    'rebirth.needLogin': 'Sign in to receive the rebirth SCA payout.',
    'rebirth.fail': 'The rebirth SCA payout failed.',
    'rebirth.done': 'Rebirth complete · SCA +{sca}',

    'res.title': 'Restoration control terminal',
    'res.rebirthLine': 'Rebirths {count} · stat {stat} · income x{mult} · speed {frames}f',
    'res.logout': 'Sign out',
    'res.minerals': 'MINERALS (WON)',
    'res.won': 'won',
    'log.title': 'Income log',
    'log.system1': '💬 [SYSTEM] Cybernetic battle matrix online.',
    'log.system2': '💬 [SYSTEM] Waiting on the socket protocol for the 100-floor raid.',
    'log.party': '[{time}] 👥 Party :: {tier} +{mineral} won +{sca}C',
    'log.workHunt': '[{time}] 💼Work {units} units kill +{workIncome} each · 🎮{game} {huntUnits} units kill +{huntIncome} each · total ~{total} per second',
    'log.noGame': 'no game',
    'log.buy': 'Bought {name} +{level}',
    'log.sell': 'Sold +{amount}',
    'log.upgraded': '{label} +{level}',
    'log.exploded': '{label} +{level} destroyed',
    'log.equipped': 'Equipped {label} +{level}',
    'log.partyIncome': '💎 [PARTY] {tier} party, {ticks} ticks: +{mineral} minerals',
    'log.vaultFull': '⚠️ [RESEARCH] The part vault is full (30) — the dropped part was discarded.',
    'log.labDrop': '🎉 [RESEARCH] Lv.{lv} lab destroyed — got an unknown {gen} part! (holding {count})',
    'log.labNoDrop': '⚙️ [RESEARCH] Lv.{lv} lab destroyed, but no part dropped.',
    'log.ocDdr4': '🎉 [RESEARCH] DDR4 overclock succeeded! (chance {pct}%) A DDR4 +9 stick now runs at OC-4000 automatically.',
    'log.ocDdr5': '🎉 [RESEARCH] DDR5-{mhz} overclock succeeded! (chance {pct}%) A DDR5 +13 stick now runs at that OC spec automatically.',
    'log.ocFail': '❌ [RESEARCH] Overclock failed (chance {pct}%). The unknown part overloaded and exploded.',
    'log.labAssign': '⚔️ [RESEARCH] Assigned 1 work/hunt unit to attack the Overclock Lab building.',
    'log.labRecall': '↩️ [RESEARCH] Recalled the lab attack unit. (work/hunt pool +1)',
    'fx.upgradeOk': 'Upgrade success!',
    'fx.exploded': '💥 Destroyed!',

    'unit.1': 'Terran Marine',
    'unit.2': 'Terran Ghost',
    'unit.3': 'Protoss Dragoon',
    'unit.4': 'Zerg Hydralisk',
    'unit.5': 'Terran hero Siege Tank',
    'unit.6': 'Protoss High Templar / Archon',
    'unit.7': 'Protoss Carrier',
    'unit.8': 'Terran Battlecruiser',
    'unit.9': 'Protoss legend Zeratul',
    'unit.10': 'Terran flagship Hyperion',
    'unit.11': 'Protoss Mothership',
    'unit.12': 'Zerg Overmind',
    'unit.13': 'Amon, lord of the Void',
    'unit.14': "Xel'Naga, the transcendent",
    'unit.unknown': 'Unknown dimensional unit',
    'boss.10': 'Guarder (berserk Zealot hero)',
    'boss.20': 'Torrasque (Ultralisk fusion beast)',
    'boss.30': 'Matriarch (Mutalisk brood hero)',
    'boss.40': 'Unclean One (undying Defiler boss)',
    'boss.50': 'General Duke (Kron Battlecruiser)',
    'boss.60': 'Fenix (Dragoon colossus hero)',
    'boss.70': 'Zeratul (wanderer of the Void)',
    'boss.80': 'Infested Kerrigan (Queen of Blades)',
    'boss.90': 'The Overmind (giant bio core)',
    'boss.100': 'Amon (dark lord of the Void)',

    'auth.syncing': '⏳ Syncing your progress...',
    'auth.appTitle': 'PC Upgrade',
    'auth.loginDesc': 'Sign in to load your progress',
    'auth.registerDesc': 'Create an account to save your progress',
    'auth.nickname': 'Nickname',
    'auth.nicknamePh': '2–50 characters',
    'auth.password': 'Password',
    'auth.passwordPh': 'At least 4 characters',
    'auth.consent1': 'I am 14 or older and agree to the ',
    'auth.terms': 'Terms of Service',
    'auth.consentAnd': ' and the ',
    'auth.privacy': 'Privacy Policy',
    'auth.consent2': '.',
    'auth.loading': 'Working...',
    'auth.login': 'Sign in',
    'auth.register': 'Sign up',
    'auth.noAccount': "Don't have an account? ",
    'auth.hasAccount': 'Already have an account? ',
    'auth.myAccount': 'My account',
    'auth.syncTimeout': 'Syncing with the server timed out. Please sign in again.',
    'auth.expired': 'Your session expired. Please sign in again.',
    'auth.loadFail': 'Could not load your progress.',
    'auth.genericError': 'Something went wrong.',

    // ── 데이터 계층(originalMapData.js · autoSimulator.js) ──
    // ko 는 두지 않는다 — 원문 한국어가 그 파일들에 있고, 다리가 없으면 그게 그대로 나온다.
    'omg.cooler.air.1': 'Intel stock cooler (Choco Pie)',
    'omg.cooler.air.2': 'Copper heatsink air cooler',
    'omg.cooler.air.3': 'Budget single-fan tower',
    'omg.cooler.air.4': 'Dual-tower flagship (NH-D15)',
    'omg.cooler.air.5': 'Dual-tower RGB air cooler',
    'omg.cooler.water.1': '120mm single-radiator AIO',
    'omg.cooler.water.2': '240mm dual-radiator AIO',
    'omg.cooler.water.3': '360mm triple-radiator RGB AIO',
    'omg.cooler.water.4': 'Custom open loop',
    'omg.cooler.water.5': 'External MORA radiator',
    'omg.mb.0': 'Intel P55',
    'omg.mb.1': 'Intel B75',
    'omg.mb.2': 'Intel H87',
    'omg.mb.3': 'Intel H270',
    'omg.mb.4': 'Intel H370',
    'omg.mb.5': 'AMD A320',
    'omg.mb.6': 'Intel Z390',
    'omg.mb.7': 'Intel H570',
    'omg.mb.8': 'AMD B550',
    'omg.mb.9': 'Intel Z590',
    'omg.mb.10': 'AMD X570',
    'omg.mb.11': 'Intel H770',
    'omg.mb.12': 'Intel Z790',
    'omg.mb.13': 'AMD X670E',
    'omg.work.0': 'Simple document work',
    'omg.work.1': 'Making slide decks',
    'omg.work.2': 'Photoshop',
    'omg.work.3': 'Simple video editing',
    'omg.work.4': '2D graphics work',
    'omg.work.5': 'Light AI work',
    'omg.work.6': '3D graphics work',
    'omg.work.7': 'Professional editing',
    'omg.work.8': 'Heavy AI work',
    'omg.work.9': 'Ultra-heavy graphics work',
    'omg.work.10': 'Large-scale rendering',
    'omg.game.0': 'Uncharted Waters',
    'omg.game.1': 'SimCity 2000',
    'omg.game.2': 'StarCraft II',
    'omg.game.3': 'Dark Souls',
    'omg.game.4': 'Cyberpunk 2077',
    'omg.game.5': 'League of Legends',
    'omg.game.6': 'FIFA Online',
    'omg.game.7': 'PUBG',
    'omg.party.0': 'Party 1-1',
    'omg.party.1': 'Party 1-2',
    'omg.party.2': 'Party 1-3',
    'omg.party.3': 'Party 1-4',
    'omg.party.4': 'Party 1-5',
    'omg.party.5': 'Party 1-6',
    'omg.party.6': 'Party 2-1',
    'omg.party.7': 'Party 2-2',
    'omg.party.8': 'Party 2-3',
    'omg.gpuGrade.0': 'Entry',
    'omg.gpuGrade.1': 'Mainstream',
    'omg.gpuGrade.2': 'Performance',
    'omg.gpuGrade.3': 'High-end',
    'omg.sca.rebirthMineralMax200': 'Rebirth minerals +200',
    'omg.sca.rebirthMineral500': 'Rebirth starting minerals +500',
    'omg.sca.rebirthMineralMax2000': 'Rebirth minerals +2,000',
    'omg.sca.rebirthMineralMax7500': 'Rebirth minerals +7,500',
    'omg.sca.huntIncome1': 'Hunting income +1%',
    'omg.sca.gameSpeed1': 'Game speed +1 frame',
    'omg.sca.upgradeProb01': 'Upgrade chance +0.1%',
    'omg.sca.downloadSpeed10': 'Download speed +10%',
    'omg.sca.gpuGradeUp': 'GPU grade up',
    'omg.sca.miningAmplifierUnlock': 'Build the mining amplifier',
    'omg.sca.miningAmplifier': 'Mining amplifier attack +500',
    'omg.sca.miningAmplifierSpeed': 'Mining amplifier attack speed',
    'omg.sca.gpuGradeMax': 'GPU grade (high-end reached)',
    'omg.sca.gpuGradeFromTo': 'GPU grade: {from} → {to}',
    'omg.sca.miningBuilt': 'Mining amplifier (built)',
    'omg.sca.miningPowerNow': 'Mining attack (now {power})',
    'omg.sca.miningSpeedNow': 'Mining amplifier speed ({frames}f · ×{mult})',
    'omg.sca.hintMiningActive': 'Raid mining bot active',
    'omg.sca.hintMiningUnlock': 'Endgame content · unlocks the raid mining bot',
    'omg.sca.hintNeedBuild': 'Buyable after it is built',
    'omg.sca.hintMiningPower': '+{add} mining attack · adds your mining power to raid boss DPS',
    'omg.sca.hintSpeedMax': 'Top speed {frames}f',
    'omg.sca.hintSpeedNext': 'Attack speed −{frames}f (next {next}f)',
    'omg.gpuLevel': 'GPU +{level}',
    'omg.ramSlot.owned': 'You already own that slot count, or it cannot be bought.',
    'omg.ramSlot.needMinerals': 'Not enough minerals (need {cost} · have {have})',
    'omg.party.notFound': 'That party tier does not exist.',
    'omg.party.needPerf': 'Needs perf score {need}+ (now {cur})',
    'omg.party.needRebirth': 'Needs rebirth stat {need}+ (now {cur})',
    'omg.party.needMining': 'Needs mining power {need}+ (now {cur})',
    'omg.work.needRam': 'Needs {need}GB RAM (now {cur}GB)',
    'omg.work.noCapacity': 'Cannot deploy work units ({per}GB each · {cores} cores)',
    'omg.work.needGpu': 'Needs GPU +{need} (now +{cur})',
    'omg.work.needRamLevel': 'Needs RAM +{need} (now +{cur})',
    'omg.work.needCores': 'Needs {need} CPU cores (now {cur})',
    'omg.work.needShield': 'Needs unit shield {need} (now {cur}) — swap the motherboard',
    'omg.work.noAttack': 'Not enough attack — cannot destroy the building',
    'omg.work.tooSlow': '{sec}s per kill with 1 unit — upgrade GPU and attack speed (target {target}s)',
    'omg.dl.inProgress': 'A download is already running.',
    'omg.dl.noGames': 'There is no game left to download.',
    'omg.dl.needPrev': 'Download the previous game before the next one.',
    'omg.dl.needSpace': 'Not enough storage (this game needs {need}GB · free {free}GB / used {used}GB / total {total}GB)',
    'omg.dl.needMinerals': 'Not enough money to download the game. (need {cost})',
    'auto.buy': '[AUTO] {label} {name} +{level} bought (−{cost})',
    'auto.upgradeOk': '[AUTO] {label} +{from} → +{to} succeeded',
    'auto.exploded': '[AUTO] {label} +{level} destroyed',
    'auto.noBuyable': '⚠️ [AUTO] {label}: no directly buyable tier → stopped',
    'auto.goalReached': '🎉 [AUTO] {label} reached the goal of +{goal}',
    'auto.statusOff': 'AUTO off',
    'auto.statusManual': 'Manual upgrade in progress — AUTO paused',
    'auto.statusRunning': 'AUTO running',
    'auto.statusWaiting': 'Not enough minerals — waiting on income',
    'auto.statusIdle': 'AUTO idle (goal reached or nothing to do)',
    'auto.wipeBoth': '⚠️ {work} work units and {hunt} hunting units wiped → redeployed automatically in {sec}s',
    'auto.wipeWork': '⚠️ {work} work units wiped → redeployed automatically in {sec}s',
    'auto.wipeHunt': '⚠️ {hunt} hunting units wiped → redeployed automatically in {sec}s',
  },
};

function detect() {
  try {
    const q = new URLSearchParams(window.location.search).get('lang');
    if (q && LANGS.includes(q)) return q;
  } catch {
    /* URL 을 못 읽으면 다음 단계로 */
  }
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved && LANGS.includes(saved)) return saved;
  } catch {
    /* 저장소가 막힌 브라우저 */
  }
  const nav = (typeof navigator !== 'undefined' && navigator.language) || '';
  if (!nav) return SOURCE;
  return nav.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

let lang = detect();

export function getLang() {
  return lang;
}

/**
 * 로그·피드처럼 **나중에 다시 그려지는 문장**의 금액 자리에 쓴다.
 * 번역 결과(1.2만원)를 인자에 박아 두면 언어를 바꿔도 그 자리만 옛 언어로 남는다.
 * 숫자만 넣어 두고 그릴 때 OMG.formatMineral 로 옮긴다(그쪽도 언어를 본다).
 */
export function mineral(n) {
  return { $k: 'mineral', n };
}

/**
 * 인자 자리에 들어가는 라벨도 옮겨야 할 때 쓴다(autoSimulator.js 의 LK).
 * fallback 은 데이터 표의 한국어 원문 — omg.* 키는 사전에 en 만 있어서 필요하다.
 */
export function tk(key, fallback) {
  return { $k: 'key', key, fallback };
}

function resolveVar(v) {
  if (v && typeof v === 'object') {
    if (v.$k === 'mineral') {
      const OMG = typeof window !== 'undefined' && window.OriginalMapGame;
      return OMG ? OMG.formatMineral(v.n) : String(v.n);
    }
    if (v.$k === 'key') return t(v.key, null, v.fallback);
  }
  return v;
}

function fill(s, vars) {
  if (!vars) return s;
  let out = s;
  for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(resolveVar(v)));
  return out;
}

/**
 * t('work.units', { n: 3 }) 처럼 {이름} 자리를 채운다.
 * 사전에 키가 없으면 ko(원문)로, 그것도 없으면 fallback(전역 스크립트가 넘긴 한국어
 * 원문)으로, 마지막엔 키 자체로 되돌아간다.
 */
export function t(key, vars, fallback) {
  const s = DICT[lang]?.[key] ?? DICT[SOURCE][key] ?? fallback ?? key;
  return fill(s, vars);
}

/** 사전에 없으면 넘긴 값을 그대로 쓴다 — 데이터 표에 한국어 원본이 있는 이름들에 쓴다. */
export function tOr(key, fallback, vars) {
  const s = DICT[lang]?.[key] ?? DICT[SOURCE][key];
  if (s === undefined) return fallback;
  return fill(s, vars);
}

/**
 * 이 게임 백엔드(src/*.ts)가 보낸 오류 문구를 현재 언어로 옮긴다.
 *
 * 백엔드는 한국어 문장을 그대로 내려주고 화면은 그걸 `err.message` 로 받아 뿌리므로,
 * 영어로 보는 사람에게 한국어가 나갔다. 백엔드에 언어 협상을 넣는 대신 받는 쪽에서
 * 문장으로 맞춘다 — 이 서버는 이 앱만 쓰므로 표가 갈라질 일이 없다.
 *
 * **통합 인증(auth) 문구는 여기 두지 않는다.** auth 가 `?lang=` 을 보고 직접 그 언어로
 * 내려준다(elcherlab-auth 의 src/messages.js). 예전에는 앱마다 auth 표를 한 벌씩 들고
 * 있었는데(다섯 벌), 사업자는 하나인데 표가 다섯이라 문구를 고칠 때마다 어긋났다.
 *
 * 문장이 키다. 백엔드 문구를 고치면 여기도 같이 고쳐야 하고, 없는 문장은 원문 그대로
 * 나간다(비어 있는 화면보다는 낫다).
 */
const SERVER_ERRORS_EN = {
  // ── 이 게임의 백엔드(src/*.ts) ──
  'GPU 10강 이상이어야 환생할 수 있습니다.': 'Your GPU must be +10 or higher to rebirth.',
  'SCA 상점 구매 처리 중 오류가 발생했습니다.': 'Something went wrong with the SCA shop purchase.',
  '게임 진행도를 찾을 수 없습니다.': 'Could not find your saved progress.',
  '계정 초기화 중 오류가 발생했습니다.': 'Something went wrong while resetting your account.',
  '계정이 초기화되었습니다.': 'Your account has been reset.',
  '구매가 완료되었습니다.': 'Purchase complete.',
  '데이터베이스에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.':
    'Cannot reach the database. Please try again in a moment.',
  '레이드 진행도를 불러오지 못했습니다.': 'Could not load your raid progress.',
  '보상이 정상적으로 지급되었습니다.': 'Your reward has been paid out.',
  '삭제 중 오류가 발생했습니다.': 'Something went wrong while deleting.',
  '서버 내부 오류가 발생하여 보상 처리에 실패했습니다.':
    'An internal server error stopped the reward from being paid out.',
  '아직 다음 파티 SCA 틱 시각이 되지 않았습니다.': 'The next party SCA tick is not due yet.',
  '올바르지 않은 층수입니다. 10층 단위(10~100)로만 클리어할 수 있습니다.':
    'That floor is not valid. Floors clear in steps of 10 (10-100).',
  '올바르지 않은 파티 티어입니다.': 'That party tier is not valid.',
  '이미 해당 층수 이하의 모든 마일스톤 보상을 수령하셨습니다.':
    'You have already claimed every milestone reward up to that floor.',
  '조회 중 오류가 발생했습니다.': 'Something went wrong while loading.',
  '파티 SCA 지급 중 오류가 발생했습니다.': 'Something went wrong while paying out party SCA.',
  '파티 SCA가 지급되었습니다.': 'Party SCA has been paid out.',
  '파티 사냥 타이머가 시작되었습니다.': 'The party hunt timer has started.',
  '파티 타이머 시작 중 오류가 발생했습니다.': 'Something went wrong while starting the party timer.',
  '파티 티어 해금 조건을 충족하지 않습니다.': 'You do not meet the unlock conditions for that party tier.',
  '환생 SCA 지급 중 오류가 발생했습니다.': 'Something went wrong while paying out rebirth SCA.',
  '환생 SCA가 지급되었습니다.': 'Rebirth SCA has been paid out.',
  '로그인이 필요합니다.': 'You need to sign in.',
  '방 입장 도중 오류가 발생했습니다.': 'Something went wrong while joining the room.',
  '지급할 파티 틱이 없습니다.': 'There are no party ticks to pay out.',
  '진행도 저장 중 오류가 발생했습니다.': 'Something went wrong while saving your progress.',
  '진행도 조회 중 오류가 발생했습니다.': 'Something went wrong while loading your progress.',
  '존재하지 않는 상점 항목입니다.': 'That shop item does not exist.',
  // 아래 넷은 요청이 잘못 만들어졌을 때만 나온다(정상 조작으로는 닿지 않는다).
  // 그래도 화면에 뜨는 경로라 비워 두지 않는다.
  'userId 가 필요합니다.': 'A userId is required.',
  '상점 항목 ID(itemId)가 필요합니다.': 'A shop item id (itemId) is required.',
  '환생 부품 정보(parts)가 필요합니다.': 'Rebirth part info (parts) is required.',
  '달성한 층수(currentFloor)는 숫자 타입으로 입력해야 합니다.':
    'The floor reached (currentFloor) must be a number.',
};

/** 서버 문구를 현재 언어로. 한국어이거나 모르는 문장이면 원문 그대로. */
export function translateServerError(msg) {
  if (lang === 'ko' || !msg) return msg;
  return SERVER_ERRORS_EN[msg] || msg;
}

const listeners = new Set();

export function setLang(next) {
  if (!LANGS.includes(next) || next === lang) return;
  lang = next;
  try {
    localStorage.setItem(STORE_KEY, lang);
  } catch {
    /* 저장소가 막혀 있으면 이번 방문에만 적용된다 */
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
    document.title = t('meta.title');
  }
  listeners.forEach((fn) => fn(lang));
}

export function toggleLang() {
  setLang(lang === 'ko' ? 'en' : 'ko');
}

/**
 * 언어가 바뀌면 다시 그린다.
 * 최상위 컴포넌트(App·AuthGate)에서만 부르면 트리 전체가 다시 그려진다 — 진행 중인
 * 게임을 잃지 않도록 새로고침은 하지 않는다. Canvas 씬은 매 프레임 t() 를 부르므로
 * 따로 구독하지 않아도 다음 프레임에 바뀐다.
 */
export function useLang() {
  const [cur, setCur] = React.useState(lang);
  React.useEffect(() => {
    listeners.add(setCur);
    return () => listeners.delete(setCur);
  }, []);
  return cur;
}

/**
 * 전역 스크립트(originalMapData.js · autoSimulator.js)용 다리.
 * 그쪽은 import 를 못 하므로 호출 시점에 window 에서 이걸 찾는다. 서버(vm)에는
 * window 가 없어 다리도 없고, 그래서 원문 한국어가 그대로 남는다.
 */
if (typeof window !== 'undefined') {
  window.PcI18n = {
    t,
    lang: getLang,
  };
}

if (typeof document !== 'undefined') {
  document.documentElement.lang = lang;
}
