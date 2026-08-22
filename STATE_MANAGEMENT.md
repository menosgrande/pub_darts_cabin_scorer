# State Management Reference

## 設計原則（最重要・まずここだけ読む）

1. **`players` がゲームデータの唯一の真実（Source of Truth）。`activePlayerIndex` が現在位置。** この2つを合わせて初めてゲーム状況が完全に再現できる。
2. **PREVはターン巻き戻し機能であり、状態復元機能ではない。** 「ゲーム履歴を1ターン戻す」以上のことはしない。
3. **`winner` はUI状態であり、ゲーム履歴ではない。** gameover画面を出すためのフラグであって、巻き戻し対象に含めない。
4. **統計（Stats）は派生値として計算する。独立したstateにしない。** `players[].history` から都度 `calculateStats(players)` のように計算する。
5. **再レンダリング後も古いクロージャから読まれる可能性がある値は、必ずRef化する。** `setTimeout`/`setInterval`/`Promise`はその典型だが、`window.addEventListener`や`requestAnimationFrame`など、Reactのレンダリングサイクルの外側で後から呼ばれるものは全て同じ条件に当てはまる。
6. **Save形式を変更するときは必ず `CURRENT_SAVE_VERSION` を上げ、`migrateSaveData` に変換を書く。**
7. **保存・保持するのは一次データだけ。計算可能な値（派生値）は保存しない。** `currentPlayer`・`roundState`・`isBust`・`stats`・`checkoutRoute` のような「`players`から都度計算できる値」は、state化もlocalStorage保存もしない。原則4（統計）はこの一般原則の一例にすぎない。

この7行が、状態一覧の表よりも実際の保守作業では役に立つ。表は「何があるか」、この章は「どう考えるか」。

---

## 状態遷移の全体像

```
[SETUP画面]
    │ START GAME
    ▼
[throwing]  ──OK──▶  [next]  ──NEXT──▶  [throwing] (次プレイヤー)
    │                  │
    │ (チェックアウト/ラウンド上限)
    ▼
[gameover]  ──PLAY AGAIN──▶  [SETUP画面]
```

---

## State 一覧・分類表

### カテゴリ定義
| 記号 | 意味 |
|------|------|
| **設定** | ゲーム開始前に決定、ゲーム中は不変 |
| **ゲーム** | `players`/`activePlayerIndex` のように、それだけでゲーム状況を完全再現できる確定済みコアデータ |
| **一時入力** | まだ確定していない、現在のターンの入力中データ（Transient State） |
| **UI** | 「今何を表示するか」を決める状態。ゲームの再現には不要 |

> `confirmStage` と `winner` は一見「ゲームの一部」に見えるが、どちらも **UI State** に分類している。理由は設計原則1〜3を参照。`players` と `activePlayerIndex` だけでゲーム状況は完全に再現できるのに対し、これらは「今どの画面/オーバーレイを出すか」を制御するための状態だから。

> `currentThrows` は「ゲームState」と「UI State」のどちらでもなく、**一時入力（Transient State）として独立カテゴリ**にしている。`players`/`activePlayerIndex`のような確定済みデータでもなく、`confirmStage`のような画面制御フラグでもない。「まだコミットされていない、今のターンの入力中の投擲」という第三のカテゴリ。`handleRestoreSave` や `handleUndoCommittedTurn` を触るときに「これもゲーム履歴の一部では？」と誤解しやすいので、ここで明確に切り分けておく。

---

### 設定 State（ゲーム開始時に確定）

| State | 型 | デフォルト | localStorage保存 | Ref同期 | PREV対象 |
|-------|----|-----------|-----------------|---------|---------|
| `gameMode` | `"01"\|"countup"\|"cricket"` | `"01"` | ✅ | ✅ `gameModeRef` | ❌ |
| `playerCount` | `1\|2` | `2` | ✅ | ✅ `playerCountRef` | ❌ |
| `cpuMode` | `boolean` | `false` | ✅ | ❌ | ❌ |
| `cpuDifficulty` | `string` | `"medium"` | ✅ | ✅ `cpuDifficultyRef` | ❌ |
| `p1StartScore` | `number` | `501` | ✅（players経由） | ❌ | ❌ |
| `p2StartScore` | `number` | `501` | ✅（players経由） | ❌ | ❌ |
| `manualCricketMarksP1` | `{20,19,18,17,16,15,25: number}` | 全0 | ❌（セットアップ画面専用の一時state） | ❌ | ❌ |
| `manualCricketMarksP2` | `{20,19,18,17,16,15,25: number}` | 全0 | ❌（同上） | ❌ | ❌ |
| `manualCricketBonusP1` | `number` | `0` | ❌（同上） | ❌ | ❌ |
| `manualCricketBonusP2` | `number` | `0` | ❌（同上） | ❌ | ❌ |
| `cricketHandicapEditTarget` | `"p1"\|"p2"` | `"p1"` | ❌（UI表示専用。ゲームロジックには影響しない） | ❌ | ❌ |
| `autoHandicap01` | `"off"\|"dl2"` | `"off"` | ❌（セットアップ画面専用の一時state） | ❌ | ❌ |
| `autoHandicapCricket` | `"off"\|"dl2"` | `"off"` | ❌（同上） | ❌ | ❌ |
| `p1Rating` | `number` | `6` | ❌（同上・01/クリケットで共用） | ❌ | ❌ |
| `p2Rating` | `number` | `6` | ❌（同上） | ❌ | ❌ |

> **クリケットの手動ハンディキャップ（改訂版v3）**: v1「1人選んでハンデ」→v2「P1/P2を表形式で同時表示」ときて、「ボタンが小さすぎて押せない」というフィードバックでv3に刷新。データ構造（`manualCricketMarksP1`/`P2`, `manualCricketBonusP1`/`P2`）自体はv2から変更なし（両者が独立してハンデを持てる）。変わったのはUIのみ：7列×2行を同時表示する代わりに、`cricketHandicapEditTarget`("p1"|"p2")というUI専用stateで「今どちらを編集中か」を切り替え、1人分の7列だけを大きなボタン（列幅いっぱいの縦積み▲▼）で表示するようにした。**教訓**: 密なグリッドで「情報を全部同時に見せる」よりも「タブ切り替えで1つずつ大きく操作できる」方が、タッチ操作の実用性では勝ることが多い。データの独立性（両者が同時にハンデを持てる）とUI表示の同時性（両者を同時に画面に出す）は別の設計判断であり、後者だけを妥協しても前者は失われない。

> **01のオートハンデ（DARTSLIVE2準拠）**: `autoHandicap01`("off"|"dl2") / `p1Rating` / `p2Rating` はセットアップ画面専用の一時state。`p1StartScore`/`p2StartScore` と同じ設計方針で、ゲーム開始時に `computeAuto01Scores()` がレーティング差から実際の開始点数を算出して `players[].initialScore` に焼き込むだけで、rating自体はセーブ対象に含めない（ゲーム開始後は `initialScore` が唯一のsource of truthで、rating入力は再現不要）。出典は DARTSLIVE公式サポート記事の添付PDF（301/501/701/901/1101/1501 × レーティング差0.5刻み〜8.5以降プラトー）。表自体は0.5刻みだが、UI上は0.5刻みの差が体感できないとの判断で1刻みのステッパーに簡略化した（`getDartslive2_01Handicap`/`getDartslive2CricketHandicap` 側は引き続き0.5刻みの入力にも対応できる作りのまま。UI側の制約であって計算ロジックの制約ではない）。

> **クリケットのオートハンデ（DARTSLIVE2準拠）**: `autoHandicapCricket`("off"|"dl2") で手動(`manualCricketMarksP1`/`P2`, `manualCricketBonusP1`/`P2`)と切り替え。DL2モードは `p1Rating`/`p2Rating`（01と共用）の差から `getDartslive2CricketHandicap(diff)` が `{marks, bonus}` を返す。出典はユーザー提供の画像（レーティング差1〜17の整数のみ、小数点以下切り捨て）: 18→17→16→15の順に1マーク→2マークを積み、diff=8で全4ナンバーが2マーク（3マーク＝完全クローズには到達しない）、diff=9以降はマークが増えずボーナス得点のみ加算される。ボーナス得点は `makePlayer` の第6引数 `initialCricketScore` として `cricketScore` の初期値に反映（`cricketScore: initialCricketScore || 0`）。手動モードとDL2モードは相互排他で、`computeCricketSetup()` が両方のケースを吸収して呼び出し側を単純にしている。DL2は20・19・Bullが対象外（手動は20・19・Bullすべて対象）。

