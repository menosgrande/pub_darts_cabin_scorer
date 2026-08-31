# 🎯 Pub Darts Cabin Scorer

パブ・キャビン設置を想定した、ブラウザだけで動くダーツスコアラーです。サーバー不要・ビルド不要。

- **`index.html`を直接ダブルクリックして開く(`file://`)だけでも、ダーツのスコアリング機能そのものは全て動きます**
- ただし**Service Worker(オフラインキャッシュ)はブラウザの制約上`file://`では動作しません**。GitHub Pages等のHTTP(S)環境に配置した場合のみ、ホーム画面追加・オフライン起動を含むPWA機能がフルに使えます

## 特徴

- **3ゲームモード**: 01ゲーム / Count-Up / クリケット
- **クイックスタート**: セットアップ画面から「501」「CRICKET」「COUNT-UP」をワンタップで即開始（1P/2P/CPUの選択はそのまま尊重）
- **CPU対戦**: EASY〜PRO の4段階の難易度でAIと対戦可能。DARTSLIVEの公式レーティング表を参考に、それぞれ概ねレーティング5/7/10/14相当になるよう較正。HARD/PROはトリプル20を軸に狙い、外れた場合は隣接するシングルに逸れやすい（ダブルへの誤射は現実的な頻度に抑制）。CPUの投擲は人間のタップ入力と同じく1投ずつ盤面に反映され、効果音も1投ごとに鳴る（3投を待って一括表示はしない）
- **チェックアウトアシスト**: 01ゲームで残り点数に応じた標準アレンジ（チェックアウトルート）を自動表示。さらに「あと1投で上がれる」状態になると、該当するダブル/トリプル/Bullのセグメントが盤面上で緑白く光ります（OUT設定に応じて対象リングを自動判定）。直接上がれない残り点数のときは、最後の1投ならS/D/T全ナンバー＋Bullから最良のリーブを全探索、それより前の投擲では高得点トリプル＋Bullを中心に「次のチェックアウトに繋がりやすいリーブ」を提案します
- **ハンディキャップ（2方式、1Pソロ時は自動的に無効）**:
  - 手動: 01は開始点数を個別に微調整。クリケットはハンデを受け取る側を1人選び、20〜15の各ナンバーに0〜3マークを個別指定＋直接加算得点も設定可能
  - オート(DARTSLIVE2準拠): レーティング差を入力するだけで、公式のハンデ表に基づいて自動計算（01は開始点数、クリケットは頭出しマーク＋ボーナス得点）
- **ラウンド上限**: 01・クリケット共通で試合の長さを10/15/20/30ラウンドから選択可能
- **PREV（巻き戻し）**: 直前のターンを取り消し可能。MISS/UNDO/CLEARとは視覚的に分離した独立ボタン（決着後のリザルト画面表示中は不可）
- **ダーツマーカーの色分け**: 盤面に刺さったダーツを1投目=青①、2投目=緑②、3投目=赤③で色分け表示。編集中のダーツは金色の縁取りで区別
- **自動セーブ / RESUME**: 対戦中にブラウザを閉じても、24時間以内ならセットアップ画面の「RESUME」から続きを再開できます
- **通算成績の記録・閲覧**: ゲーム終了ごとに勝敗・PPD（01/Count-Up）・MPR（クリケット）・上がり率などを自動で記録。セットアップ画面の「📊 通算成績を見る」からプレイヤーごとの集計と直近15試合を確認できます（進行中セーブとは別のストレージに保存。確認付きでリセットも可能）
  - PPD・MPRには「そのゲーム1試合だけの値」と「通算（複数試合をまとめた値）」の2種類があります。**通算値は各試合のPPD/MPRを単純平均するのではなく、`総得点 ÷ 総ダーツ本数`（PPD）、`総マーク数 ÷ 総ラウンド数`（MPR）という重み付け平均で計算しています**（ダーツ数・ラウンド数が少ない試合と多い試合が同じ重みにならないようにするため）。「ベストPPD/ベストMPR」は試合単位の最大値です
  - 1試合分のPPD = `(開始点数 − 最終残り点数) ÷ 投げたダーツ本数`（01）、または`累積得点 ÷ 投げたダーツ本数`（Count-Up）。いずれもバーストしたラウンドの投擲も分母（本数）に含みます
  - 上がり率 = `実際に残り0まで到達して終えたゲーム数 ÷ 参加した01ゲーム数`。ラウンド上限による「残り点数が少ない方の勝ち」で勝利した場合はカウントされません（0に到達していないため）。つまり「勝率」とは別の指標です
  - 1試合分のMPR（クリケット） = `そのゲームで有効化した通算マーク数 ÷ ラウンド数`（1ナンバーあたり最大3マークで頭打ち）
