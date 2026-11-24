# けいさんカード

小学1年生向けの計算カード練習アプリ。素の HTML / CSS / JavaScript だけの静的サイトで、ビルドは不要です。

## あそびかた

1. メニューで けいさん の しゅるい を えらぶ
   （たしざん 10まで / ひきざん 10まで / くりあがり / くりさがり / くく）
2. くく は「なんのだん？」（1〜9のだん / ぜんぶ）を えらぶ（1×1〜9×9 の 81 問。×10 のカードは入れていません）
3. 「じゅんばん」か「ランダム」を えらぶ → 「スタート」
4. 画面の大きなキーで こたえを 入れて「こたえる」
   - まちがえると 入力欄が 赤くゆれて、おなじ もんだいを やりなおし（まちがえた数を カウント）
   - ぜんぶ 正解すると タイマーが止まり、かかった時間・まちがえた数が出ます
   - 途中で「やめる」を 押すとタイマーが止まり、そこまでの結果（かかった時間・できた数・まちがえた数）が出ます
   - パソコンでは 数字キー・Enter・Backspace も使えます

問題の集合と並び順は ちびむすドリル（幼児の学習素材館, happylilac.net）の各カードPDFに合わせています
（出典URLは `js/problems.js` に記載）。

## ローカルで動かす

`index.html` をブラウザで直接開く（`file://`）だけで動きます。`type="module"` を使わず、`problems.js` → `logic.js` → `app.js` の順に classic script として読み込んでいます。
HTTP サーバー経由で確認したいときは次のとおり。

```sh
python3 -m http.server 8000   # http://localhost:8000/
```

## テスト

```sh
node --test      # 依存パッケージなし（Node 18+）
```

## GitHub Pages で公開

1. このリポジトリを GitHub に push する
2. GitHub の **Settings > Pages** を開く
3. **Source: Deploy from a branch**、**Branch: `main` / `/ (root)`** を選んで Save
4. 数分後に `https://<ユーザー名>.github.io/<リポジトリ名>/` で公開される

パスはすべて相対パスなので、サブパス配信でもそのまま動きます。`.nojekyll` を置いてあります。

## 構成

- `index.html` / `css/style.css` — 画面
- `js/app.js` — 画面の制御（DOM）
- `js/logic.js` — 出題・判定・時間の計算（DOMなし、テスト対象）
- `js/problems.js` — 問題データ
- どちらも `globalThis.CalcCards` に公開。テストは `tests/load.mjs` が `node:vm` で読み込む
- `tests/` — `node:test` のテスト
