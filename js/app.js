// 画面制御（DOM 担当）。出題ロジックは logic.js に分離。classic script（problems.js → logic.js の後に読む）。
(function () {
const { SETS, buildQueue, Session, pressDigit, backspace, formatTime, formatSeconds, solvedText } = window.CalcCards;

const $ = (id) => document.getElementById(id);
const screens = ['menu', 'dan', 'mode', 'ready', 'play', 'result'];
const SYMBOL = { '+': '＋', '-': '−', '×': '×' };

let choice = { set: null, dan: null, mode: null };
let session = null;
let buf = '';
let timerId = null;

const HEADINGS = { menu: 't-menu', dan: 't-dan', mode: 't-mode', ready: 't-ready', result: 't-result' };

// 画面を切り替えた直後の押しまちがい（連打・二度押し）を防ぐ
const GUARD_MS = 400;
let shownAt = 0;

// 花丸は 1 つの要素を使い回す。次の正解で出し直すので、重ならず溜まらない。表示中も入力は止めない
const HANAMARU_MS = 700;
let hanamaruTimer = null;
function hideHanamaru() {
  clearTimeout(hanamaruTimer);
  $('hanamaru').hidden = true;
}
function showHanamaru(anchor, size) {
  const el = $('hanamaru');
  const r = anchor.getBoundingClientRect();
  hideHanamaru();
  void el.offsetWidth; // hidden を挟んで再始動するため、いったん描画を確定させる
  el.style.setProperty('--hm-size', `${size}px`);
  el.style.left = `${r.left + r.width / 2}px`;
  el.style.top = `${r.top + r.height / 2}px`;
  el.hidden = false; // display:none から戻すので、アニメーションは最初から再生される
  hanamaruTimer = setTimeout(hideHanamaru, HANAMARU_MS); // reduced-motion では静止表示のままなのでタイマーで消す
}
function hanamaruSize(ratio) {
  return Math.round(Math.min(innerWidth, innerHeight) * ratio);
}

function show(name) {
  shownAt = performance.now();
  hideHanamaru();
  for (const s of screens) $(`screen-${s}`).hidden = s !== name;
  // 画面を変えたら見出しへフォーカス（読み上げ・キーボード操作のため）。問題画面はキーパッドを使うので対象外
  const h = HEADINGS[name] && $(HEADINGS[name]);
  if (h) h.focus({ preventScroll: true });
}

function summary() {
  const t = SETS[choice.set].title;
  const dan = choice.set === 'kuku' ? (choice.dan === 'all' ? '　ぜんぶ' : `　${choice.dan}のだん`) : '';
  const mode = choice.mode === 'order' ? '　じゅんばん' : choice.mode === 'random' ? '　ランダム' : '';
  return `${t}${dan}${mode}`;
}

function chooseSet(key) {
  choice = { set: key, dan: null, mode: null };
  if (key === 'kuku') show('dan');
  else toMode();
}
function toMode() {
  $('mode-summary').textContent = summary();
  show('mode');
}
function chooseMode(mode) {
  choice.mode = mode;
  $('ready-summary').textContent = summary();
  show('ready');
}

function stopTimer() { clearInterval(timerId); timerId = null; }

function start() {
  const queue = buildQueue(choice.set, { mode: choice.mode, dan: choice.dan });
  session = new Session(queue);
  buf = '';
  session.start(performance.now());
  show('play');
  renderQuestion();
  $('timer').textContent = '0.0';
  stopTimer();
  timerId = setInterval(() => {
    $('timer').textContent = formatSeconds(session.elapsedMs(performance.now()));
  }, 100);
}

function renderQuestion() {
  const p = session.current;
  $('question').textContent = `${p.a} ${SYMBOL[p.op]} ${p.b} ＝`;
  $('progress').textContent = `${session.index + 1} / ${session.total}もん`;
  renderAnswer();
}
function renderAnswer() {
  const el = $('answer');
  el.textContent = buf;
  el.classList.remove('wrong');
  $('hint').textContent = '';
}

function press(key) {
  if (!session || session.finished) return;
  if (key === 'back') buf = backspace(buf);
  else if (key === 'enter') return submit();
  else buf = pressDigit(buf, key);
  renderAnswer();
}

function submit() {
  if (buf === '') return;
  const r = session.submit(buf, performance.now());
  if (r.correct) {
    buf = '';
    if (r.finished) {
      finish();
      showHanamaru($('app'), hanamaruSize(0.7)); // 切り替え後に出さないと隠れる。見出しは上端に近く欠けるので画面中央
      return;
    }
    renderQuestion();
    showHanamaru($('question'), hanamaruSize(0.5));
  } else {
    // まちがい: 赤くゆらして、入力をクリア。同じ問題のまま。
    const el = $('answer');
    buf = '';
    el.textContent = '';
    el.classList.remove('wrong');
    void el.offsetWidth; // アニメーションを再始動
    el.classList.add('wrong');
    $('hint').textContent = 'もういちど！';
  }
}

function finish() {
  stopTimer();
  const aborted = session.aborted;
  $('t-result').textContent = aborted ? 'おつかれさま！' : 'よくできました！';
  $('r-solved').textContent = solvedText(session.solved, session.total);
  $('r-time').textContent = formatTime(session.elapsedMs(performance.now()));
  $('r-miss').textContent = `${session.mistakes}かい`;
  show('result');
}

function quit() {
  if (!session) return show('menu');
  session.abort(performance.now()); // タイマーを止めて、ここまでの結果を出す
  finish();
}

// イベント
document.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  b.blur(); // Space / Enter での二重入力を防ぐ
  if (performance.now() - shownAt < GUARD_MS) return; // 画面が変わった直後は無視
  if (b.dataset.set) chooseSet(b.dataset.set);
  else if (b.dataset.dan) { choice.dan = b.dataset.dan; toMode(); }
  else if (b.dataset.mode) chooseMode(b.dataset.mode);
  else if (b.dataset.key) press(b.dataset.key);
  else if (b.dataset.go) show(b.dataset.go);
  else if (b.id === 'mode-back') show(choice.set === 'kuku' ? 'dan' : 'menu');
  else if (b.id === 'ready-back') show('mode');
  else if (b.id === 'btn-start') start();
  else if (b.id === 'btn-quit') quit();
  else if (b.id === 'btn-again') start();
  else if (b.id === 'btn-menu') show('menu');
});

// ボタンの長押しやダブルタップによるズーム・選択を防ぐ
document.addEventListener('dblclick', (e) => e.preventDefault());
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());

// 物理キーボード（あれば）
document.addEventListener('keydown', (e) => {
  if ($('screen-play').hidden) return;
  if (e.ctrlKey || e.altKey || e.metaKey) return; // Ctrl+1（タブ切り替え）などは無視
  // 日本語入力オンのときは e.key が 'Process' になるので、キーの位置（e.code）から数字を読む
  const m = /^(?:Digit|Numpad)([0-9])$/.exec(e.code || '') || /^([0-9])$/.exec(e.key);
  if (m) { e.preventDefault(); press(m[1]); }
  else if (e.isComposing) return;
  else if (e.key === 'Enter') { e.preventDefault(); press('enter'); }
  else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); press('back'); }
});

show('menu');
})();
