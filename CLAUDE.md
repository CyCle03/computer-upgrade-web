# CLAUDE.md

'컴퓨터 강화하기' 스타크래프트 유즈맵(`.scx`)의 웹 복원판. 부품을 강화·조립해
유닛으로 작업/사냥하고, 레이드·환생·SCA 상점으로 성장하는 방치형 게임.

## 아키텍처 (두 세계로 나뉨)

**프론트엔드 — `frontend/src/app.jsx` (빌드 타임 번들)**
- React 18(npm) + **esbuild 번들** + **빌드 타임 Tailwind**. 예전엔 CDN에서 React UMD·Babel standalone·Tailwind를 받아 브라우저에서 JSX를 변환했지만, 그 구조는 CSP에 `'unsafe-eval'`(Babel)·`'unsafe-inline'`(Tailwind 런타임 주입)·외부 CDN 허용을 전부 요구해서 걷어냈다. 지금은 `script-src 'self'; style-src 'self'` 로 서빙된다.
- 소스는 `frontend/src/` 셋뿐 — `app.jsx`(UI 전부, 4,400줄+), `styles.css`(Tailwind 지시자 + 커스텀 CSS), `fonts.css`(셀프 호스팅 웹폰트, 생성물). 산출물은 `public/build/{app.js,app.css}`(gitignore, 배포 시 빌드).
- `public/index.html` 은 이제 **껍데기**다 — `#root` 와 스크립트 태그만 있다. 전역 스크립트(`originalMapData.js` → `gameSync.js` → `autoSimulator.js`)가 번들보다 **먼저** 실행돼야 한다(`app.jsx` 최상단에서 `window.OriginalMapGame` 등을 읽음).
- **`app.jsx` 편집 후엔 반드시 `npm run build:frontend`** (또는 `npm run watch:frontend` 상시 실행). 안 돌리면 브라우저에 옛 번들이 그대로 뜬다 — 예전처럼 "저장 후 새로고침"이 아니다.
- 구문 오류가 나면 번들이 아예 안 만들어져 앱이 안 뜬다(부분 실패 없음). esbuild 빌드가 1차 게이트고, `npm run jsxcheck`(TS 파서로 `app.jsx` 구문만 초 단위 검사)는 빌드 없이 훑고 싶을 때 쓰는 보조 도구다.
- 훅은 구조분해로 사용: `const { useState, useEffect, useMemo, useRef } = React;` (파일 상단).
- **God Component 분해**: `function App`은 여전히 크지만, 렌더 트리는 최상위 **프레젠테이션 컴포넌트**(모달 4종·ResourceBar·HardwareMonitor·IncomeLog·InventoryVault·WorkPanel·GamingPanel·PartyHuntingGround·RamSlotShop·ComponentBuyGrid·AutoBuyToggleGrid·AutoStatusPanel 등)와 **커스텀 훅**(`useRaidSocket` — 레이드 소켓 상태·이벤트·핸들러)으로 분리돼 있다. 원칙: **값·핸들러는 props로 주입, 게임 로직/상태는 App에 잔류.** 함정 — `getCpuName`/`getSummonUnit`/`getUpgradeProbability` 등 헬퍼는 App 클로저 함수라(전역 아님) 컴포넌트로 추출할 때 **props로 넘겨야 한다**(안 넘기면 렌더 시 ReferenceError로 앱 전체가 언마운트).
- **Tailwind 함정**: 클래스는 소스를 "텍스트로 훑어" 뽑는다. `${cond ? 'text-emerald-300' : 'text-rose-300'}` 처럼 **완성형 문자열**이면 잡히지만 `text-${color}-300` 처럼 **쪼개 조합하면 못 잡아** 조용히 스타일이 빠진다. 새 클래스는 반드시 완성형 분기로 쓸 것(`tailwind.config.js` 참조).
- **게임 로직/밸런스는 `public/originalMapData.js` = `window.OriginalMapGame` (코드에선 `OMG`)** 전역에 있음. 부품 스펙·수입·공식이 여기 다 들어있고, UI는 이 값을 읽어 그린다.
- **2D 시각 레이어**: `HuntScene`(사냥)·`WorkScene`(작업) Canvas 2D 씬. 상태값을 읽어 그리기만 하고 게임 로직은 건드리지 않는 게 원칙.
- **한국어/영어 전환 — `frontend/src/i18n.js`**
  - **원문은 한국어다.** 유즈맵 복원판이라 부품·작업·유닛 이름이 한국어에서 출발한다. 사전에 키가 없으면 en 이 아니라 **ko 로 되돌아간다**(pet 과 같고, 영어가 원문인 bm·cc 와는 반대).
  - `t(key, vars, fallback)` / `tOr(key, fallback)` / `setLang` / `toggleLang` / `useLang()`. 최상위 컴포넌트(`App`·`AuthGate`)에서 `useLang()` 을 부르면 언어가 바뀔 때 트리 전체가 다시 그려진다 — **새로고침하지 않는다**(진행 중인 게임을 잃는다).
  - **전역 스크립트는 이 모듈을 import 할 수 없다.** `originalMapData.js` 는 서버(`src/omgLoader.ts`)가 vm 으로 같은 파일을 읽어 밸런스 공식을 공유하고, `autoSimulator.js` 도 전역 스크립트다. 그래서 i18n 이 `window.PcI18n` **다리**를 깔고, 그쪽 파일들은 호출 시점에 `tx(key, vars, 한국어원문)` 으로 찾아 쓴다. 다리가 없으면(서버·테스트) 원문 한국어가 그대로 나오므로 서버 동작·밸런스 스냅샷은 영향을 받지 않는다.
  - 그래서 사전의 `omg.*` 키는 **en 만** 둔다. ko 원문은 데이터 표(부품·작업 이름)와 `tx()` 의 fallback 에 이미 있어서, 사전에 복사해 두면 한쪽만 고쳐 어긋난다.
  - **부품·작업 이름을 표에서 번역하지 않는다.** 세이브(메인보드·다운로드 대상)에 그 값이 그대로 들어가므로, 표는 한국어로 두고 **화면에 낼 때만** index/id 로 사전을 찾는다(`workTaskName`·`gameName`·`partyTierName`·`boardName`).
  - **수입 로그·AUTO 피드는 문장이 아니라 `{k, v}` 로 쌓는다.** 언어를 바꾸면 이미 쌓인 줄도 따라 바뀐다. 인자 자리에 번역 결과를 넣지 말고 표식으로 넘길 것 — 금액은 `mineral(n)`, 이름은 `{ $k: 'key', key, fallback }`(autoSimulator 의 `LK()`).
  - 언어 설정은 **localStorage 만** 쓴다(쿠키 금지 — 개인정보처리방침 9.1). 서브도메인 사이는 `?lang=en` 링크로 넘긴다.
  - **이 저장소 백엔드(`src/*.ts`)가 내려준 오류 문구는 `translateServerError()` 를 거쳐 화면에 낸다.** 백엔드는 한국어 문장을 내려주고 화면은 그걸 `err.message`/`alert` 로 그대로 뿌리므로, 두면 영어 화면에 한국어가 나간다. 여섯 자리(레이드 연결·SCA 구매·환생·계정 초기화·진행도 불러오기·로그인)가 이 함수를 거친다. 표(`SERVER_ERRORS_EN`)는 백엔드가 실제로 보내는 문장 **전부**를 덮는다 — 문장을 새로 추가하면 표에도 넣을 것. 없는 문장은 원문 그대로 나간다.
  - **표에 auth 문구는 두지 않는다.** auth 는 `?lang=` 을 보고 직접 그 언어로 답하므로(아래 항목) 여기 복사하면 사업자 하나에 표가 둘이 된다. **다만 두 곳이 같은 문장을 보내면 표에 남겨야 한다** — `로그인이 필요합니다.` 가 그렇다. auth 도 보내지만 이 저장소의 `server.ts`·`socketServer.ts` 도 보내고, 레이드 소켓 오류로 화면에 뜬다. auth 문구라고 지웠다가 영어 화면에 한국어가 다시 나온 적이 있다.
  - **통합 인증(auth)에는 화면 언어를 쿼리(`?lang=`)로 넘긴다.** auth 가 그 언어로 오류 문구를 내려주므로 `omg.*` 처럼 표를 복사할 필요가 없다. **커스텀 헤더를 쓰면 안 된다** — auth 는 다른 오리진이라 헤더가 붙는 순간 CORS 프리플라이트가 뜨는데 `Access-Control-Allow-Headers` 가 `Content-Type` 뿐이다. gm 이 `X-Lang` 을 붙였다가 로그인이 통째로 죽어 있었다(`Failed to fetch`). `gameSync.js` 는 전역 스크립트라 import 를 못 하므로 `window.PcI18n` 다리로 언어를 찾는다(`authLangQuery()`).
  - **로그인은 화면을 여는 것만으로 검사되지 않는다.** 로그아웃 상태의 첫 화면은 폼만 보여주므로 멀쩡해 보인다. i18n·인증을 건드렸으면 **틀린 비밀번호로 오류 문구까지, 맞는 비밀번호로 canvas 마운트까지** 눌러 볼 것.

