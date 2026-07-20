/**
 * game_states JSONB 페이로드에서 사용하는 키 상수.
 *
 * 이 키들은 여러 서비스에 문자열 리터럴로 흩어져 있어 오타 시 조용히 깨졌다.
 * 단일 소스로 모아 타입 안전하게 참조한다.
 */
export const StateKey = {
  scaCoins: 'sca_scaCoins',
  scaUpgrades: 'sca_scaUpgrades',
  rebirthStat: 'sca_rebirthStat',
  rebirthCount: 'sca_rebirthCount',
  partyLastClaimMs: 'sca_partyLastClaimMs',
  partyHuntingTier: 'sca_partyHuntingTier',
} as const;

/**
 * 서버 API만 갱신할 수 있는 키(잔액·환생 수치·파티 타이머).
 * saveState()가 클라이언트 저장 시 이 키들을 덮어쓰지 못하도록 보존한다.
 */
export const SERVER_ONLY_STATE_KEYS = [
  StateKey.scaCoins,
  StateKey.scaUpgrades,
  StateKey.rebirthStat,
  StateKey.rebirthCount,
  StateKey.partyLastClaimMs,
  StateKey.partyHuntingTier,
] as const;
