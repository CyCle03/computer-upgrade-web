import fs from 'fs';
import path from 'path';
import vm from 'vm';

/**
 * public/originalMapData.js(window.OriginalMapGame = OMG)를 서버에서 로드하는 단일 진입점.
 *
 * 프론트와 밸런스 공식을 공유하기 위해 같은 파일을 로드하되,
 * 전역(globalThis) 오염을 피하려고 격리된 vm 컨텍스트에서 실행한다.
 * (기존에는 hardwareSimulator가 `eval`로 전역을 오염시키고, gameBalance가 별도 vm을
 *  또 만들어 같은 파일을 두 번 로드하던 중복을 이 모듈로 일원화한다.)
 *
 * 결과는 캐시되어 프로세스 수명 동안 한 번만 로드된다.
 */
let cached: OmgRuntime | null = null;

/** OMG 런타임 객체. 메서드가 많아 느슨하게 타입 지정하고, 세부 타입은 gameBalance에서 좁힌다. */
export type OmgRuntime = Record<string, any>;

export function loadOmg(): OmgRuntime {
  if (cached) return cached;

  const filePath = path.join(__dirname, '..', 'public', 'originalMapData.js');
  const code = fs.readFileSync(filePath, 'utf8');

  // sandbox.globalThis = sandbox 로 두면 originalMapData.js의
  // `(function(global){ global.OriginalMapGame = ... })(window ?? globalThis)`가
  // 샌드박스에 OriginalMapGame을 심는다.
  const sandbox: Record<string, unknown> = {};
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  const omg = sandbox.OriginalMapGame as OmgRuntime | undefined;
  if (!omg) {
    throw new Error(`[omgLoader] originalMapData.js에서 OriginalMapGame을 로드하지 못했습니다: ${filePath}`);
  }
  cached = omg;
  return cached;
}