> **1Pソロ時のハンデ非表示**: `playerCount === 1` は「対戦相手が存在しない」ことを意味する（CPU ONの場合は必ず`playerCount`が2に強制されるため、1のときは常にソロ）。この状態ではハンデ比較の対象がいないため、`computeAuto01Scores()`/`computeCricketSetup()`はどちらも`playerCount === 1`を最優先でチェックし、2P時に設定した値が残っていても常にハンデを無視する。UI側（HANDICAPセクション）も同条件で非表示にしているが、**計算ロジック側でも独立してガードしている**点が重要（UIを消しただけでは、既にセットされたstateが計算に使われ続けてしまうバグを防ぐため）。

> **セットアップ画面の表示言語**: GAME SETUPモーダル（PLAYERS/QUICK START/GAME MODE/RULES）の可視文字列は英語で統一している。日本語コメントはソース内にそのまま残しているが、それはUIには出力されない。個別のヘルプパネル（HOW TO / `showHowTo`）は別途 `helpLang`("ja"|"en") で言語切り替え可能な独立した仕組みなので、混同しないこと。
| `outMode` | `string` | `"single"` | ✅ | ✅ `outModeRef` | ❌ |
| `checkoutPref` | `string` | `"double"` | ✅ | ❌ | ❌ |
| `bullType` | `string` | `"separate"` | ✅ | ✅ `bullTypeRef` | ❌ |
| `cuRounds` | `number` | `8` | ✅ | ✅ `cuRoundsRef` | ❌ |
| `maxRounds` | `number\|null` | `30` | ✅ | ✅ `maxRoundsRef` | ❌ |
| `helpLang` | `"ja"\|"en"` | `"ja"` | ✅ | ❌ | ❌ |
| `soundEnabled` | `boolean` | `true` | ❌ | ❌ | ❌ |

---

### ゲーム State（players/activePlayerIndexだけで再現可能な確定済みコアデータ）

| State | 型 | デフォルト | localStorage保存 | Ref同期 | PREV対象 |
|-------|----|-----------|-----------------|---------|---------|
| `players` | `Player[]` | 初期配列 | ✅ | ✅ `playersRef` | ✅ snap保存 |
| `activePlayerIndex` | `0\|1` | `0` | ✅ | ✅ `activePlayerIndexRef` | ✅ snap保存 |
| `turnHistoryState` | `Snap[]` | `[]` | ✅ | ❌ | — |

---

### 一時入力 State（Transient State。まだ確定していない現ターンの入力）

| State | 型 | デフォルト | localStorage保存 | Ref同期 | PREV対象 |
|-------|----|-----------|-----------------|---------|---------|
| `currentThrows` | `Throw[]` | `[]` | ✅ | ✅ `currentThrowsRef` | ❌（PREV時に`[]`固定） |
| `padMultiplier` | `1\|2\|3` | `1` | ✅ | ❌ | ❌ |
| `editingThrowIndex` | `number\|null` | `null` | ✅ | ❌ | ❌（PREV時にnull固定） |

> これらは「OK確定（`handleCommitRound`）」が起きるまで `players` には反映されない、ターン進行中だけ存在するデータ。確定済みの`players`とは別物として扱う。

---

### UI State（表示制御。ゲームの再現には不要）

| State | 型 | デフォルト | localStorage保存 | PREV対象 | 備考 |
|-------|----|-----------|-----------------|---------|------|
| `confirmStage` | `"throwing"\|"next"\|"gameover"` | `"throwing"` | ✅ | ❌（PREV時に`"throwing"`固定） | 「今どの画面/操作待ち状態か」を表すだけ。ゲームルールではない |
| `winner` | `object\|null` | `null` | ✅ | ❌（PREV時にnull固定） | UI Stateだが**リロード後もgameover画面を維持するため**保存する。gameover中はPREV不可なのでnull固定で整合 |
| `undoConfirmStage` | `string` | `"idle"` | ❌ | ❌ | |
| `showSettingsSetup` | `boolean` | `true` | ❌ | ❌ | |
| `showExitConfirm` | `boolean` | `false` | ❌ | ❌ | |
| `showQuitConfirm` | `boolean` | `false` | ❌ | ❌ | |
| `showHowTo` | `boolean` | `false` | ❌ | ❌ | |

---

## PREV（turnHistoryState）の設計方針

### CLEARとPREVは完全に別の責務を持つ（コマンド分離モデル）

この分離が崩れると「点数が戻らない」「戻りすぎる」という体感バグが即発生する。
**不変条件として守ること：`turnHistoryState` に触れる操作は `handleUndoCommittedTurn`（PREV）のみ。**

| 操作 | 実装関数 | turnHistoryState | players | confirmStage | 一言 |
|------|---------|-----------------|---------|--------------|------|
| CLEAR | `handleFlushRound` | **触れない** | **触れない** | `"throwing"` に戻す | 入力バッファのリセットのみ |
| PREV | `handleUndoCommittedTurn` | **pop する** | スナップから復元 | `"throwing"` に固定 | 唯一の履歴消費点 |

**CLEARは「未確定入力状態への遷移」であり、コミット済み状態は一切変更しない。**
`confirmStage === "next"` 中にCLEARを押しても、`players` のスコアはOK時点の確定値のまま残る。
これは「キャンセル」ではなく「入力バッファを空にしてthrowingに戻る」操作であり、
ターンごとスコアを取り消したい場合はPREVを使うというUIルール上の役割分担がある。

**なぜ以前CLEARがturnHistoryStateを消費していたか（歴史的経緯）：**
旧設計では `confirmStage === "next"` 中のCLEARを「ターン取り消し」として扱い、
スナップからplayersを復元していた。これが「OK→CLEAR→PREV」で想定より戻りすぎる体感バグの根本原因となった。
現在はこの分岐を削除し、CLEARは`confirmStage`に関係なく常に入力バッファのみをクリアする。

### PREVは状態復元機能ではない。PREVはターン巻き戻し機能である。

この一文を覚えておくと、将来「モーダルも戻そう」「編集状態も戻そう」という誘惑を防げる。
PREVが担当するのは **ゲーム履歴（`players` / `activePlayerIndex`）の1ターン巻き戻し** だけで、
UI状態（`winner` / `confirmStage` / オーバーレイ表示）の巻き戻しはそもそも担当しない。

### snap に保存するもの
```js
{
  players: cloneDeep(players),   // ターン前のスコア・履歴
  activePlayerIndex,             // ターン前の手番
}
```
以前は `confirmStage: "throwing"` も含めていたが、どこからも読まれない実質ダミー値だったため削除した（コード側も対応済み）。
PREV復元後の `confirmStage` は常に `setConfirmStage("throwing")` で固定するので、snap側に持つ必要がない。
将来 snap にフィールドを追加する場合は、「復元時に実際に読むか」を先に確認すること。読まないなら持たない。

### snap に保存しないもの・PREV時の扱い

| State | PREV時の扱い | 理由 |
|-------|------------|------|
| `winner` | `null` 固定 | gameover中はPREV不可なので常にnull。UI状態履歴は持たない |
| `confirmStage` | `"throwing"` 固定 | 直前ターンへの巻き戻しなので常にthrowing |
| `currentThrows` | `[]` 固定 | 投擲入力中でも直前ターンへ戻す |
| `editingThrowIndex` | `null` 固定 | 編集状態を引き継がない |
| `padMultiplier` | そのまま維持 | 入力補助UIでゲーム状態に影響しない |