- **離脱確認**: 対戦中にタブを閉じよう/リロードしようとすると、ブラウザ標準の確認ダイアログが出ます（セットアップ画面や決着後は対象外）
- **リザルト画面から2方向**: 「PLAY AGAIN」で同条件即再戦、「Change Settings」でセットアップに戻って条件を変更
- **Fliqloスタイルのフリップ表示**、暗所でも見やすいダークUI
- **PWA対応**: ホーム画面に追加してアプリのように起動、オフラインでも動作。iPhoneのノッチ/Dynamic Island対応済み（safe-area-inset）

## 使い方

1. `index.html` をブラウザで開く（`file://`直接でもスコアリング自体は動作。PWA/オフラインキャッシュまで使うにはGitHub Pages等のHTTP(S)ホスティングに配置）
2. セットアップ画面は上から「PLAYERS」→「QUICK START」→「GAME MODE」→「RULES」→「OK」の順。とりあえず遊びたいだけならプレイヤー数を選んでクイックスタートの「501」（Open Out）「CRICKET」「COUNT-UP」のいずれかを押すだけでOK
3. 盤面を直接タップするか、テンキーで入力。S / D / T で シングル・ダブル・トリプルを選んでから数字をタップ
4. 3投終わったら OK で確定、NEXT で次のプレイヤーへ（ボタン下に「いま何が起きるか」の説明が出ます）

### 操作の補足

| 操作 | 説明 |
|---|---|
| 入力 | 盤面タップ or テンキー。ダーツスロットをタップすると上書き編集も可能 |
| UNDO | 直近の1投を取り消し |
| CLEAR | 現在のターンを全消去 |
| PREV TURN | 直前のターンに巻き戻し（throwing中は2回押しで確認「SURE?」、next中は1回で即戻り。リザルト画面表示中は不可）。誤操作防止のためMISS/UNDO/CLEARとは視覚的に区切って配置 |
| CPU対戦 | PLAYERSセクションで🤖CPUをON、難易度をEASY〜PROから選択 |

盤面はネイティブのピンチズーム・パンをそのまま許可しています（`touch-action: manipulation`）。誤ってダーツが刺さらないよう、指の移動距離が一定以上ある操作（スワイプ・ピンチ）はタップとして扱わない判定を入れています。

## 対応ゲームモード

- **01ゲーム**: 301/501/701/901/1101などから開始し、0を目指す定番ルール。ダブルアウト/シングルアウト/マスターアウト、Bull 25/50・50/50 の切り替えに対応
- **Count-Up**: 3投×Nラウンドの合計得点を競うモード
- **クリケット**: 15〜20とBullをクローズしていく標準クリケットルール

## ハンディキャップについて

01・クリケットどちらも「RULES」セクション内で MANUAL / AUTO (DL2) を切り替えられます（1Pソロプレイ時はセクションごと非表示、内部的にもハンデ計算を無視します）。

- **MANUAL**:
  - 01: 開始点数をP1/P2それぞれ±10で調整
  - クリケット: 20・19・18・17・16・15・BULLを中央の凡例として1列に並べ、その両脇にP1（左）・P2（右）それぞれの＋/－ボタンを配置。各ナンバー0〜3マークをP1/P2独立して指定でき（両方に付けることも可能）、得点の直接加算（+8刻み）も左右それぞれ設定できます
- **AUTO (DL2)**: DARTSLIVE2公式のハンデ表に基づく自動計算。P1/P2のレーティング（0〜17、1刻み、デフォルト6）を入力するとレーティングが低い方だけ自動でハンデが付与される
  - 01: 持ち点は301/501/701のいずれかを選択している必要があります（DL2の公式表がこの3種のみに対応）
  - クリケット: レーティング差1〜17（整数、小数点以下切り捨て）に応じて18・17・16・15に頭出しマーク＋ボーナス得点を付与。20・19・Bullには影響しません

レーティング入力は01・クリケットで共用です（実際のDARTSLIVEは種目別レーティングですが、入力欄を増やしすぎないための簡略化）。

## 技術スタック

- React 18（UMD ビルドをローカル同梱、ビルドステップなし）
- Vanilla JavaScript + Tailwind CSS
- Inter フォント（700/900のみ自前ホスティング。端末ごとにシステムフォントがバラつく問題を解消。日本語部分は引き続きOS標準フォント）
- LocalStorage による対戦状態の自動保存・復元
- PWA対応（manifest + Service Worker、ホーム画面追加・オフライン起動可）
- 外部CDN依存なし・依存パッケージなし・サーバー不要（フォルダごと静的配信するだけ）

## ファイル構成