**백엔드 — `src/*.ts` (Express + socket.io + Postgres, `tsc` 빌드)**
- `server.ts`가 `public/`를 정적 서빙 + `/api/auth/*`, `/api/sca/*`, `/api/raid/*`, `/api/state` + socket.io.
- 인증: `authService.ts` — scrypt `salt:hash` 를 Postgres `users`에 저장. Bearer 토큰 → `auth_sessions`.
- **서버 권위 밸런스 시뮬**: `hardwareSimulator.ts`, `raidSimulator.ts`, `rewardService.ts`, `scaIncomeService.ts`. `HardwareSimulator`는 `public/originalMapData.js`를 `eval`로 로드해 프론트와 같은 OMG 공식을 공유한다.
- **순수 계산은 별도 모듈로 분리돼 DB 없이 단위 테스트됨**: 레이드 전투는 `raidCombat.ts`(보스 HP·DPS·오버킬 다층 클리어), 지급 산식은 `rewardService.computeRaidClaimCoins`, 채굴증폭기(채굴력·공속)는 `scaUpgrades.ts`. `raidSimulator`의 `RaidRoomState`는 얇은 파사드로 이 순수 로직을 위임한다.
- DB: `schema.sql`(전부 `IF NOT EXISTS`/`OR REPLACE`라 반복 적용 안전). 기본 접속값은 `db.ts`에 하드코딩된 `localhost:5432 / postgres / postgres / usemap_restore` — 로컬은 `.env` 없이도 동작.