将来 winner表示中にPREVを許可する要望が出た場合も、snapにUI状態を追加するのではなく、
まず `confirmStage` の遷移設計そのものを見直すこと（「PREVの対象を広げる」のではなく「gameoverに入る前のタイミングを変える」方向で検討する）。

### turnHistoryState はゲームの真実ではない

`turnHistoryState` はUX用の巻き戻し履歴であり、`players`（ゲームの唯一の真実）の正史ではない。
**保持上限は20ターン**（`.slice(-20)` でCPU・人間の両経路に実装済み）。

この上限は「メモリ/localStorageサイズの節約」のためだけにあり、ゲームルールとは無関係。
将来この値を変更する場合（例: `.slice(-50)` や無制限に戻す）は、必ずこのドキュメントの数値も同時に更新すること。
逆にここが更新されていない `.slice(-N)` を見つけたら、コードとドキュメントのどちらかが古い可能性がある。

---

## Ref 同期ルール

**本質は「再レンダリング後も古いクロージャから読まれる可能性がある値はRef化する」こと。**
非同期処理（`setTimeout`/`setInterval`/`Promise`）はこれが起きる典型例だが、唯一の例外ではない。
`window.addEventListener` のイベントハンドラ、`requestAnimationFrame` のコールバック、外部ライブラリへ渡すコールバックなど、
**Reactのレンダリングサイクルの外側で後から呼ばれるあらゆる関数**が同じ問題を持つ。
現状この境界はCPUの `useEffect`（内部で `setTimeout` を使う）だけだが、
将来 `window.addEventListener` や `requestAnimationFrame` を使う機能を追加した場合も、
そこから参照する state は同じ理由でRef化が必要になる。「CPUだから」「非同期だから」ではなく「クロージャの外から呼ばれるから」が条件。

| Ref | 対応 State | 用途 |
|-----|-----------|------|
| `playersRef` | `players` | CPUターンでのスコア参照 |
| `activePlayerIndexRef` | `activePlayerIndex` | CPUの手番確認 |
| `gameModeRef` | `gameMode` | 01 / countup 分岐 |
| `outModeRef` | `outMode` | バースト判定 |
| `bullTypeRef` | `bullType` | チェックアウト計算 |
| `cuRoundsRef` | `cuRounds` | CountUp終了判定 |
| `cpuDifficultyRef` | `cpuDifficulty` | CPUの精度 |
| `playerCountRef` | `playerCount` | 1P/2P終了判定 |
| `maxRoundsRef` | `maxRounds` | 01/クリケット共通のラウンド上限判定 |
| `winnerRef` | `winner` | 二重ゲームオーバー防止 |
| `currentThrowsRef` | `currentThrows` | OK確定時の最新投擲取得 |

---

## localStorage 保存・復元チェックリスト

新しい State を追加するときは以下5点を必ず確認する。

```
1. useState 宣言
2. 再レンダリング後も読まれる可能性がある（Ref化が必要か）→ useRef 宣言 + .current 同期
3. localStorage 保存オブジェクトに追加
4. handleRestoreSave で復元処理を追加
5. PREV対象か？ → 以下の4択のどれかを必ず決める
   a. snap に保存し、PREV復元時に実際に読む
   b. PREV復元時は固定値にリセットする（例: winner→null, currentThrows→[]）
   c. PREVの影響を受けない（設定Stateなど、ゲーム進行と無関係）
   d. まだ決めていない（要注意・後回しにしない）
```

5番目を忘れると今回の `winner` のような問題が起きる。「保存・復元は考えたが、PREVで戻すべきかは考えていなかった」状態を防ぐのが目的。`d`を選んだまま実装を進めないこと。

### 復元時のデフォルト値の選び方

`version` 管理を導入した今は、`||` ではなく `??` を使うことを推奨する。

- `boolean` → `d.field ?? false`
- `string` → `d.field ?? "defaultValue"`
- `number` → `d.field ?? defaultNumber`
- `null許容` → `d.field ?? null`

**`||` は `0` / `false` / `""` を意図せず潰す。** 例えば `maxRounds` が `0`（あり得るなら）を意味のある値として保存していた場合、`d.maxRounds || null` は `0` を `null` に変えてしまう。`??` は `null`/`undefined` のときだけフォールバックするので安全。

> 既存コードに `||` が残っている箇所は、影響範囲を確認しながら段階的に `??` へ置き換えていく。新規追加分は最初から `??` で統一する。

---

## 組み合わせテストマトリクス

| シナリオ | PREV | Save/Restore | CPU | 01ラウンド制限 |
|---------|------|-------------|-----|-------------|
| 01 / 1P / ∞ | — | — | — | — |
| 01 / 1P / 10R | — | — | — | ✅ |
| 01 / 2P / ∞ | ✅ | ✅ | — | — |
| 01 / 2P / 10R | ✅ | ✅ | — | ✅ |
| 01 / CPU / ∞ | ✅ | ✅ | ✅ | — |
| 01 / CPU / 10R | ✅ | ✅ | ✅ | ✅ ← 最重要 |
| CountUp / 1P | — | ✅ | — | — |
| CountUp / 2P | ✅ | ✅ | — | — |
| CountUp / CPU | ✅ | ✅ | ✅ | — |

**優先テストケース（01 / CPU / ラウンド制限）**

最初に置くべきは単体のPREVではなく、**PREVとCPUの往復**。実際に壊れるのはPREV単体ではなく、CPUとPREVが交互に発生するケースだから。

1. **CPU戦 → PREV → CPU戦 → PREV → CPU戦**（往復で `cpuTimerRef` / `turnHistoryState` / `winner` / `confirmStage` が壊れないか）← 最優先
2. CPU戦 → CPUターン中に PREV → 再開後の手番が正しいか
3. 301 / 3R制限 / CPU → 最終ターンCPUがチェックアウト → 正常終了か
4. 301 / 3R制限 / CPU → 最終ターン同点 → DRAW表示か
5. CPU戦 → セーブ → 復帰 → CPUターンが正常発火するか
6. CPU戦 → PREV 20回連打 → それ以上は PREV 不可になるか

---

## CPU Difficulty Parameters

`CPU_DIFFICULTY` は実質的に**ゲーム設定の一部**であり、ロードマップ（将来やること）ではなく現在の仕様として独立章にしている。半年後に難易度を追加・調整するときはここを最初に見ること。

| パラメータ | 意味 | 範囲 |
|-----------|------|------|
| `spread` | 通常ショットの精度を表すパラメータ。数値が大きいほど低精度（具体的な使われ方は `cpuComputeThrow` を参照） | 数値が大きいほど低精度 |
| `dropChance` | 1投ごとの「投げ損ない(MISS)」発生確率（0〜1）。`cpuPlayTurn`のループ内で、対象ダーツ(i)が`dropDarts`範囲に入っているときのみ判定される | 0〜1 |
| `dropDarts` | 1ターン3投のうち、終盤何投が`dropChance`判定の対象になるか。例: `dropDarts=1`なら3投目だけが対象、`dropDarts=2`なら2,3投目が対象。`0`にすると一切ドロップしない | 0〜2 |
| `checkoutHitProb` | チェックアウトルートを狙った際に成功する確率（0〜1）。`findCheckoutRoute`で有効なルートが見つかった場合のみ参照される。失敗時は通常ショット計算にフォールバックする | 0〜1 |

```js
const CPU_DIFFICULTY = {
  easy:   { spread: 55, dropChance: 0.40, dropDarts: 2, checkoutHitProb: 0.10 },
  medium: { spread: 35, dropChance: 0.18, dropDarts: 1, checkoutHitProb: 0.30 },
  hard:   { spread: 20, dropChance: 0.08, dropDarts: 1, checkoutHitProb: 0.60 },
  pro:    { spread: 8,  dropChance: 0.02, dropDarts: 0, checkoutHitProb: 0.82 },
};
```

**設計原則**: 難易度を表すパラメータは全てこの1オブジェクトに集約する。`hitProbMap` のような別管理のオブジェクトを新設しない。新しいパラメータ（例: 高得点残しを優先する `leaveBias` など）を追加する場合も、必ずこのテーブルの一行として追加し、このドキュメントの表も同時に更新する。

