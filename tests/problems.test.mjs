import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCalcCards } from './load.mjs';
const { SETS } = loadCalcCards();

const calc = ([a, op, b]) => (op === '+' ? a + b : op === '-' ? a - b : a * b);
const keys = (set) => SETS[set].problems.map(([a, op, b]) => `${a}${op}${b}`);
const rows = (set) => SETS[set].problems;

test('セットが 5 つあり、問題数が出典どおり', () => {
  assert.deepEqual(Object.keys(SETS), ['add10', 'sub10', 'add-carry', 'sub-borrow', 'kuku']);
  assert.equal(rows('add10').length, 45);
  assert.equal(rows('sub10').length, 45);
  assert.equal(rows('add-carry').length, 36);
  assert.equal(rows('sub-borrow').length, 36);
  assert.equal(rows('kuku').length, 90);
});

test('すべての式の答えが正しく、重複がない', () => {
  for (const [name, set] of Object.entries(SETS)) {
    for (const p of set.problems) assert.equal(calc(p), p[3], `${name}: ${p}`);
    assert.equal(new Set(keys(name)).size, set.problems.length, `${name} に重複`);
  }
});

test('10までのたしざん: 和は 2〜10、1〜9 の数', () => {
  for (const [a, , b, r] of rows('add10')) {
    assert.ok(a >= 1 && b >= 1 && r <= 10 && r >= 2);
  }
  // 和が 10 以下の組み合わせをすべて含む
  let n = 0;
  for (let a = 1; a <= 9; a++) for (let b = 1; b <= 9; b++) if (a + b <= 10) { n++; assert.ok(keys('add10').includes(`${a}+${b}`)); }
  assert.equal(n, 45);
});

test('10までのひきざん: ひかれる数は 2〜10、答えは 1〜9', () => {
  for (const [a, , b, r] of rows('sub10')) {
    assert.ok(a >= 2 && a <= 10 && b >= 1 && r >= 1 && r <= 9);
  }
  assert.deepEqual(rows('sub10')[0], [10, '-', 1, 9]);
  assert.deepEqual(rows('sub10').at(-1), [2, '-', 1, 1]);
});

test('くりあがりのあるたしざん: 一の位の和が 10 以上、答えは 11〜18', () => {
  for (const [a, , b, r] of rows('add-carry')) {
    assert.ok(a >= 2 && a <= 9 && b >= 2 && b <= 9 && a + b >= 11 && r === a + b && r <= 18);
  }
  let n = 0;
  for (let a = 2; a <= 9; a++) for (let b = 2; b <= 9; b++) if (a + b >= 11) { n++; assert.ok(keys('add-carry').includes(`${a}+${b}`)); }
  assert.equal(n, 36);
});

test('くりさがりのあるひきざん: 11〜18 から 一の位が足りない 1 けたをひく', () => {
  for (const [a, , b, r] of rows('sub-borrow')) {
    assert.ok(a >= 11 && a <= 18 && b >= 2 && b <= 9 && a % 10 < b && r >= 2 && r <= 9);
  }
  let n = 0;
  for (let a = 11; a <= 18; a++) for (let b = 2; b <= 9; b++) if (a % 10 < b && a - b <= 9) { n++; assert.ok(keys('sub-borrow').includes(`${a}-${b}`)); }
  assert.equal(n, 36);
});

test('九九: 1〜9 のだん × 1〜10、順番は だん → かける数', () => {
  const k = rows('kuku');
  k.forEach(([a, op, b], i) => {
    assert.equal(op, '×');
    assert.equal(a, Math.floor(i / 10) + 1);
    assert.equal(b, (i % 10) + 1);
  });
});

test('答えは最大 2 けた', () => {
  for (const set of Object.values(SETS)) for (const p of set.problems) assert.ok(p[3] >= 1 && p[3] <= 99);
});