## 로컬 실행 / 검증

```
npm run dev:local        # 프론트 개발 빌드 + Docker Postgres 기동 + 스키마 + 시드계정(test/test) + 서버 → localhost:3000
npm run db:up            # DB만 기동+시드 (서버는 npm run dev 로)
npm run db:down          # DB 컨테이너 삭제 (데이터 볼륨은 유지)
npm run dev              # 프론트 개발 빌드 + 서버 (DB가 이미 떠 있어야 함)
npm run watch:frontend   # 프론트만 감시 빌드 — app.jsx/styles.css 고칠 땐 별도 터미널에 띄워둘 것
npm run build:frontend   # 프론트 프로덕션 번들 1회 빌드
```
- `dev:local`은 **Docker Desktop 실행 중**이어야 함. 로그인은 `test` / `test`.
- 프론트만 볼 땐 백엔드가 필요하니, UI/게임 화면 확인은 위 로컬 스택으로.
- `dev`/`dev:local`은 시작 시점에 프론트를 **한 번만** 빌드한다. UI를 계속 고칠 거면 `watch:frontend`를 같이 띄워야 새로고침이 반영된다.

## 테스트

```
npm test                    # hardware + upgradeProb + balance 스냅샷 + raid 보상표 드리프트
                            #  + 순수 단위(raidCombat·scaUpgrades·rewardMath) (+ DB 설정 시 reward E2E)
npm run test:balance        # 밸런스 회귀: 대표 부품 조합 계산값을 스냅샷과 비교
npm run test:balance:update # 밸런스를 의도적으로 바꿨을 때 스냅샷 갱신 (diff 검토 후 함께 커밋)
npm run jsxcheck            # frontend/src/app.jsx 구문 게이트(TS 파서) — 빌드 없이 빠른 확인용
```
- 밸런스는 부품 간 상호의존이 커서 조용히 드리프트하기 쉽다. **밸런스 로직(`originalMapData.js`/`hardwareSimulator` 등)을 건드리면 `npm run test:balance`로 의도치 않은 변화가 없는지 확인**하고, 의도한 변경이면 스냅샷을 갱신해 커밋.
- 순수 로직(`raidCombat`/`scaUpgrades`/`computeRaidClaimCoins`)은 DB 불필요·결정론적이라 `npm test`에서 항상 실행된다. 해당 산식을 바꾸면 대응 테스트(`testRaidCombat`/`testScaUpgrades`/`testRewardMath`)도 함께 갱신.

## 배포