> 将来追加が想定されるパラメータの例: `leaveBias`（フィニッシュしやすい残り点数、例えば170/167/164などへの誘導を優先するか）。easyは「とにかく高得点狙い」、proは「フィニッシュ残しを優先」のような挙動分岐に使える。

---

## 今後の拡張ロードマップ

### 1. セーブデータ migration
`migrateSaveData(save)` の枠を用意済み（`CURRENT_SAVE_VERSION` 定数で管理）。
現在は中身が空（変換不要）。次回 `version` を上げるときは:
1. `CURRENT_SAVE_VERSION` を増やす
2. `switch (v)` 内に旧バージョンからの変換処理を追加

**実例（v7→v8）**: `o1MaxRounds` を `maxRounds` にリネームし、クリケットにも同じラウンド上限を適用できるよう汎用化した。`case 7` で `save.o1MaxRounds` を `save.maxRounds` にコピーするフィールドリネーム変換を追加（`case 6` からのフォールスルーで、v0〜v7のどのセーブも通過する）。
3. 新規追加フィールドは `handleRestoreSave` のデフォルト値補完と二重管理にならないよう、極力 `migrateSaveData` 側に寄せる

**未来バージョンを読んだ場合の方針（実装済み）**
`save.version > CURRENT_SAVE_VERSION` の場合、`migrateSaveData` は `null` を返し、復元を拒否する。
このとき localStorage のデータは削除しない（アプリを更新すれば読める可能性があるため）。
将来UIで明示的なトースト通知（「このセーブデータは新しいバージョンで作成されています」）を出す場合は、
`handleRestoreSave` が `false` を返した呼び出し元で、拒否理由（期限切れ/破損/未来バージョン）を区別できるようにすると親切。現状は全て `false` で一括りなので、必要になったら戻り値を `{ ok: boolean, reason?: string }` に拡張する。

**将来の分岐点: validation と migration の分離**
現在 `migrateSaveData` は「未来バージョンの拒否」と「旧バージョンの変換」の両方を担っている。
これは規模的にまだ問題にならないが、以下のようなケース（バリデーションの責務）が増えてきたら分離を検討する：
- version不正（数値ではない、負数など）
- 必須フィールドの欠落（`players`が配列でない等）
- 型破損（`activePlayerIndex`が文字列になっている等）
- JSON自体の改ざん・手動編集

理想形：
```js
const validated = validateSaveData(parsed); // 構造的に正しいかだけ見る
if (!validated.ok) return false;
const migrated = migrateSaveData(validated.data); // バージョン間の変換だけ見る
```
`validateSaveData` が「形式として読めるか」、`migrateSaveData` が「古い形式を新しい形式に変換できるか」を担当する形に分けると、責務が明確になる。version管理を始めた今がこの分岐点であることは認識しておく。

### 2. ロジックの論理整理 と 物理分割（実施済み）

**旧状態**: 単一 `app.js`（4600行超）にセクション見出し（`◆ SECTION:`コメント）だけを追加し、責務ごとの境界を明示するに留めていた。ファイルが長くなりすぎたため、このセクション境界に沿って実際に物理ファイル分割を実施した。

**現状（`js/` 配下、6ファイル）**:

```
constants.js      — WEDGES, MAX_THROWS_PER_TURN, COUNT_UP_ROUNDS, LOCAL_STORAGE_KEY, CURRENT_SAVE_VERSION
checkout.js       — ARRANGE_TABLE, BOGEY_SETUP_TABLE, getSteelDartsArrangement, findCheckoutRoute,
                    cloneDeep, getSubtotal, normalizeOutMode, getRoundState, getHitSoundType,
                    getThrowFromCoords, CRICKET_TARGETS・クリケット関連ヘルパー, DARTSLIVE2ハンデ表一式
                    （「Checkout Logic」+「Round & Throw Helpers」を統合。両者が密結合だったため
                    無理に分けず1ファイルにまとめた）
scoring.js        — compactRoute, BOGEY_NUMBERS, PREFERRED_LEAVES, LEAVE_PRIORITY, scoreLeaveQuality,
                    findHighScorePlan, buildAssistLine, buildCountUpAssist, buildCricketAssist
                    （「Scoring Logic (Leave Quality)」+「Scoring Logic (Assist Output)」を統合。
                    元のapp.js内ではCPU Difficulty/Strategyセクションを挟んで非連続だったが、
                    互いに依存が無いことを確認した上で1ファイルに結合）
cpu.js            — CPU_DIFFICULTY, cpuComputeThrow, cpuPlayTurn, cpuComputeCricketThrow, cpuPlayCricketTurn
ui-components.js  — Icons, FliqloDigit, FliqloScoreboard, PlayerCockpit
app-main.js       — function App() 本体（State定義、イベントハンドラ、Save/Restore Helpers、JSX全体）
                    + ReactDOM.createRoot(...).render(...) の起動コード
```

**読み込み順（`index.html`）**: `constants → checkout → scoring / cpu（相互非依存） → ui-components → app-main`。

**分割方式の判断**: `type="module"` のES Modulesは使わず、非モジュールの `<script>` タグを依存順に並べる方式にした。理由は、このアプリが `file://` で直接開いても動くことを前提にしており（sw.js登録処理のコメント参照）、ES Modulesは `file://` 環境でCORSによりブロックされる（Chromeで顕著）ため。非モジュールscriptは各ファイルのトップレベル `const`/`function` がそのまま共有グローバルスコープに積み上がる仕様を利用しており、`export`/`import` は使っていない。

**分割時の検証方法**: ブラウザでの実行確認ができない環境だったため、以下の静的チェックで担保した。
1. 各ファイル単体で `node --check` が通ること
2. 6ファイルを読み込み順に単純結合したものが `node --check` で構文エラーにならないこと
3. トップレベル（2インデント）の `const`/`function` 宣言が分割前後で **同数・重複なし** であること
4. 各ファイルが「自分より後に読み込まれるファイルでしか定義されていない名前」を参照していないこと（コメント内の言及は除外）を正規表現で全数チェック

**教訓**: 「動く→仕様固める→利用者に触ってもらう→問題箇所が見える→そこで分割」の順を優先し、機能が不安定なうちは物理分割を保留する、という以前の方針は正しかった。実際、今回分割した時点でアプリの機能はかなり安定していたため、大きな手戻りなく実施できた。逆に、機能追加が激しい時期に物理分割していたら、ファイルをまたいだ変更のたびに依存順を意識するコストが増え、開発速度が落ちていた可能性が高い。

`CPU_DIFFICULTY` の各パラメータの意味は「CPU Difficulty Parameters」章を参照。

### 3. history の寿命設計
`players[].history` は統計計算の元データであり、`players`全体（設計原則1）の一部として現状は上限なく増え続ける。
1ゲーム単位では問題ないが、将来「複数ゲームを通した統計」を持つ場合は注意が必要。
- 1ゲーム内の `history` に上限は設けない（ゲーム自体の正しさに直結するため安易に切らない）
- 複数ゲームを跨ぐ統計（ベストレグ、通算PPDなど）を持つ場合は、**ゲーム用の履歴と統計用の履歴を分ける**か、
  ゲーム終了時に集計値だけを別途永続化し、生の `history` 配列はゲームをまたいで保持しない設計にする
- 「何百ゲームも遊ぶと重くなる」問題が出たら、まずは統計用ストレージを分離してから `history.slice(-N)` のような上限を検討する。先に上限を入れると、巻き戻しや統計の正確性を壊しやすい

### 4. Stats機能（PPD / MPR / AVG / CHECKOUT率）追加時の注意

**統計は state にしない。`players[].history` から導出する。**

```js
const stats = calculateStats(players); // ◯ 派生値として計算
const [stats, setStats] = useState(...); // ✕ 二重管理の元
```

`players` と `stats` を両方stateで持つと、PREVでplayersが戻った時にstats更新を忘れて平均値だけズレる、という典型的なバグが起きる。`calculateStats` のような純粋関数で都度計算すれば、PREV/Restore/CPUのどの経路でも自動的に整合する。

