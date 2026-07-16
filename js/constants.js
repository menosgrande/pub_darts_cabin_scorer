// ═══════════════════════════════════════════════════════════════════════
// constants.js — ゲーム全体で共有する定数
// 読み込み順: constants.js → checkout.js → scoring.js → cpu.js → ui-components.js → app-main.js
// （非モジュールscriptなので、この順でグローバルスコープに const が積み上がっていく）
// ═══════════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════════
  // ◆ SECTION: Constants
  // ゲーム全体で共有する定数。WEDGES / 1ターンのダーツ数 / Count-Upラウンド数 / セーブキー等。
  // ═══════════════════════════════════════════════════════════════════════
  const WEDGES = [
    20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
  ];
  const MAX_THROWS_PER_TURN = 3;
  const COUNT_UP_ROUNDS = 8;
  const LOCAL_STORAGE_KEY = "pub_darts_cabin_state_v5";
  const CURRENT_SAVE_VERSION = 9; // セーブデータ構造のバージョン。上げたら migrateSaveData に変換処理を追加。
