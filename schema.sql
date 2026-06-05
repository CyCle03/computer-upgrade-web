-- '컴퓨터 강화하기' 웹 복원판 PostgreSQL 데이터베이스 스키마 및 마이그레이션 스크립트

-- 1. UUID 확장 모듈 활성화 (Supabase 환경에서는 기본 제공되나 보장하기 위해 추가)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. 유저 테이블 생성
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nickname VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. 세션 휘발성 인게임 재화 테이블 생성
-- 방 퇴장 시 또는 특정 세션 종료 시 애플리케이션 단에서 해당 유저의 값을 0으로 UPDATE 가능
CREATE TABLE IF NOT EXISTS in_game_currencies (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    minerals INTEGER DEFAULT 0 NOT NULL CHECK (minerals >= 0),
    normal_coins INTEGER DEFAULT 0 NOT NULL CHECK (normal_coins >= 0)
);

-- 4. 영구 재화 테이블 생성 (외부 변조 차단, CHECK 제약조건 포함)
CREATE TABLE IF NOT EXISTS permanent_currencies (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    sca_coins INTEGER DEFAULT 0 NOT NULL CHECK (sca_coins >= 0)
);

-- 5. 일일 레이드 진행도 및 마일스톤 테이블 생성
-- highest_claimed_floor는 오늘 이미 보상을 수령한 최고 층수로, 0에서 100 사이의 10의 배수여야 함.
CREATE TABLE IF NOT EXISTS daily_raid_progresses (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    last_played_date DATE DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::date NOT NULL,
    highest_claimed_floor INTEGER DEFAULT 0 NOT NULL,
    CONSTRAINT chk_highest_floor CHECK (
        highest_claimed_floor >= 0 AND 
        highest_claimed_floor <= 100 AND 
        highest_claimed_floor % 10 = 0
    )
);

-- 인덱스 추가로 검색 성능 및 락 경쟁 최적화
CREATE INDEX IF NOT EXISTS idx_users_nickname ON users(nickname);

-- 6. 로그인(계정) 지원: 비밀번호 해시 컬럼 추가
-- 기존(레거시) 닉네임 전용 유저와의 호환을 위해 NULL 허용. 신규 가입 시에만 채워짐.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 7. 로그인 세션 토큰 테이블 (Bearer 토큰 → 유저 매핑)
CREATE TABLE IF NOT EXISTS auth_sessions (
    token TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);