- **`main`에 push → self-hosted 러너(Oracle Cloud ARM, `pc-runner`)가 자동 배포** (`.github/workflows/deploy.yml`): `git reset --hard origin/main` → `npm run build` → `systemctl restart`. 서비스: <https://pc.elcherlab.com/>
- `npm run build` = **프론트 번들(esbuild+Tailwind) → `tsc`** 순서. 즉 배포 때 `public/build/` 가 새로 만들어진다(저장소에는 없음). 프론트만 고친 커밋도 반드시 이 빌드를 거쳐야 반영된다.
- 리버스 프록시는 서버의 Caddy(`/etc/caddy/Caddyfile`)가 담당하고 보안 헤더(HSTS·CSP·X-Frame-Options 등)도 거기서 붙인다. CSP가 `script-src 'self'; style-src 'self'` 라 **외부 CDN·인라인 스크립트를 추가하면 즉시 차단된다** — 새 라이브러리는 npm으로 받아 번들에 넣을 것.
- **주의: 러너가 offline이면 배포가 조용히 `queued`로 멈춘다**(실패 알림 없음). 배포가 안 될 땐 `npm run health`로 러너/큐 상태부터 확인.
- 감시는 두 겹이다.
  - `.github/workflows/runner-health.yml` — cron 은 `*/30` 이지만 **GitHub 스케줄러가 크게 밀어서 실제 간격은 2~6시간**이다(무료 계정의 짧은 주기 schedule 은 보장되지 않는다). 러너 자체가 죽어도 GitHub 이 대신 봐주는 최후의 보루로만 여길 것 — 즉각 감지를 기대하면 안 된다.
  - 서버의 `runner-health.timer` (5분 주기, `/opt/monitor/check-runners.sh`) — 러너 4개의 systemd 상태를 직접 보므로 이쪽이 실질적인 감시다. 서버가 통째로 죽으면 같이 죽지만, 그 경우 사이트가 내려가 바로 드러난다.
- 러너 복구: 인스턴스에서 `sudo systemctl start actions.runner.CyCle03-computer-upgrade-web.pc-runner.service`.

## 관례 / 함정

- 커밋 메시지·주석은 **한국어**, `feat:`/`fix:`/`docs:`/`ci:` 접두.
- **프론트는 타입체크가 없다**(esbuild는 트랜스파일만) — `app.jsx` 편집 후 `npm run build:frontend`(또는 `npm run jsxcheck`)로 구문 게이트를 먼저 통과시키고, 최종은 실제 로드로 확인.
- 백엔드는 `tsconfig` 에 `noUnusedLocals`/`noUnusedParameters` 가 켜져 있다. 안 쓰는 지역 변수·인자가 남으면 `tsc`(= `npm run build`)가 막는다. 인터페이스상 필요하지만 안 쓰는 인자는 `_req` 처럼 `_` 를 붙일 것. 프론트에는 이 그물이 없으니 `app.jsx` 는 눈으로 걷어내야 한다.
- 웹폰트는 셀프 호스팅(`public/fonts/*.woff2`). 폰트를 바꿀 때만 `node scripts/vendor-fonts.js` 를 다시 돌리고 결과물을 커밋한다.
- `express.static` 은 **`cors` 미들웨어보다 앞**에 있어야 한다. 웹폰트는 same-origin이어도 브라우저가 CORS 모드로 받아 `Origin` 헤더를 붙이므로, 순서가 뒤집히면 허용 목록에 없는 도메인에서 woff2가 500으로 떨어진다.
- `StorageType`은 백엔드 타입상 `'HDD' | 'SSD'`만 존재(‘NVMe’는 프론트 표기용 텍스트). 서버 부품 객체에 `'NVMe'` 쓰면 컴파일 에러.
- `tsconfig`는 `src/**/*`만 빌드 → `scripts/*.ts`는 ts-node로만 실행(빌드에 안 들어감).
- `scripts/*.py` 는 **원본 `.scx` 에서 값을 뽑아 `docs/` 를 만드는 일회성 도구**다(`extract_*`·`build_map_extract_doc`·`compare_map_spreadsheet`·`dump_map_context`, PKWARE 압축 해제는 `_vendor/`). `.scx` 가 저장소에 있어 재현은 되지만 앱 실행 경로와는 무관하다. 예전에 `public/index.html` 을 직접 기워넣던 패치 스크립트들이 함께 있었는데, index.html 이 껍데기가 되고 UI 가 `app.jsx` 번들로 옮겨간 뒤로는 돌릴 수 없는 코드라 지웠다.
