# CLAUDE.md

'컴퓨터 강화하기' 스타크래프트 유즈맵(`.scx`)의 웹 복원판. 부품을 강화·조립해
유닛으로 작업/사냥하고, 레이드·환생·SCA 상점으로 성장하는 방치형 게임.

## 아키텍처 (두 세계로 나뉨)

**프론트엔드 — `public/index.html` (단일 파일, 빌드 없음)**
- React 18 UMD + **Babel standalone 인-브라우저 변환** + Tailwind CDN. 별도 번들/빌드 단계가 **없다** — `index.html`을 직접 편집하면 새로고침으로 바로 반영.
- JSX 전부가 `<script type="text/babel">` 한 블록 안에 있음(4,600줄+). **구문 오류가 나면 블록 전체가 컴파일 실패**해 앱이 아예 안 뜬다(부분 실패 없음) — 그래서 로드만 돼도 "구문 OK" 신호가 된다. 편집 후 `npm run jsxcheck`(TS 파서로 babel 블록 구문만 검사)를 1차 게이트로 돌리고, 최종은 실제 로드로 확인.
- 훅은 구조분해로 사용: `const { useState, useEffect, useMemo, useRef } = React;` (파일 상단).
- **God Component 분해**: `function App`은 여전히 크지만, 렌더 트리는 최상위 **프레젠테이션 컴포넌트**(모달 4종·ResourceBar·HardwareMonitor·IncomeLog·InventoryVault·WorkPanel·GamingPanel·PartyHuntingGround·RamSlotShop·ComponentBuyGrid·AutoBuyToggleGrid·AutoStatusPanel 등)와 **커스텀 훅**(`useRaidSocket` — 레이드 소켓 상태·이벤트·핸들러)으로 분리돼 있다. 원칙: **값·핸들러는 props로 주입, 게임 로직/상태는 App에 잔류.** 함정 — `getCpuName`/`getSummonUnit`/`getUpgradeProbability` 등 헬퍼는 App 클로저 함수라(전역 아님) 컴포넌트로 추출할 때 **props로 넘겨야 한다**(안 넘기면 렌더 시 ReferenceError로 앱 전체가 언마운트).
- **게임 로직/밸런스는 `public/originalMapData.js` = `window.OriginalMapGame` (코드에선 `OMG`)** 전역에 있음. 부품 스펙·수입·공식이 여기 다 들어있고, UI는 이 값을 읽어 그린다.
- **2D 시각 레이어**: `HuntScene`(사냥)·`WorkScene`(작업) Canvas 2D 씬. 상태값을 읽어 그리기만 하고 게임 로직은 건드리지 않는 게 원칙.

**백엔드 — `src/*.ts` (Express + socket.io + Postgres, `tsc` 빌드)**
- `server.ts`가 `public/`를 정적 서빙 + `/api/auth/*`, `/api/sca/*`, `/api/raid/*`, `/api/state` + socket.io.
- 인증: `authService.ts` — scrypt `salt:hash` 를 Postgres `users`에 저장. Bearer 토큰 → `auth_sessions`.
- **서버 권위 밸런스 시뮬**: `hardwareSimulator.ts`, `raidSimulator.ts`, `rewardService.ts`, `scaIncomeService.ts`. `HardwareSimulator`는 `public/originalMapData.js`를 `eval`로 로드해 프론트와 같은 OMG 공식을 공유한다.
- **순수 계산은 별도 모듈로 분리돼 DB 없이 단위 테스트됨**: 레이드 전투는 `raidCombat.ts`(보스 HP·DPS·오버킬 다층 클리어), 지급 산식은 `rewardService.computeRaidClaimCoins`, 채굴증폭기(채굴력·공속)는 `scaUpgrades.ts`. `raidSimulator`의 `RaidRoomState`는 얇은 파사드로 이 순수 로직을 위임한다.
- DB: `schema.sql`(전부 `IF NOT EXISTS`/`OR REPLACE`라 반복 적용 안전). 기본 접속값은 `db.ts`에 하드코딩된 `localhost:5432 / postgres / postgres / usemap_restore` — 로컬은 `.env` 없이도 동작.

## 로컬 실행 / 검증

```
npm run dev:local   # Docker Postgres 기동 + 스키마 + 시드계정(test/test) + 서버  → localhost:3000
npm run db:up       # DB만 기동+시드 (서버는 npm run dev 로)
npm run db:down     # DB 컨테이너 삭제 (데이터 볼륨은 유지)
npm run dev         # 서버만 (DB가 이미 떠 있어야 함)
```
- `dev:local`은 **Docker Desktop 실행 중**이어야 함. 로그인은 `test` / `test`.
- 프론트(index.html)만 볼 땐 백엔드가 필요하니, UI/게임 화면 확인은 위 로컬 스택으로.

## 테스트

```
npm test                    # hardware + upgradeProb + balance 스냅샷 + raid 보상표 드리프트
                            #  + 순수 단위(raidCombat·scaUpgrades·rewardMath) (+ DB 설정 시 reward E2E)
npm run test:balance        # 밸런스 회귀: 대표 부품 조합 계산값을 스냅샷과 비교
npm run test:balance:update # 밸런스를 의도적으로 바꿨을 때 스냅샷 갱신 (diff 검토 후 함께 커밋)
npm run jsxcheck            # index.html <script type="text/babel"> 블록 구문 게이트(TS 파서)
```
- 밸런스는 부품 간 상호의존이 커서 조용히 드리프트하기 쉽다. **밸런스 로직(`originalMapData.js`/`hardwareSimulator` 등)을 건드리면 `npm run test:balance`로 의도치 않은 변화가 없는지 확인**하고, 의도한 변경이면 스냅샷을 갱신해 커밋.
- 순수 로직(`raidCombat`/`scaUpgrades`/`computeRaidClaimCoins`)은 DB 불필요·결정론적이라 `npm test`에서 항상 실행된다. 해당 산식을 바꾸면 대응 테스트(`testRaidCombat`/`testScaUpgrades`/`testRewardMath`)도 함께 갱신.

## 배포

- **`main`에 push → self-hosted 러너(Oracle Cloud ARM, `web-game-server`)가 자동 배포** (`.github/workflows/deploy.yml`): `git reset --hard origin/main` → `npm run build` → `systemctl restart`. 서비스: <http://computer-upgrade-web.duckdns.org/>
- **주의: 러너가 offline이면 배포가 조용히 `queued`로 멈춘다**(실패 알림 없음). 배포가 안 될 땐 `npm run health`로 러너/큐 상태부터 확인. `.github/workflows/runner-health.yml`이 30분마다 감지해 이슈를 연다.
- 러너 복구: 인스턴스에서 `sudo systemctl start actions.runner.CyCle03-computer-upgrade-web.web-game-server.service`.

## 관례 / 함정

- 커밋 메시지·주석은 **한국어**, `feat:`/`fix:`/`docs:`/`ci:` 접두.
- **프론트는 타입체크가 없다**(Babel 인-브라우저) — index.html 편집 후 `npm run jsxcheck`(scripts/jsxcheck.js)로 구문 게이트를 먼저 통과시키고, 최종은 실제 로드로 확인.
- `StorageType`은 백엔드 타입상 `'HDD' | 'SSD'`만 존재(‘NVMe’는 프론트 표기용 텍스트). 서버 부품 객체에 `'NVMe'` 쓰면 컴파일 에러.
- `tsconfig`는 `src/**/*`만 빌드 → `scripts/*.ts`는 ts-node로만 실행(빌드에 안 들어감).
