-- 레이드 마일스톤 보상 스케일 업데이트 (10층당 10코인 → 누적 차분표)
-- 프로덕션 DB에 옛 claim_daily_raid_reward 가 남아 있으면 이 스크립트를 실행하세요.
-- USE_RPC=true 환경에서 필수. USE_RPC=false 만 쓰는 경우에도 RPC 호출 대비용으로 적용 권장.
--
-- 적용 예:
--   psql "$DATABASE_URL" -f scripts/migrate_raid_rewards.sql

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

DROP FUNCTION IF EXISTS claim_daily_raid_reward(UUID, INT);

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
    IF p_current_floor < 10 OR p_current_floor > 100 OR p_current_floor % 10 <> 0 THEN
        RETURN QUERY SELECT FALSE, '올바르지 않은 층수입니다. 10층 단위(10~100)로만 클리어할 수 있습니다.'::TEXT, 0, 0, 0;
        RETURN;
    END IF;

    v_today := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::date;

    INSERT INTO daily_raid_progresses (user_id, last_played_date, highest_claimed_floor)
    VALUES (p_user_id, v_today, 0)
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO permanent_currencies (user_id, sca_coins)
    VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO game_states (user_id, state)
    VALUES (p_user_id, '{}'::jsonb)
    ON CONFLICT (user_id) DO NOTHING;

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

    IF v_last_played_date <> v_today THEN
        v_highest_claimed_floor := 0;
        v_last_played_date := v_today;

        UPDATE daily_raid_progresses
        SET last_played_date = v_today,
            highest_claimed_floor = 0
        WHERE user_id = p_user_id;
    END IF;

    IF p_current_floor <= v_highest_claimed_floor THEN
        RETURN QUERY SELECT
            FALSE,
            '이미 해당 층수 이하의 모든 마일스톤 보상을 수령하셨습니다.'::TEXT,
            0,
            v_highest_claimed_floor,
            v_wallet_sca;
        RETURN;
    END IF;

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

    v_stat_mult := 1.0 + (v_rebirth_stat::numeric / 10000000.0);

    v_base_reward := get_raid_cumulative_reward(p_current_floor) - get_raid_cumulative_reward(v_highest_claimed_floor);
    v_coins_to_reward := floor(v_base_reward::numeric * v_stat_mult);

    UPDATE permanent_currencies
    SET sca_coins = sca_coins + v_coins_to_reward
    WHERE user_id = p_user_id;

    v_new_wallet_sca := v_wallet_sca + v_coins_to_reward;
    UPDATE game_states
    SET state = jsonb_set(COALESCE(state, '{}'::jsonb), '{sca_scaCoins}', to_jsonb(v_new_wallet_sca::text))
    WHERE user_id = p_user_id;

    UPDATE daily_raid_progresses
    SET highest_claimed_floor = p_current_floor
    WHERE user_id = p_user_id;

    RETURN QUERY SELECT
        TRUE,
        '보상이 정상적으로 지급되었습니다.'::TEXT,
        v_coins_to_reward,
        p_current_floor,
        v_new_wallet_sca;
END;
$$ LANGUAGE plpgsql;
