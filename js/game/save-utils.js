// ═══════════════════════════════════════════════════════════════════════
// js/game/save-utils.js — Save/Restoreの純粋変換処理
//   依存: constants.js(CURRENT_SAVE_VERSION)、checkout.js(makeEmptyCricketMarks)。
//   React StateにもlocalStorageにも一切触れない、完全に自己完結した純粋関数のみ。
//   読み込み順: checkout.js の後（makeEmptyCricketMarksを使うため）、
//   app-main.js の前（index.html参照）。
//
//   ここに含まれないもの（意図的にapp-main.jsへ残したもの）:
//     自動保存Effect / handleRestoreSave / clearSavedGame / refreshRestorableSave
//     / setCurrentThrowsImmediate は、React StateやRef（特にcurrentThrowsRefとの
//     二重書き込み同期）に直接触れるため、このPhaseでは抽出しない。無理に
//     Hook化すると「27個のstate setterを引数で受け取るだけの関数」になり、
//     複雑さの削減にならないため（STATE_MANAGEMENT.md「app-main.js分割計画」参照）。
// ═══════════════════════════════════════════════════════════════════════

const makePlayer = (
  id,
  name,
  startScore,
  handicapMarks,
  handicapCount,
  initialCricketScore,
) => ({
  id,
  name,
  initialScore: startScore,
  remainingScore: startScore,
  accumulatedScore: 0,
  cricketMarks: handicapMarks || makeEmptyCricketMarks(),
  cricketScore: initialCricketScore || 0, // DL2オートハンデのボーナス得点（手動ハンデ時は常に0）
  cricketHandicap: handicapCount || 0, // セットアップ画面復元用（原則7: 派生値ではなく設定値そのものを保持）
  history: [],
});

// 壊れた/古い形式のセーブデータからプレイヤーを復元する際、欠損フィールドを安全なデフォルトで
// 埋める。localStorageの手動編集や旧バージョンのデータでフィールドが欠けていても、
// 後段のgetCricketRoundState等が undefined参照でクラッシュしないようにするための防御。
const sanitizeRestoredPlayer = (p, id, fallbackName) => {
  if (!p || typeof p !== "object") return makePlayer(id, fallbackName, 501);
  const initialScore = Number.isFinite(p.initialScore) ? p.initialScore : 501;
  return {
    id: typeof p.id === "string" ? p.id : id,
    name: typeof p.name === "string" ? p.name : fallbackName,
    initialScore,
    remainingScore: Number.isFinite(p.remainingScore)
      ? p.remainingScore
      : initialScore,
    accumulatedScore: Number.isFinite(p.accumulatedScore)
      ? p.accumulatedScore
      : 0,
    cricketMarks:
      p.cricketMarks && typeof p.cricketMarks === "object"
        ? { ...makeEmptyCricketMarks(), ...p.cricketMarks }
        : makeEmptyCricketMarks(),
    cricketScore: Number.isFinite(p.cricketScore) ? p.cricketScore : 0,
    cricketHandicap: Number.isFinite(p.cricketHandicap)
      ? p.cricketHandicap
      : 0,
    history: Array.isArray(p.history) ? p.history : [],
  };
};

// ── セーブデータ migration ──
// version が上がるたびに、ここに旧バージョンからの変換処理を追加する。
// 戻り値が null の場合、呼び出し側（handleRestoreSave）は復元を拒否する。
const migrateSaveData = (save) => {
  const v = save.version ?? 0;

  // 未来バージョン（このアプリより新しい形式）は復元しない。
  // 例: v7で保存したデータを、まだv6のままのアプリで開いた場合。
  // 中身を無理に読むと構造不一致でクラッシュする可能性があるため拒否する。
  if (v > CURRENT_SAVE_VERSION) {
    console.warn(
      `セーブデータのバージョン(${v})がアプリの対応バージョン(${CURRENT_SAVE_VERSION})より新しいため復元をスキップしました。`,
    );
    return null;
  }

  switch (v) {
    case 0:
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
    case 6:
      // 旧バージョン: 現状は構造変更なしなのでそのまま通す。
      // v7でgameMode="cricket"とplayer.cricketMarks/cricketScoreを追加したが、
      // どちらも「無ければ未使用として扱われるだけ」の追加フィールドなので変換不要。
      // falls through
    case 7:
      // v7→v8: o1MaxRounds を maxRounds にリネーム。
      // クリケットにも同じラウンド上限設定を適用できるよう、01専用の名前を汎用化した。
      if (save.o1MaxRounds !== undefined && save.maxRounds === undefined) {
        save.maxRounds = save.o1MaxRounds;
      }
      // falls through
    case 8:
      // v8→v9: autoHandicap01/p1Rating/p2Rating/autoHandicapCricket/
      // manualCricketMarksP1/P2/manualCricketBonusP1/P2 を新規追加。
      // 旧セーブには存在しないが、handleRestoreSave側で未定義時のフォールバック
      // （off・レーティング6・マーク全0・ボーナス0）を用意しているため変換不要。
      break;
    default:
      break;
  }
  return save;
};