```
index.html   エントリーポイント（PWA対応: manifest/SW登録込み。js/を依存順に読み込む）
js/          アプリ本体（機能単位で分割。非モジュールscriptなので読み込み順が重要）
  constants.js      ゲーム全体の定数
  checkout.js       チェックアウトルート探索、盤面座標変換など共通基盤
  scoring.js        リーブの質評価、アシストバー文言生成
  cpu.js            CPU難易度パラメータ、CPUの投擲戦略
  ui-components.js  共有UIコンポーネント（Icons、Fliqlo風フリップ時計、スコアボード）
  camera/           カメラ自動採点モード関連（ゲームロジック本体からは独立した入力アダプター）
    camera-input.js   CameraInputPanel/CameraSlot（1〜2台のカメラ映像表示・デバイス選択。ダーツ検出は未実装）
    calibration.js    手動4点キャリブレーション・ホモグラフィ計算（computeHomography/applyHomographyは純粋関数、テスト済み）
  hooks/            app-main.jsから責務ごとに抽出したカスタムフック（分割計画はSTATE_MANAGEMENT.md参照）
    useSound.js       効果音・触覚フィードバック。Source of Truthに非依存で完全に自己完結
  components/       app-main.jsから抽出した純粋な表示コンポーネント（分割計画はSTATE_MANAGEMENT.md参照）
    HowToModal.js     クイックヘルプモーダル
    ExitConfirmModal.js  ゲーム終了確認モーダル
    StatsModal.js     通算成績モーダル（localStorage読み込み・集計呼び出しはこのコンポーネント内）
  game/             Save/Restoreの純粋変換処理・ラウンド結果計算（分割計画はSTATE_MANAGEMENT.md参照）
    save-utils.js     makePlayer/sanitizeRestoredPlayer/migrateSaveData。React State/localStorageには非依存
    round-commit.js   computeRoundResult。Human/CPU共通のラウンド採点→node生成→players更新→勝敗判定→ラウンド上限判定
  app-main.js       Reactアプリ本体（State、イベントハンドラ、JSX）
style.css    カスタムスタイル（Fliqlo風フリップ表示、Interフォント読み込みなど）
tailwind.css Tailwind CSS
manifest.json PWA用マニフェスト（ホーム画面追加・standalone表示）
sw.js        Service Worker（オフラインキャッシュ。更新時はCACHE_VERSIONを上げる）
icons/       PWAアイコン（192/512/512maskable/apple-touch-icon）
vendor/      React 18 UMDビルド + Interフォント(700/900)をローカル同梱（CDN非依存・完全オフライン対応）
STATE_MANAGEMENT.md  状態管理の設計原則・リファレンス
tests/       Node組み込み(node:test)によるゲームロジックの自動テスト。外部依存なし
  load-game-logic.js       vmモジュールでjs/内の実ファイルをそのまま読み込むテスト用ローダー
  getThrowFromCoords.test.js  盤面のリング/セグメント境界値テスト
  getRoundState.test.js       01のBUST/Double・Single・Master Out判定テスト
  cricket.test.js             クリケットのマーク・オーバーフロー判定テスト
  findHighScorePlan.test.js   チェックアウトアシスト探索のテスト
  gameStats.test.js           通算成績の集計ロジックのテスト
  calibration.test.js         カメラキャリブレーション(ホモグラフィ計算)のテスト
  integration.test.js         関数横断の統合テスト(ハイライト/アシスト提案が実際にfinishするかを全パターン検証)
  saveUtils.test.js           Save/Restoreの純粋変換処理(makePlayer/sanitizeRestoredPlayer/migrateSaveData)のテスト
  cpu.test.js                 CPU AIの純粋関数テスト(決定論的テスト/不変条件テスト/契約テストの3層構成)
  roundCommit.test.js         computeRoundResult(Human/CPU共通のラウンド結果計算)のテスト。fat Bull + Double Outの回帰ケースを含む
package.json テストランナー起動用（`npm test`）。アプリ本体はビルド不要・依存パッケージなしのまま
```

`js/`内は依存順に読み込む必要があります（`index.html`に記載の順序を変えないこと）:
`constants.js` → `checkout.js` → `game/save-utils.js` → `game/round-commit.js` → `scoring.js` / `cpu.js`（どちらもcheckout.jsに依存、互いには非依存） → `ui-components.js` → `camera/camera-input.js` → `camera/calibration.js` → `hooks/useSound.js` → `components/HowToModal.js` → `components/ExitConfirmModal.js` → `components/StatsModal.js` → `app-main.js`

## 開発メモ

状態管理の設計原則（Source of Truth、PREVの巻き戻し範囲、セーブデータのバージョニング方針、DARTSLIVE2ハンデ表の出典、既知のバグと教訓など）は [`STATE_MANAGEMENT.md`](./STATE_MANAGEMENT.md) にまとめています。改修時はまずそちらをご参照ください。

### テスト

盤面判定・BUST/OUT判定・チェックアウトアシスト・通算成績の集計ロジックなど、ゲームロジック部分は`tests/`配下にNode組み込みの`node:test`でテストがあります。外部の依存パッケージは不要です。

```bash
npm test
# または
node --test tests/*.test.js
```

`tests/load-game-logic.js`が`vm`モジュールで`js/`内の実ファイル（`constants.js`/`checkout.js`/`scoring.js`）をそのまま読み込む方式のため、テスト用にロジックを書き写す作業は発生しません。UI部分（`app-main.js`/`ui-components.js`/`cpu.js`）はReact・DOMに依存するためテスト対象外です。
