/**
 * 부품별 강화 확률 검증 — 최종 강 prob=0 보정 후 모든 구간 prob > 0
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';

function loadOMG(): { auditUpgradeProbTable: () => Array<{ label: string; from: number; to: number; prob: number; isFinalStep: boolean }> } {
  const filePath = path.join(__dirname, '../public/originalMapData.js');
  const code = fs.readFileSync(filePath, 'utf8');
  const sandbox: { OriginalMapGame?: unknown } = {};
  vm.runInNewContext(code, sandbox, { filename: 'originalMapData.js' });
  const OMG = sandbox.OriginalMapGame as { auditUpgradeProbTable: () => Array<{ label: string; from: number; to: number; prob: number; isFinalStep: boolean }> };
  if (!OMG?.auditUpgradeProbTable) throw new Error('OMG.auditUpgradeProbTable not found');
  return OMG;
}

function runUpgradeProbTests(): boolean {
  console.log('==================================================');
  console.log('[UpgradeProbTest] 부품별 강화 확률 검증');
  console.log('==================================================');

  const OMG = loadOMG();
  const rows = OMG.auditUpgradeProbTable();
  let passed = true;

  const byLabel = new Map<string, typeof rows>();
  rows.forEach((row) => {
    const list = byLabel.get(row.label) || [];
    list.push(row);
    byLabel.set(row.label, list);
  });

  byLabel.forEach((list, label) => {
    console.log(`\n[${label}]`);
    list.forEach((r) => {
      const pct = (r.prob * 100).toFixed(1);
      const finalTag = r.isFinalStep ? ' (최종)' : '';
      console.log(`  +${r.from}→+${r.to}: ${pct}%${finalTag}`);
      if (r.prob <= 0) {
        console.error(`  => [FAILED] +${r.from}→+${r.to} 확률 0%`);
        passed = false;
      }
    });
  });

  if (passed) {
    console.log('\n=> [PASSED] 모든 강화 구간 확률 > 0');
  } else {
    console.error('\n=> [FAILED] 0% 확률 구간 존재');
  }
  return passed;
}

if (!runUpgradeProbTests()) {
  process.exit(1);
}
