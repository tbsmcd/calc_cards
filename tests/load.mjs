// classic script（problems.js → logic.js）を node:vm で同じコンテキストに読み込み、
// globalThis.CalcCards を取り出す。依存パッケージなし。
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

export function loadCalcCards() {
  const ctx = vm.createContext({});
  for (const f of ['problems.js', 'logic.js']) {
    const url = new URL(`../js/${f}`, import.meta.url);
    vm.runInContext(readFileSync(url, 'utf8'), ctx, { filename: f });
  }
  // vm の別 realm で作られた配列/オブジェクトは deepStrictEqual で比べられないので、
  // 関数の戻り値と SETS を本体 realm の値にそろえる。
  const cc = vm.runInContext('globalThis.CalcCards', ctx);
  const plain = (v) => JSON.parse(JSON.stringify(v));
  const wrap = (fn) => (...a) => { const r = fn(...a); return r !== null && typeof r === 'object' && !(r instanceof Map) ? plain(r) : r; };
  class Session extends cc.Session {
    submit(...a) { return plain(super.submit(...a)); }
  }
  return { ...cc, SETS: plain(cc.SETS), shuffle: wrap(cc.shuffle), buildQueue: wrap(cc.buildQueue), filterByDan: wrap(cc.filterByDan), Session };
}