追加する際は以下を必ず再検証すること：
- **Bust**: バーストしたラウンドを統計の分母（投擲数）に含めるか、除外するかを最初に仕様として決める
- **PREV**: 統計をstateにしていれば「巻き戻し後も古い統計が残る」事故が起きるが、`calculateStats(players)` 方式なら自動的に解決する
- **CPU**: CPUの統計を人間と同じ計算ロジックで出すか、別枠にするか。CPUの投擲データは `cpuPlayTurn` の戻り値にバースト時の投擲も含まれるため、集計時にダブルカウントしないよう注意

#### 4-1. ゲームをまたいだ通算成績（Phase 1・実装済み）

上記は「1ゲーム内でのライブ統計表示」の話。それとは別に、**ゲームをまたいだ通算成績（成長記録）**を`STATS_STORAGE_KEY`(`pub_darts_cabin_stats_v1`)に実装した。`LOCAL_STORAGE_KEY`(進行中の1ゲームを24時間だけ復元するためのキー)とは完全に独立している。

**設計方針:**
- 生の`history`(投擲ログ)は保存しない。ゲーム終了時に**集計済みの1レコード**だけを配列に追記する
- レコードには`darts`(投擲本数)を含めておく。PPD自体は保存時点で計算済みだが、後から「勝利時平均ダーツ数」「301/501/701別分析」等をやりたくなった時に、生ログなしでも最低限の再集計ができるようにするため
- プレイヤー識別は`playerKey`と`playerName`を最初から分離。Phase 1では`playerKey = normalizePlayerName(playerName)`（NFKC正規化＋trim＋空白圧縮のみ。ローマ字/かな/カナ間の同一人物推定はしない＝誤名寄せの方が分離漏れより厄介なため）。Phase 2でプロフィールUIを追加する際は`playerKey`を固定ID(`"player_001"`等)に差し替えるだけで済み、レコードのフィールド構成自体は変えなくてよい設計にしてある

**実装箇所:**
- `js/scoring.js`: `normalizePlayerName(name)` / `buildGameStatsRecords(players, playerCount, winner, gameMode, outMode)`（共に純粋関数。`tests/gameStats.test.js`でカバー済み）
- `js/app-main.js`: `winner`確定を検知するuseEffectで`buildGameStatsRecords`を呼び、`STATS_STORAGE_KEY`に追記。**二重記録防止のため`winner._statsRecorded`フラグを立てる**（このフラグはRESUME時のセーブデータにも含まれるため、ゲーム終了直後にブラウザを閉じてRESUMEしても再記録されない）

**未着手（Phase 2以降）:**
- プロフィールUIによる`playerKey`の固定ID化・既存の名前ベースレコードとの統合
- Bustをどう扱うか（現状`darts`には含まれるが、バースト有無を区別するフィールドはまだない）

**閲覧UI（実装済み）:**
GAME SETUPモーダル上部の「📊 通算成績を見る」ボタンから開く専用モーダル。`summarizePlayerStats(records)`（`js/scoring.js`、純粋関数）で`playerKey`ごとに勝敗数・01の平均PPD/ベストPPD/上がり率・クリケットの平均MPR/ベストMPRを集計して表示。直近15試合のリストと、`STATS_STORAGE_KEY`を丸ごと削除する「統計をリセット」（確認付き）も含む。表示専用の派生値なので、統計結果自体はstateに持たず開くたびに再計算している（原則4-1と同じ理由）。

---

### 6. CPUを1投ずつ投げるように変更する（未着手・次にやる候補）

**現状**: `useEffect([isCpuTurn])` 内で `setTimeout` を1本だけ使い、900〜1600msのランダム待機の後、`cpuPlayTurn`/`cpuPlayCricketTurn` が**3投分をまとめて計算**し、そのまま`players`へ一括コミットしている（該当箇所: `app-main.js` の「── CPU自動投擲 ──」コメント以降、`cpuCommitRef`を使っているuseEffect）。そのため画面上は「一定時間待った後、3本のマーカーが同時に盤面へ現れる」ように見える。人間側は`currentThrows`に1投ずつ追加されて①②③のマーカーが順番に増えていく（`commitThrow`参照）のに対し、CPU側は`currentThrows`を経由せず直接`players`を更新しているため、この見た目の違いが生まれている。

**やりたいこと**: CPUも人間と同じように、1投→少し間を置く→2投目→…という見た目にする。

**実装方針（案）**:
1. `cpuPlayTurn`/`cpuPlayCricketTurn`自体は変更不要（3投分の計算をまとめて先に行い、結果の配列を保持しておくのはそのままでよい）。
2. コミットのタイミングだけを分割する。`setTimeout`を1本ではなく、投げるダーツの本数ぶん（バーストで早期終了する場合は少ない本数）連続してスケジュールする形にする。イメージ:
   ```js
   const scheduleThrow = (i) => {
     const tid = setTimeout(() => {
       if (cancelled) return;
       // cpuThrows[i] だけを currentThrows に追加（commitThrowと同じ形のオブジェクトを渡す）
       setCurrentThrowsImmediate(prev => [...prev, cpuThrows[i]]);
       playSound(getHitSoundType(cpuThrows[i]));
       if (i + 1 < cpuThrows.length) {
         scheduleThrow(i + 1); // 次の1投を少し間を置いてスケジュール
       } else {
         // 3投（またはバーストで打ち切り）完了 → ここで初めてplayersへ確定コミット
       }
     }, 400 + Math.random() * 300); // 1投あたりの間隔。既存の900-1600msの合計待機時間とバランスを見て調整
     cpuCommitRef.current = () => { cancelled = true; clearTimeout(tid); };
   };
   ```
3. **バーストの扱いに注意**: 現状は3投まとめて計算してからバースト判定している可能性が高い（`cpuPlayTurn`の内部実装を要確認）。1投ずつ表示する場合、2投目でバーストしたら3投目は投げずにそこでターン終了、という見た目にする必要がある（実際のダーツと同じ挙動）。`cpuThrows`配列の何投目でバーストが起きるかを`cpuPlayTurn`側が返す（または`getRoundState`で都度チェックする）ようにしておくと安全。
4. **PREV/キャンセルとの整合性**: `cancelCpuTimer()`（CPU思考中のPREV対策で以前バグ修正した箇所）が、1投ずつのスケジューリングでも正しく全ての保留中`setTimeout`を止められるようにする。`cpuCommitRef.current`に「今スケジュールされている次のタイマーを止める関数」を都度上書きしておけば、既存の仕組みをほぼそのまま流用できるはず。
5. 全投完了後、最終的に`players`へ確定コミットする処理（ラウンド上限チェック・勝敗判定・クリケットの勝利判定など）は既存のロジックをそのまま使ってよい（`currentThrows`が正しく埋まった状態で、今の「3投まとめてコミット」相当の処理を1回呼ぶだけでよいはず）。

**優先度**: 見た目の改善であり機能追加ではないため急ぐ必要はないが、次にCPU周りを触るタイミングでまとめてやるのが効率的。

### 7. その他、直す価値がありそうな点（優先度順）

1. ~~**テストが0件**: `getRoundState`/`applyCricketDart`/`findCheckoutRoute`/`computeAuto01Scores`/`getFinishTargets`などは引数を渡せば結果が返る純粋関数に近く、テストを書くコストの割に効果が高い。~~ **対応済み**: `tests/`配下にNode組み込み`node:test`ベースのテストを追加（`getThrowFromCoords`/`getRoundState`/クリケットのmark/overflow判定、計34件）。`vm`モジュールで実ファイル(`constants.js`/`checkout.js`/`scoring.js`)をそのまま読み込む方式にし、ロジックの書き写しはしていない。`npm test`または`node --test tests/*.test.js`で実行。`findCheckoutRoute`/`computeAuto01Scores`/`getFinishTargets`は未カバーのまま残っているので、次に手を入れる際はここから追加するとよい。
2. **CPU側のコミット処理が人間側（`commitThrow`）と別実装のまま**: 上記6番の変更と合わせて見直す余地がある。stateの非同期更新の都合上、完全に同一関数にはまとめにくいが、少なくとも「1投分のダーツオブジェクトを作る」部分は共通化できる可能性がある
3. **app-main.jsが依然3179行**: checkout/scoring/cpu/ui-componentsには分割済みだが、`function App()`本体は1つの巨大なコンポーネントのまま。セットアップ画面・プレイ画面・リザルト画面をサブコンポーネントに分ける余地はあるが、機能追加がまだ続いている間は急がなくてよい