-- 8. 계정별 게임 진행도 저장 테이블 (클라이언트 localStorage 전체를 JSONB로 동기화)
CREATE TABLE IF NOT EXISTS game_states (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    state JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--------------------------------------------------------------------------------
-- 9. Supabase / PostgreSQL 전용 일일 마일스톤 보상 검증 및 지급 RPC 함수
-- DB 단에서 단일 트랜잭션과 SELECT ... FOR UPDATE 로우 락을 활용하여
-- Race Condition 및 시간 조작 어뷰징을 완벽 차단합니다.
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION claim_daily_raid_reward(
    p_user_id UUID,
    p_current_floor INT
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    claimed_coins INT,
    new_highest_floor INT,
    current_total_coins INT
) AS $$
DECLARE
    v_today DATE;
    v_last_played_date DATE;
    v_highest_claimed_floor INT;
    v_current_sca_coins INT;
    v_coins_to_reward INT := 0;
    v_floors_to_claim INT := 0;
    v_coin_per_milestone INT := 5000; -- 10층당 지급할 기본 SCA 코인 수
END;
$$ LANGUAGE plpgsql; -- Placeholder to ensure rewrite success, will override below with correct code
DROP FUNCTION IF EXISTS claim_daily_raid_reward(UUID, INT);
CREATE OR REPLACE FUNCTION get_raid_cumulative_reward(p_floor INT)
RETURNS INT AS $$
BEGIN
    RETURN CASE p_floor
        WHEN 10 THEN 1000
        WHEN 20 THEN 3000
        WHEN 30 THEN 6000
        WHEN 40 THEN 10000
        WHEN 50 THEN 15000
        WHEN 60 THEN 22000
        WHEN 70 THEN 30000
        WHEN 80 THEN 40000
        WHEN 90 THEN 55000
        WHEN 100 THEN 80000
        ELSE 0
    END;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION claim_daily_raid_reward(
    p_user_id UUID,
    p_current_floor INT
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    claimed_coins INT,
    new_highest_floor INT,
    current_total_coins INT
) AS $$
DECLARE
    v_today DATE;
    v_last_played_date DATE;
    v_highest_claimed_floor INT;
    v_current_sca_coins INT;
    v_coins_to_reward INT := 0;
    v_base_reward INT := 0;
    v_rebirth_stat INT := 0;
    v_stat_mult NUMERIC := 1.0;
    v_wallet_sca INT := 0;
    v_new_wallet_sca INT := 0;
BEGIN
    -- [검증 1] 입력받은 층수가 올바른 마일스톤 단위인지 체크 (10, 20, ..., 100)
    IF p_current_floor < 10 OR p_current_floor > 100 OR p_current_floor % 10 <> 0 THEN
        RETURN QUERY SELECT FALSE, '올바르지 않은 층수입니다. 10층 단위(10~100)로만 클리어할 수 있습니다.'::TEXT, 0, 0, 0;
        RETURN;
    END IF;

    -- [보안 1] 클라이언트 시간이 아닌, KST 한국 표준시 기준의 현재 날짜를 가져옴
    v_today := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::date;

    -- [보안 2] Race Condition 및 재화 복사 방지를 위해 관련 행들에 FOR UPDATE 로우 락 설정
    -- 유저의 일일 레이드 진행 상황 및 재화 행이 존재하지 않는 경우 최초 삽입(Upsert) 진행
    
    INSERT INTO daily_raid_progresses (user_id, last_played_date, highest_claimed_floor)
    VALUES (p_user_id, v_today, 0)
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO permanent_currencies (user_id, sca_coins)
    VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO game_states (user_id, state)
    VALUES (p_user_id, '{}'::jsonb)
    ON CONFLICT (user_id) DO NOTHING;

    -- 로우 락을 걸고 현재 정보 획득
    SELECT last_played_date, highest_claimed_floor 
    INTO v_last_played_date, v_highest_claimed_floor
    FROM daily_raid_progresses
    WHERE user_id = p_user_id
    FOR UPDATE;

    SELECT sca_coins
    INTO v_current_sca_coins
    FROM permanent_currencies
    WHERE user_id = p_user_id
    FOR UPDATE;

    SELECT COALESCE((state->>'sca_scaCoins')::int, 0)
    INTO v_wallet_sca
    FROM game_states
    WHERE user_id = p_user_id
    FOR UPDATE;

    -- [규칙 1] 날짜가 바뀌었는지 검증
    -- 날짜가 바뀌었다면 highest_claimed_floor를 0으로 초기화하고 오늘 날짜로 갱신
    IF v_last_played_date <> v_today THEN
        v_highest_claimed_floor := 0;
        v_last_played_date := v_today;
        
        UPDATE daily_raid_progresses
        SET last_played_date = v_today,
            highest_claimed_floor = 0
        WHERE user_id = p_user_id;
    END IF;

    -- [규칙 2] 클리어한 층수가 오늘 수령 완료한 최고 층수보다 높은지 검증
    IF p_current_floor <= v_highest_claimed_floor THEN
        RETURN QUERY SELECT 
            FALSE, 
            '이미 해당 층수 이하의 모든 마일스톤 보상을 수령하셨습니다.'::TEXT, 
            0, 
            v_highest_claimed_floor, 
            v_wallet_sca;
        RETURN;
    END IF;

    -- [환생수치 추가 연동] game_states에서 rebirthStat 추출
    BEGIN
        SELECT COALESCE((state->>'sca_rebirthStat')::int, 0)
        INTO v_rebirth_stat
        FROM game_states
        WHERE user_id = p_user_id;
    EXCEPTION WHEN OTHERS THEN
        v_rebirth_stat := 0;
    END;
    
    IF v_rebirth_stat IS NULL THEN
        v_rebirth_stat := 0;
    END IF;

    -- 환생 수치 배율 연산 (10,000,000 당 +100% 보상 증폭)
    v_stat_mult := 1.0 + (v_rebirth_stat::numeric / 10000000.0);

    -- [규칙 3] 중복 지급 방지 차분 계산
    v_base_reward := get_raid_cumulative_reward(p_current_floor) - get_raid_cumulative_reward(v_highest_claimed_floor);
    v_coins_to_reward := floor(v_base_reward::numeric * v_stat_mult);

    -- [재화 지급] permanent_currencies(감사) + game_states.sca_scaCoins(지갑)
    UPDATE permanent_currencies
    SET sca_coins = sca_coins + v_coins_to_reward
    WHERE user_id = p_user_id;

    v_new_wallet_sca := v_wallet_sca + v_coins_to_reward;
    UPDATE game_states
    SET state = jsonb_set(COALESCE(state, '{}'::jsonb), '{sca_scaCoins}', to_jsonb(v_new_wallet_sca::text))
    WHERE user_id = p_user_id;

    -- [진행도 갱신] 최고 달성 층수 오늘 날짜로 업데이트
    UPDATE daily_raid_progresses
    SET highest_claimed_floor = p_current_floor
    WHERE user_id = p_user_id;

    -- 성공 결과 반환
    RETURN QUERY SELECT 
        TRUE, 
        '보상이 정상적으로 지급되었습니다.'::TEXT, 
        v_coins_to_reward, 
        p_current_floor, 
        v_new_wallet_sca;
END;
$$ LANGUAGE plpgsql;

--------------------------------------------------------------------------------
-- 10. Row Level Security (RLS) 활성화
-- Supabase 보안 어드바이저의 "RLS Disabled in Public" (CRITICAL) 경고 해소.
-- 이 앱은 Supabase 자동 PostgREST API(anon/authenticated 키)를 사용하지 않고
-- 자체 Express 백엔드가 postgres 역할로 직접 연결한다. postgres(테이블 소유자/
-- 슈퍼유저)는 RLS를 우회하므로, 정책을 추가하지 않아도 백엔드는 정상 동작하고
-- 외부 공개 API를 통한 anon/authenticated 접근은 기본 거부(deny-all)된다.
--------------------------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE in_game_currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE permanent_currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_raid_progresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;
