// 出題ロジック（DOM に依存しない）。node:test から直接テストできる。
// classic script: 先に problems.js を読み込むこと。globalThis.CalcCards に公開する。
(function (g) {
const { SETS } = g.CalcCards;

const MAX_DIGITS = 2;

/** Fisher–Yates。元の配列は変更せず、新しい配列を返す。rng は 0 以上 1 未満を返す関数。 */
function shuffle(items, rng = Math.random) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** データ行 [a, op, b, ans] を扱いやすい形にする。 */
function toProblem([a, op, b, answer]) {
  return { a, op, b, answer };
}

/** 九九の「だん」で絞り込む（dan が null / 'all' なら全部）。左の数がだん。 */
function filterByDan(problems, dan) {
  if (dan === null || dan === undefined || dan === 'all') return problems.slice();
  return problems.filter((p) => p.a === Number(dan));
}

/**
 * 出題リストを作る。
 * @param {string} setKey SETS のキー
 * @param {{mode:'order'|'random', dan?:number|'all'|null, rng?:()=>number}} opts
 */
function buildQueue(setKey, { mode = 'order', dan = null, rng = Math.random } = {}) {
  const set = SETS[setKey];
  if (!set) throw new Error(`unknown set: ${setKey}`);
  let list = filterByDan(set.problems.map(toProblem), setKey === 'kuku' ? dan : null);
  if (mode === 'random') list = shuffle(list, rng);
  return list;
}

/** 入力文字列と正解の比較。 */
function isCorrect(problem, input) {
  if (typeof input !== 'string' || !/^\d+$/.test(input)) return false;
  return Number(input) === problem.answer;
}

/** 数字キー: 最大桁数までしか入らない。先頭の 0 の連続は防ぐ。 */
function pressDigit(buf, digit, maxLen = MAX_DIGITS) {
  if (buf.length >= maxLen) return buf;
  if (buf === '0') return String(digit);
  return buf + String(digit);
}

function backspace(buf) {
  return buf.slice(0, -1);
}

/** 1 回ぶんのれんしゅうの状態（時間は呼び出し側が ms で渡す）。 */
class Session {
  constructor(queue) {
    this.queue = queue;
    this.index = 0;
    this.mistakes = 0;
    this.startedAt = null;
    this.finishedAt = null;
    this.aborted = false;
  }
  get total() { return this.queue.length; }
  get current() { return this.queue[this.index] ?? null; }
  get finished() { return this.finishedAt !== null; }
  start(now) { this.startedAt = now; }
  /** 答えを出す。正解なら次へ。最後の問題に正解したら finish。 */
  submit(input, now) {
    if (this.finished || !this.current) return { correct: false, finished: this.finished };
    if (isCorrect(this.current, input)) {
      this.index++;
      if (this.index >= this.queue.length) this.finishedAt = now;
      return { correct: true, finished: this.finished };
    }
    this.mistakes++;
    return { correct: false, finished: false };
  }
  /** やめる: タイマーを止める（結果としては未完了）。 */
  abort(now) { if (!this.finished) { this.finishedAt = now; this.aborted = true; } }
  /** できた問題の数（正解した数） */
  get solved() { return this.index; }
  /** 全問できたか */
  get allSolved() { return this.index >= this.queue.length; }
  elapsedMs(now) {
    if (this.startedAt === null) return 0;
    return Math.max(0, (this.finishedAt ?? now) - this.startedAt);
  }
}

/** ms → 「1ぷん 05びょう」形式の表示用文字列（びょうは小数 1 けた）。 */
function formatTime(ms) {
  const tenths = Math.floor(Math.max(0, ms) / 100); // 0.1 秒の切り捨て
  const min = Math.floor(tenths / 600);
  const secStr = ((tenths % 600) / 10).toFixed(1);
  return min > 0 ? `${min}${minUnit(min)} ${secStr}びょう` : `${secStr}びょう`;
}

/** 問題画面のタイマー用: 秒だけ（0.1 秒の切り捨て）。formatTime と丸めをそろえる。 */
function formatSeconds(ms) {
  return (Math.floor(Math.max(0, ms) / 100) / 10).toFixed(1);
}

/** 「ふん」「ぷん」の読み分け。一の位が 2・5・7・9 なら「ふん」、それ以外は「ぷん」（1ぷん 2ふん 10ぷん）。 */
function minUnit(min) {
  return [2, 5, 7, 9].includes(min % 10) ? 'ふん' : 'ぷん';
}

/** 結果画面用の「N もん中 M もん できた」文言。全問なら「ぜんぶ できた！」。 */
function solvedText(solved, total) {
  return solved >= total ? 'ぜんぶ できた！' : `${total}もん中 ${solved}もん できた`;
}

g.CalcCards = Object.assign(g.CalcCards, {
  MAX_DIGITS, shuffle, toProblem, filterByDan, buildQueue, isCorrect,
  pressDigit, backspace, Session, formatTime, formatSeconds, minUnit, solvedText,
});
})(globalThis);