---

### 5. 将来のカメラ自動採点との統合点（着手は未定・現時点では準備のみ）

現在の「アプリが完成してから検討する」という優先順位は妥当（要件がまだ動いている段階で自動採点向けの大きな抽象化を先取りすると、手戻りリスクの方が大きい）。ただし、ほぼコストゼロで先回りできる整理は既に実施した。

**`commitThrow(t)` への集約**: 盤面タップ(`handleBoardClick`)とテンキー入力(`handleKeypadTap`)は、それぞれ独自に「ダーツオブジェクトを`currentThrows`へ確定し、サウンドを鳴らし、バーストを判定する」という同じ処理を重複して持っていた。これを`commitThrow(t)`という1つの関数に集約した。`t`の形は`{score, multiplier, x, y, label, isBull}`。

**カメラ入力を追加する際の想定接続点**: 画像認識側が検出したダーツの着弾位置を上記の形に変換して`commitThrow(t)`を呼ぶだけで、UIからの入力と全く同じ経路（バースト判定・履歴確定・サウンド）に自然に乗る。逆に言うと、**カメラ側の実装は「検出結果を`{score, multiplier, x, y, label, isBull}`に変換する層」だけを新規に書けばよく、スコア確定・バースト判定・ターン管理のロジックには一切手を入れる必要がない**設計になっている。

**まだやっていないこと（本格的にカメラ実装を始める時点で検討）**:
- `commitThrow`呼び出しの重複排除（同じダーツを2回検出して2回呼んでしまうケース）への対策。他レビューで指摘された「DartEventにID/timestampを持たせて同一IDを無視する」というアイデアは、カメラ入力を実装する段になったら`commitThrow`の呼び出し側（カメラ検出ロジック）でIDの重複排除をすればよく、`commitThrow`自体や`currentThrows`の構造を今から変更しておく必要はない
- ゲームロジック本体（checkout.js/scoring.js/cpu.js）をReactから完全に切り離す「Game Engine化」。今の分離度（Reactのstateを読み書きするのはapp-main.jsのみで、checkout/scoring/cpuは概ね引数を受け取って値を返す純粋関数寄り）でも、カメラ入力を受け付ける程度なら十分機能する。UIとロジックの結合をこれ以上下げる必要が出るのは、実際にテストを書き始める、または画像認識をWeb Workerで別スレッド化する必要が出たタイミングで十分

---

## 既知のバグと設計上の教訓（再発防止用）

### CPU名の残留が3箇所で個別に再発していた（根本修正）

`p2Name = cpuMode ? cpuLabel : players[1].name` という「CPU対戦後に人間対戦へ戻すと`players[1].name`に残った"CPU (PRO)"がそのまま使われる」バグを、以前は`handleQuickStart`など1箇所だけ対症療法的に直した（1P/2Pボタン押下時に名前をクリア）。しかし`handleStartGame`/`handleLeaveToMenu`にも**全く同じロジックが個別に実装されていて**、そちらは直っていなかった。`resolveP2Name(cpuMode, cpuDifficulty, players)`という共通関数に一元化し、3箇所とも同じ関数を呼ぶようにして根治した。

**教訓**: 同じロジックが複数箇所にコピペされている場合、1箇所だけ直して満足しないこと。`grep`で同じパターン（今回は`cpuMode ? cpuLabel : players[1].name`）を横断検索し、全ての出現箇所を洗い出してから修正する。今回は「ボタン押下時にクリアする」という対症療法と「そもそも名前を使う時点でフィルタする」という根治療法が両方存在する状態になっていたが、後者の方が呼び出し経路の増加に強い。

### 盤面外側（ダブルリングの外の縁・番号ラベル部分）のタップがSingle扱いになっていた（修正済み）

`getThrowFromCoords`のリング判定が `r > rOOB`（盤の縁よりさらに外）だけをMiss扱いにしており、`rDoubleOuter`〜`rOOB`の間（盤の縁・番号ラベルが描かれている領域）が`else`に落ちてSingle扱いになっていた。`r > rDoubleOuter`は全てMissに統一。

**教訓**: `if/else if/.../else`の判定チェーンで、`else`が「その他全部」を意味してしまう設計は、境界値の考慮漏れに気づきにくい。特にUIの見た目（何が描画されているか）とスコア判定の境界がズレていないか、実際の半径の数値を並べて確認する必要がある。

### 判定側のリング半径定数が描画側とズレていた（修正済み・上記バグの再発）

上の「盤面外側がSingle扱い」バグを`r > rDoubleOuter`で塞いだ後も、`rTripleInner/Outer`(91/111)・`rDoubleInner/Outer`(153/170)という判定側の半径自体が、盤面描画側(`app-main.js`の`bp()`呼び出し。Single内側=22-90、Triple=90-112、Single外側=112-154、Double=154-176)と1〜6ズレたままだった。特にDouble外側は判定170・描画176で6のズレがあり、**見た目はDoubleの帯の中なのに判定はMissになる領域**が実際に存在していた。`getThrowFromCoords`側の定数を描画側の値(90/112/154/176)に完全一致させて修正し、`tests/getThrowFromCoords.test.js`に境界値テストを追加して再発を機械的に検知できるようにした。

**教訓**: 「盤外判定の抜け」と「リング境界の数値そのものが描画とズレている」は別種のバグで、片方を直しても他方は直らない。見た目と判定の整合性を確認するときは、`else`の網羅性だけでなく、両側で使っている具体的な数値（半径・角度）を並べて突き合わせる必要がある。今回はテストを追加したことで、旧定数に戻すと3件のテストが確実に落ちることを確認済み。

### BUSTオーバーレイがプレイヤー名バナーまで覆っていた（修正済み）

`isBust && <div className="absolute inset-0 ...">`は、コメント上は「スコア部分のみを覆う」意図だったが、実際には`relative`を持つ親divが「名前バナー + スコアボード」の両方を包んでいたため、`absolute inset-0`が両方を覆っていた。`FliqloScoreboard`だけを囲む専用の`relative`コンテナを新設し、そちらにオーバーレイを移動して意図と実装を一致させた。

**教訓**: `absolute inset-0`を使う前に、`relative`を持つ直近の祖先要素が「本当に覆いたい範囲と一致しているか」を確認すること。コメントに書いた意図と実際のDOM構造が一致しているかは、後から見ただけでは分からない。

### `e.clientX || fallback` は座標が0の場合を誤判定する

マウスクリックの`e.clientX`/`e.clientY`が画面の左端・上端ちょうど（`0`）のとき、`||`演算子は`0`を偽値として扱いフォールバック側に流れてしまう。`typeof e.clientX === "number"`判定に変更。実害は「盤面が画面の絶対左端に接している」という稀なレイアウトでしか顕在化しないため優先度は低いが、`||`によるデフォルト値判定は「0や空文字が正当な値になりうる場面」では常にこの罠がある。

**教訓**: `x || fallback`は`x`が`0`/`""`/`false`/`NaN`のときも`fallback`に落ちる。`??`（nullish coalescing）や`typeof`判定を使うべき場面かどうかを、値の取りうる範囲を踏まえて都度判断すること（このドキュメント内の`||`に関する別の教訓と合わせて、この誤用パターンは複数回発生している）。

### CPU難易度のringWeightsは「狙った先の周辺リング」の現実的な確率になっているか確認する

