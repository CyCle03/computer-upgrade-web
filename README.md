# usemap-restore-backend

스타크래프트 유즈맵 **「컴퓨터 강화하기」** 웹 복원판의 백엔드 서버입니다.  
일일 100층 레이드 마일스톤 보상 검증, PostgreSQL 기반 영구 재화(SCA 코인) 관리, Socket.io 실시간 멀티플레이 레이드, 하드웨어 스펙 시뮬레이션을 제공합니다.

## 주요 기능

| 기능 | 설명 |
|------|------|
| **일일 레이드 보상** | 10~100층 마일스톤(10층 단위) 클리어 시 SCA 코인 지급. 하루 1회 리셋, 중복 수령·Race Condition 방지 |
| **실시간 레이드** | Socket.io 기반 4인 파티 100층 보스 레이드 시뮬레이션 |
| **하드웨어 시뮬레이터** | CPU/GPU/RAM/쿨러/메인보드/저장장치 조합에 따른 DPS·페널티 연산 |
| **웹 대시보드** | `public/index.html` — React 기반 인게임 UI (부품 강화, 사냥터, 레이드 입장) |

## 기술 스택

- **Runtime:** Node.js + TypeScript
- **HTTP:** Express
- **실시간:** Socket.io
- **DB:** PostgreSQL (`pg`)
- **프론트:** React 18 (CDN), Tailwind CSS

## 프로젝트 구조

```
.
├── public/
│   └── index.html          # 웹 복원판 대시보드 (React SPA)
├── src/
│   ├── server.ts           # Express HTTP 서버 진입점
│   ├── socketServer.ts     # Socket.io 레이드 방 관리
│   ├── raidSimulator.ts    # 100층 레이드 전투 시뮬레이터
│   ├── rewardService.ts    # 일일 마일스톤 보상 검증·지급
│   ├── hardwareSimulator.ts# 하드웨어 스펙·페널티 연산
│   ├── db.ts               # PostgreSQL 커넥션 풀
│   ├── types.ts            # 공통 타입 정의
│   ├── testReward.ts       # 보상 로직 통합 테스트
│   ├── testRaid.ts         # 레이드·소켓 통합 테스트
│   └── testHardware.ts     # 하드웨어 시뮬레이터 테스트
├── schema.sql              # DB 스키마 및 RPC 함수
├── .env.example            # 환경 변수 예시
└── package.json
```

## 사전 요구 사항

- Node.js 18+
- PostgreSQL 14+

## 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example`을 복사해 `.env` 파일을 만듭니다.

```bash
cp .env.example .env
```

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PORT` | `3000` | 서버 포트 |
| `NODE_ENV` | `development` | 실행 환경 |
| `DB_HOST` | `localhost` | PostgreSQL 호스트 |
| `DB_PORT` | `5432` | PostgreSQL 포트 |
| `DB_USER` | `postgres` | DB 사용자 |
| `DB_PASSWORD` | `postgres` | DB 비밀번호 |
| `DB_NAME` | `usemap_restore` | DB 이름 |
| `DB_POOL_MAX` | `20` | 커넥션 풀 최대 크기 |
| `DB_SSL` | `false` | 클라우드 DB SSL 사용 여부 |
| `USE_RPC` | `false` | `true`: PL/pgSQL RPC 사용 / `false`: Node.js 트랜잭션 사용 |

### 3. 데이터베이스 초기화

PostgreSQL에 데이터베이스를 생성한 뒤 스키마를 적용합니다.

```bash
createdb usemap_restore
psql -d usemap_restore -f schema.sql
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 으로 접속합니다.

### 5. 프로덕션 빌드 및 실행

```bash
npm run build
npm start
```

## API

### 헬스 체크

```
GET /health
```

**응답 예시**

```json
{
  "status": "ok",
  "timestamp": "2026-06-01T12:00:00.000Z"
}
```

### 일일 레이드 마일스톤 보상 수령

```
POST /api/raid/claim
Content-Type: application/json
```

**요청 Body**

| 필드 | 타입 | 설명 |
|------|------|------|
| `userId` | `string` | 유저 UUID |
| `currentFloor` | `number` | 달성 층수 (10~100, 10의 배수) |

**요청 예시**

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "currentFloor": 30
}
```

**성공 응답 (200)**

```json
{
  "success": true,
  "message": "보상이 정상적으로 지급되었습니다.",
  "claimedCoins": 30,
  "newHighestFloor": 30,
  "currentTotalCoins": 30
}
```

**보상 규칙**

- 10층당 SCA 코인 **10개** 지급
- 이미 수령한 층 이하 재요청 시 거부
- 날짜가 바뀌면 `highestClaimedFloor`가 0으로 리셋
- 예: 80층 수령 후 100층 클리어 → (100 − 80) / 10 × 10 = **20코인** 차분 지급

## Socket.io 이벤트

| 이벤트 (클라이언트 → 서버) | 설명 |
|---------------------------|------|
| `joinRoom` | 레이드 방 입장 (`roomId`, `userId`, `nickname`, `parts`) |
| `readyStatus` | 준비 상태 토글 (`isReady`) |

| 이벤트 (서버 → 클라이언트) | 설명 |
|---------------------------|------|
| `room_state` | 방 상태 브로드캐스트 (층수, 보스 HP, DPS 등) |
| `milestone_reward_claimed` | 10층 마일스톤 돌파 보상 지급 결과 |
| `error_message` | 오류 메시지 |

기본 레이드 방 ID: `carry-room-100`

## 보상 처리 모드

`USE_RPC` 환경 변수로 보상 처리 방식을 선택합니다.

| 모드 | `USE_RPC` | 설명 |
|------|-----------|------|
| Express TX | `false` (기본) | Node.js에서 `BEGIN` / `SELECT ... FOR UPDATE` / `COMMIT` |
| Supabase RPC | `true` | `schema.sql`의 `claim_daily_raid_reward()` PL/pgSQL 함수 호출 |

두 방식 모두 DB 서버 기준 `CURRENT_DATE`를 사용하며, 로우 락으로 동시성 문제를 방지합니다.

## 테스트

DB 연결이 필요한 테스트는 `.env` 설정 후 실행합니다.

```bash
# 보상 로직 및 Race Condition 검증
npx ts-node src/testReward.ts

# 하드웨어 스펙 연산 검증 (DB 불필요)
npx ts-node src/testHardware.ts

# Socket.io 레이드 시뮬레이션 (DB 필요)
npx ts-node src/testRaid.ts
```

## 데이터베이스 스키마

| 테이블 | 용도 |
|--------|------|
| `users` | 유저 기본 정보 (UUID, 닉네임) |
| `in_game_currencies` | 세션 휘발성 재화 (미네랄, 일반 코인) |
| `permanent_currencies` | 영구 재화 (SCA 코인) |
| `daily_raid_progresses` | 일일 레이드 진행도 및 마일스톤 수령 기록 |

## 라이선스

Private — 내부 복원 프로젝트용
