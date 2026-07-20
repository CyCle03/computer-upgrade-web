#!/usr/bin/env bash
# 배포/러너 상태 로컬 점검 (온디맨드).
#   npm run health      또는     bash scripts/check-deploy-health.sh
#
# gh CLI 인증만 있으면 된다(외부 jq 불필요 — gh 내장 --jq 사용).
# self-hosted 러너의 online 여부와 멈춰 있는 배포 run 을 함께 보여준다.
set -euo pipefail

REPO="${REPO:-CyCle03/computer-upgrade-web}"
STUCK_MIN="${STUCK_MIN:-15}"

echo "== 러너 상태 =="
if ! gh api "repos/$REPO/actions/runners" \
      --jq '.runners[] | "  \(.name): \(.status)\(if .busy then " (busy)" else "" end)"' 2>/dev/null; then
  echo "  (러너 목록 조회 실패 — 토큰 권한 부족일 수 있음)"
fi
offline=$(gh api "repos/$REPO/actions/runners" \
  --jq '[.runners[] | select(.status != "online")] | length' 2>/dev/null || echo 0)
[ "${offline:-0}" -gt 0 ] && echo "  ⚠️  offline 러너 있음"

echo ""
echo "== 최근 Deploy run (최신 5개) =="
gh api "repos/$REPO/actions/workflows/deploy.yml/runs?per_page=5" \
  --jq '.workflow_runs[] | "  \(.created_at)  \(.status)/\(.conclusion // "-")  \(.display_title[0:40])"'

echo ""
STUCK_MIN="$STUCK_MIN" \
stuck=$(gh api "repos/$REPO/actions/workflows/deploy.yml/runs?per_page=20" \
  --jq --arg th "$(( STUCK_MIN * 60 ))" '
    .workflow_runs[]
    | select(.status=="queued" or .status=="in_progress")
    | (now - (.created_at|fromdateiso8601)) as $a
    | select($a > ($th|tonumber))
    | "  \(.status) \(($a/60)|floor)분  \(.html_url)"' 2>/dev/null || true)

if [ -n "${stuck:-}" ]; then
  echo "🚨 ${STUCK_MIN}분 넘게 멈춘 배포:"
  echo "$stuck"
  echo ""
  echo "복구: 러너에서  sudo systemctl start actions.runner.CyCle03-computer-upgrade-web.web-game-server.service"
  exit 1
else
  echo "✅ 멈춘 배포 없음. 파이프라인 정상."
fi