HARD/PROはトリプルを主軸に狙う想定だが、`ringWeights.double`（外れてダブルに入る確率）が30%超あり、「PROと対戦しているとダブル20が不自然に出る」という指摘を受けた。実際のダーツでは、トリプル（内側の細いリング）を狙って外れた場合、すぐ隣接する広いシングルエリアに逸れることがほとんどで、さらに外側のダブル（一番外の細いリング）まで飛ぶのは大きな外れでしか起きない。`ringWeights`を「狙ったリングの半径的な隣接関係」を踏まえて設計し直す必要がある（single-aim時の隣接はdouble/triple両方、triple-aim時の隣接は主にsingle、という非対称性がある）。

**教訓**: `ringWeights`のような「確率の内訳」を難易度ごとにチューニングするとき、期待値（PPD等）だけを見て帳尻を合わせると、個々の内訳が物理的に不自然になりうる。集計値だけでなく「この難易度は何を狙っていて、外れたらどこに飛ぶのが自然か」という個別の分布の妥当性も併せて検証すること。

---

### タップ毎回ダーツが2本登録される（重大・修正済み）

盤面のSVGに `onClick={handleBoardClick}` と、`onTouchEnd`内で`handleBoardClick(e)`を直接呼ぶ処理の**両方**が乗っていた。タッチデバイスでは`touchend`の後、ブラウザが互換性のために合成`click`イベントを追加で発火する。`onTouchEnd`側で`preventDefault()`していなかったため、この合成clickが素通りして`onClick`側の`handleBoardClick`も呼ばれ、**1回のタップでダーツが2本カウントされていた**（体感的には「ダブルタップしたみたいになる」）。

`onTouchEnd`の一番最初で`e.preventDefault()`を呼ぶことで解決。tap/swipe/pinchのどの分岐に進む場合でも、必ず最初にpreventDefaultするようにしている（分岐の途中に置くと一部の早期returnパスだけ合成clickが素通りする穴が残るため）。

**教訓**: 同一要素に`onClick`（マウス/合成クリック用）と`onTouch*`（タッチ専用）の両方でユーザー操作をハンドリングする実装は、タッチデバイス上で二重発火する典型的な罠。タッチイベント側で独自にアクションを実行するなら、`touchend`ハンドラの中で必ず`preventDefault()`して後続の合成clickを止めること。逆に、`onClick`だけに任せてタッチ操作の細かい制御（スワイプ判定等）を諦める設計であれば、`onTouch*`側では状態記録だけに留め、実際のアクション実行はしない、という役割分担も選択肢になる。今回は「スワイプ/ピンチを誤タップ扱いしない」という要件のため後者を選べず、前者（preventDefaultで二重発火を止める）で対応した。

### ダーツマーカーの色分け（①青②緑③赤）と編集中インジケータの役割分離

投数ごとにマーカーの色を変える機能を追加する際、以前は「編集中のダーツ」も専用の色（`#38bdf8`スカイブルー）で表現していた。1投目の色も同じ系統の青にすると、「これは1投目？それとも編集中？」の判別がつかなくなる。**色は投数の意味に固定し、編集中かどうかは別軸（縁取りの色）で表現する**ことで役割を分離した。

**教訓**: 1つの視覚属性（色）に複数の意味を持たせようとすると、新しい分類軸を追加したときに必ず衝突する。「この色は何を表しているか」を機能追加前に棚卸ししておくと、後から次元を増やすときに詰まりにくい。

### バースト後に追加のダーツが刺さらないようにする要件は、既に`canAddMoreThrows`で担保されている

`canAddMoreThrows = editingThrowIndex !== null || (!roundState.isBust && !roundState.isFinished && currentThrows.length < MAX_THROWS_PER_TURN)` が、盤面タップ(`handleBoardClick`)とテンキー入力(`handleKeypadTap`)の両方の入口で `if (editingThrowIndex === null && !canAddMoreThrows) return;` としてガードされている。`getRoundState`は`throws`配列を先頭から走査し、1投目時点でオーバー/不正チェックアウトが起きた時点で即座に`isBust: true`を返すため、1投目・2投目どちらでバーストしても以降の入力は自動的にブロックされる。**このガードを外す・迂回する新しい入力経路（新しいボタンやショートカット等）を追加する際は、必ず`canAddMoreThrows`のチェックを踏襲すること。**

### CPU思考中のPREVがCPUのターンを永久に止める（修正済み）

`handleUndoCommittedTurn`（PREV）は以前、確認ゲート（2段階確認の1回目）より**前**で無条件に `cancelCpuTimer()` を呼んでいた。CPU思考中にPREVを1回タップしただけ（確認せず放置）でもCPUの保留中タイマーが握り潰され、CPUの自動投擲は `useEffect([isCpuTurn])` で動いているため `isCpuTurn` が `true→true` のまま変化しない限り再発火せず、CPUのターンが二度と進まなくなっていた。

**教訓**: 「確認待ち（arm）」と「実行確定」は別のタイミング。副作用のキャンセル（`cancelCpuTimer()`のような不可逆操作）は、必ず「実行が確定した後」に呼ぶこと。確認ダイアログの1タップ目で不可逆な副作用を先に実行してしまう設計は、キャンセルされた場合に取り返しがつかない。

### RESUMEボタンが表示されるのに復元に失敗する（修正済み）

`refreshRestorableSave`（起動時にRESUMEボタンを出すかどうかの判定）が `migrateSaveData` によるバージョンチェックを通していなかった。一方 `handleRestoreSave`（実際の復元処理）は未来バージョンのセーブを拒否する。結果、「ボタンは出るが押しても復元されない」状態が起こり得た。さらに `handleRestoreSave` の失敗パスで `setHasRestorableSave(false)` を呼んでいなかったため、一度失敗するとボタンが**押しても直らないまま永久に残る**バグもあった。

**教訓**: 「表示条件」と「実行条件」は同じ判定ロジックを共有すること。表示条件だけ緩い判定を使うと、「見えるのに動かないボタン」という体感バグを生む。実行が失敗したら、表示状態も必ず追従してリセットする。

### 復元処理には `sanitizeRestoredPlayer` で必ずサニタイズを通す

`handleRestoreSave` は `players` が「配列で長さ2」程度の粗いチェックしかしていなかった。壊れた/手編集された/旧形式のセーブデータでフィールドが欠けていると、後段の `getCricketRoundState` 等が `undefined` 参照でクラッシュしうる。`sanitizeRestoredPlayer(p, id, fallbackName)` が全フィールドを安全なデフォルト値で補完してから `setPlayers` に渡すことで、この種のクラッシュを防いでいる。**新しいフィールドを `Player` オブジェクトに追加したら、`sanitizeRestoredPlayer` にもデフォルト値を追加すること。**

### UI表示専用のプレースホルダー値を実データ（state）に保存しない

1Pモード時の `players[1].name` に、以前は表示用のつもりで文字列 `"---"` をそのまま保存していた。`players[1]` は1Pゲーム中どこにも表示されないため実害はないが、セットアップ画面の名前入力欄が `players[1].name` を直接bindしているため、後で2Pに切り替えると入力欄に `"---"` がそのまま表示されてしまう体感バグになっていた。

**教訓**: 「今は表示されないから」で実データに仮の表示用文字列を書き込むと、後で別画面がその同じstateを参照したときに漏れ出す。表示専用の値は、render時に都度算出するか、最低限「その値がどこか別の場所でも読まれる可能性はないか」を確認してから保存すること。

### クイックスタート（`handleQuickStart`）は `handleStartGame`/`handleLeaveToMenu` と並ぶ第3のゲーム開始経路

3つとも「setStateしてから同一ハンドラ内でhandleStartGameを呼ぶ」ができない（stateの非同期更新のため）という同じ制約を持つため、値を直接埋め込んだ独立関数として重複させている（意図的な重複）。3経路共通で使うロジック（`computeAuto01Scores()` / `computeCricketSetup()`）は関数として切り出し済みなので、**ゲーム開始時の計算ロジックを変更する場合は、この2つの関数だけを直せば3経路すべてに反映される**。`handleQuickStart(mode)` は `playerCount`/`cpuMode`/`cpuDifficulty` を一切上書きしない点が他の2つと異なる（セットアップ画面で選択済みの値をそのまま尊重する設計）。

### 盤面のネイティブピンチズームがモバイルブラウザをクラッシュさせる（修正済み）

