import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCalcCards } from './load.mjs';
const { shuffle, buildQueue, filterByDan, isCorrect, pressDigit, backspace, Session, formatTime, formatSeconds, minUnit, toProblem, solvedText, SETS } = loadCalcCards();

// 決まった乱数列（テストを再現可能にする）
function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

test('shuffle: 要素は同じで元配列は変わらない', () => {
  const src = [1, 2, 3, 4, 5, 6, 7, 8];
  const out = shuffle(src, seeded(1));
  assert.deepEqual([...src], [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual([...out].sort(), [...src]);
});

test('shuffle: 乱数しだいで並びが変わる', () => {
  const src = Array.from({ length: 20 }, (_, i) => i);
  assert.notDeepEqual(shuffle(src, seeded(1)), shuffle(src, seeded(2)));
  assert.notDeepEqual(shuffle(src, seeded(1)), src);
});

test('buildQueue: じゅんばんは元データの順', () => {
  const q = buildQueue('add10', { mode: 'order' });
  assert.equal(q.length, 45);
  assert.deepEqual(q.map((p) => [p.a, p.op, p.b, p.answer]), SETS.add10.problems.map((r) => [...r]));
});

test('buildQueue: ランダムは同じ問題を過不足なく含む', () => {
  for (const key of Object.keys(SETS)) {
    const q = buildQueue(key, { mode: 'random', rng: seeded(7) });
    const norm = (l) => l.map((p) => `${p.a}${p.op}${p.b}`).sort();
    assert.deepEqual(norm(q), norm(SETS[key].problems.map(toProblem)));
  }
});

test('buildQueue: 九九のだん指定と ぜんぶ', () => {
  const q7 = buildQueue('kuku', { mode: 'order', dan: 7 });
  assert.equal(q7.length, 9);
  assert.ok(q7.every((p) => p.a === 7));
  assert.equal(buildQueue('kuku', { mode: 'order', dan: 'all' }).length, 81);
  assert.equal(buildQueue('kuku', { mode: 'random', dan: 3, rng: seeded(3) }).length, 9);
  // 九九以外では dan は無視される
  assert.equal(buildQueue('add10', { dan: 3 }).length, 45);
});

test('buildQueue: 未知のセットはエラー', () => {
  assert.throws(() => buildQueue('nope'));
});

test('filterByDan', () => {
  const all = SETS.kuku.problems.map(toProblem);
  assert.equal(filterByDan(all, null).length, 81);
  assert.equal(filterByDan(all, 9).length, 9);
});

test('isCorrect', () => {
  const p = { a: 9, op: '+', b: 2, answer: 11 };
  assert.equal(isCorrect(p, '11'), true);
  assert.equal(isCorrect(p, '12'), false);
  assert.equal(isCorrect(p, ''), false);
  assert.equal(isCorrect(p, '011'), true); // 数としては 11（pressDigit が先頭 0 を防ぐので通常は来ない）
});

test('pressDigit / backspace', () => {
  assert.equal(pressDigit('', 1), '1');
  assert.equal(pressDigit('1', 2), '12');
  assert.equal(pressDigit('12', 3), '12'); // 2 けたまで
  assert.equal(pressDigit('0', 5), '5');
  assert.equal(backspace('12'), '1');
  assert.equal(backspace(''), '');
});

test('Session: 誤答は数えて同じ問題、正答で次へ、全問で終了', () => {
  const s = new Session(buildQueue('add10', { dan: null }).slice(0, 3));
  s.start(1000);
  assert.equal(s.current.answer, 2);
  assert.deepEqual(s.submit('9', 1500), { correct: false, finished: false });
  assert.equal(s.index, 0);
  assert.equal(s.mistakes, 1);
  assert.deepEqual(s.submit('2', 2000), { correct: true, finished: false });
  assert.equal(s.current.answer, 3);
  s.submit('3', 3000);
  const last = s.submit('4', 5000);
  assert.deepEqual(last, { correct: true, finished: true });
  assert.equal(s.finished, true);
  assert.equal(s.elapsedMs(99999), 4000); // 終了後は時間が進まない
  assert.equal(s.mistakes, 1);
  // 終了後の入力は無視
  assert.equal(s.submit('1', 6000).correct, false);
  assert.equal(s.mistakes, 1);
});

test('Session: やめるとタイマーが止まる', () => {
  const s = new Session(buildQueue('sub10', {}));
  s.start(0);
  assert.equal(s.elapsedMs(1234), 1234);
  s.abort(2000);
  assert.equal(s.elapsedMs(9000), 2000);
  assert.equal(s.aborted, true);
});

test('Session: 途中でやめたときの できた数・まちがい', () => {
  const s = new Session(buildQueue('add10', {}).slice(0, 5));
  s.start(0);
  s.submit('2', 100); s.submit('0', 200); s.submit('3', 300);
  assert.equal(s.solved, 2);
  assert.equal(s.allSolved, false);
  s.abort(500);
  assert.equal(s.finished, true);
  assert.equal(s.solved, 2);
  assert.equal(s.mistakes, 1);
  assert.equal(s.elapsedMs(9999), 500);
  assert.equal(s.submit('4', 600).correct, false); // やめた後は進まない
  assert.equal(s.solved, 2);
});

test('Session: 全問できたら allSolved、abort しても aborted にならない', () => {
  const s = new Session(buildQueue('add10', {}).slice(0, 1));
  s.start(0);
  s.submit('2', 100);
  s.abort(200);
  assert.equal(s.allSolved, true);
  assert.equal(s.aborted, false);
  assert.equal(s.elapsedMs(999), 100);
});

test('solvedText', () => {
  assert.equal(solvedText(45, 45), 'ぜんぶ できた！');
  assert.equal(solvedText(12, 45), '45もん中 12もん できた');
  assert.equal(solvedText(0, 10), '10もん中 0もん できた');
});

test('formatTime', () => {
  assert.equal(formatTime(0), '0.0びょう');
  assert.equal(formatTime(5230), '5.2びょう');
  assert.equal(formatTime(65400), '1ぷん 5.4びょう');
});

test('formatTime: 分の読み（ふん / ぷん）', () => {
  const expected = { 1: 'ぷん', 2: 'ふん', 3: 'ぷん', 4: 'ぷん', 5: 'ふん', 6: 'ぷん', 7: 'ふん', 8: 'ぷん', 9: 'ふん', 10: 'ぷん', 12: 'ふん', 15: 'ふん' };
  for (const [m, u] of Object.entries(expected)) assert.equal(minUnit(Number(m)), u, `${m}`);
  assert.equal(formatTime(125000), '2ふん 5.0びょう');
  assert.equal(formatTime(60000), '1ぷん 0.0びょう');
  assert.equal(formatTime(300000 + 1234), '5ふん 1.2びょう');
});

test('formatSeconds と formatTime の丸めがそろう（0.1 秒の切り捨て）', () => {
  assert.equal(formatSeconds(1999), '1.9');
  assert.equal(formatSeconds(125300), '125.3');
  assert.equal(formatSeconds(-5), '0.0');
  assert.equal(formatTime(1999), '1.9びょう');
  assert.equal(formatTime(59999), '59.9びょう');
});

test('九九のだんを文字列 "7" で渡しても絞り込める（app.js は文字列で渡す）', () => {
  const q = buildQueue('kuku', { mode: 'order', dan: '7' });
  assert.equal(q.length, 9);
  assert.ok(q.every((p) => p.a === 7));
  assert.equal(filterByDan(SETS.kuku.problems.map(toProblem), '3').length, 9);
});