盤面の視認性改善を求められ、一度は自前でCSS transformによるピンチズーム機能を実装したが「求めていたのはネイティブのピンチズームが効かない問題の修正であって、盤面だけを拡大する独自機能ではない」とフィードバックを受けて撤回。`touch-action: pan-y pinch-zoom` に変更してネイティブズームを許可する方向に倒したが、今度は「盤面のピンチズームを繰り返すとブラウザ自体が落ちる」という新たな問題が発生した。盤面SVGはグロー/ブラーの `filter` を多用しており、ネイティブズームで繰り返し再描画させるとモバイルブラウザ（特にiOS Safari）がメモリ圧迫でクラッシュする。最終的に `touch-action: manipulation` で盤面上のピンチズーム自体を無効化し、数字の視認性は別途フィルターに依存しない文字色修正（アウトライン付きの明るい色）で対応する形に落ち着いた。

**教訓**: 「〇〇ができない」という報告は、原因（ここでは文字色の視認性）と症状（ズームできない）を分けて考えること。症状に対する対症療法（自前ズーム機能）を先に作ると、根本原因を直さないまま複雑な機能が残り、さらに新しい不具合（クラッシュ）を生む土台になる。また、SVGフィルターは軽い視覚効果のつもりでも、ネイティブズームやアニメーションと組み合わせるとモバイル環境で重い処理になりうることを踏まえておく。

### 「PLAY AGAIN」ボタンが実際には設定画面に戻る動作になっていた（修正済み）

`handleStartGame(showSetup)` の第1引数はゲーム開始後に `GAME SETUP` モーダルを再度開くかどうかを制御する。リザルト画面の唯一のボタンが `handleStartGame(true)` を呼んでいたため、ラベルは「PLAY AGAIN」なのに実際の挙動は「同条件でリセットしつつ設定画面に戻る」になっていた。ボタンを2つに分離し、`handleStartGame(false)`＝即座に再戦、`handleStartGame(true)`＝設定変更、とラベルと挙動を一致させた。

**教訓**: 引数のデフォルト値（`showSetup = false`）と実際の呼び出し（`true`固定）が食い違っていないか、ボタンラベルを見て挙動を推測できるかを定期的に確認すること。

### JSXブロックを `React.createElement("div", {...}, children)` から即時実行関数(IIFE)に書き換える際、閉じ括弧の数が合わなくなりやすい

クリケット手動ハンデのUIを表形式→タブ切り替え式に書き換えた際、`React.createElement("div", {...}, A, B, C)` の形から `(() => { ...; return React.createElement(...); })()` の形に変えたが、旧構造の末尾に残っていた `),` を消し忘れ、遠く離れた（400行以上先の）無関係な箇所で `Unexpected token ')'` のエラーになった。

**教訓**: JSXの構造を「複数要素を並べる形」から「IIFEで計算してから1つ返す形」に変える（またはその逆）ときは、開始と終了を同時に書き換える意識を持つこと。`node --check` で構文エラーが出た行は、実際の原因箇所とは限らない（括弧の対応ズレは離れた場所でエラーとして顕在化する）。エラー行だけでなく、直前に編集した箇所の開き括弧・閉じ括弧の数を先に目視で数え直す方が早いことが多い。

### CPU選択後に2Pへ切り替えられない（修正済み）

1P/2Pボタンのうち、1Pだけが `if(n===1) setCpuMode(false)` という条件付きで`cpuMode`を解除していた。2Pボタンは`cpuMode`を一切触らなかったため、CPU ON状態から2Pを押しても何も変化せず（`playerCount`は既に2、`cpuMode`はtrueのまま）、ボタンの表示上もCPUがハイライトされたまま「反応していない」ように見えた。1P/2Pどちらのボタンも無条件で`setCpuMode(false)`を呼ぶよう修正。

**教訓**: 排他的に見えるトグルボタン群（1P/2P/CPU）を実装するとき、「片方だけが相手の状態をリセットする」非対称な実装は見落としやすいバグの温床になる。全ての選択肢が同じルールで相互排他を保証しているか確認すること。

### CPU対戦後、プレイヤー名入力欄に "CPU (MEDIUM)" が残る（修正済み）

CPU対戦を開始すると `makePlayer` が `players[1].name` に `"CPU (${cpuDifficulty.toUpperCase()})"` という文字列をそのまま保存する。セットアップ画面の名前入力欄は `players[1].name` を直接bindしているため、CPU対戦後にセットアップへ戻って1P/2Pへ切り替えても、このラベルがそのまま入力欄に残ってしまっていた。「UI表示専用のプレースホルダー値を実データに保存しない」の教訓（本ドキュメント内の`"---"`漏れバグ参照）とまったく同じパターンで、今度は伏線がCPUラベルという別の形で顕在化した。1P/2Pボタン押下時、`players[1].name`が`/^CPU \(/`にマッチしていたらクリアするようにして対処。

**教訓**: 一度直したはずのバグパターン（表示専用の値が実データに紛れ込む）は、別の値（`"---"` → `"CPU (MEDIUM)"`）で形を変えて再発しうる。個別のバグとしてパッチするだけでなく、「setup画面の入力欄が指す先のstateに、ゲーム中にしか意味を持たない値が書き込まれていないか」を他の項目についても横展開で確認する価値がある。

### 盤面のスワイプ・ピンチが誤ってダーツとして登録される（修正済み）

盤面のタッチ判定は指の本数（`isMultiTouchRef`）だけを見ており、移動距離を見ていなかった。1本指でのスワイプ（ページを見ながら盤面上で指を滑らせる等）や、ピンチの片方の指が早く離れた場合、`touchend`時点の座標がそのままダーツの着弾点として扱われていた。`touchstart`時の座標を`touchStartPosRef`に記録し、`touchend`時の座標との距離が12pxを超えていたらタップとして扱わないようにして解決。ズーム自体（`touch-action: manipulation`）は禁止せず維持している。

**教訓**: 「タップ」と「スワイプ/ドラッグ」はどちらも指1本の操作であり、本数だけでは区別できない。座標の移動量で判定する必要がある。マルチタッチ判定とドラッグ判定は別の軸のガードであり、片方だけ実装して満足しないこと。

### CPU難易度の較正はゲーム内の期待値計算で行う（設計メモ）

CPU難易度（`CPU_DIFFICULTY`の`numberAccuracy`/`ringWeights`）は感覚だけで調整すると「MEDIUMが強すぎる」「HARDがほぼプロレベル」のようなズレが起きやすい。DARTSLIVE公式のレーティング表（01の80%スタッツ=PPRを3で割ってPPD換算）を参照値として使い、`E[PPD] = (17×numberAccuracy + 3) × (single×1 + double×2 + triple×3)` という近似式で各難易度の期待PPDを逆算・較正した（20番を狙い続ける単純化モデルなので、実際の対戦成績とは多少ずれる）。難易度を再調整する際は、まずこの期待値を計算してから対象レーティングと突き合わせると、感覚だけで弄るより早く収束する。

### 01: あと1投で上がれるセグメントの盤面ハイライト

`getFinishTargets(remaining, outMode)`（checkout.js）が、残り点数とアウト設定から「あと1投で0にできる」セグメント一覧を返す。盤面側は既存のfill色ロジック（クリケットの状態色分けなど）を一切変更せず、該当するダブル/トリプル/Bullの上に半透明の緑白オーバーレイ（`pointer-events: none`、`.finish-target-pulse`でパルスアニメーション）を重ねるだけにしている。**教訓（設計判断）**: 既存の色分けロジックに新しい条件を混ぜ込むと分岐が爆発的に複雑化するため、「新しい視覚情報は独立したオーバーレイ層として追加する」方針を取った方が、他の状態（クリケットの色分け等）を壊すリスクが低い。

---



> **すべての状態遷移は「UI状態」と「履歴状態」を分離して考え、PREVのみが履歴（`turnHistoryState`）を変更する唯一の操作である。**

この一文が崩れたとき（CLEARやその他の操作が`turnHistoryState`を消費し始めたとき）、PREV系のバグが再発する。
