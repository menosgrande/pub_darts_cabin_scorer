(() => {
  const { useState, useEffect, useRef, useMemo } = React;
  const WEDGES = [
    20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
  ];
  const MAX_THROWS_PER_TURN = 3;
  const COUNT_UP_ROUNDS = 8;
  const LOCAL_STORAGE_KEY = "pub_darts_cabin_state_v5";
  const CURRENT_SAVE_VERSION = 6; // セーブデータ構造のバージョン。上げたら migrateSaveData に変換処理を追加。

  // ─────────────────────────────────────────────────────────────────────────
  // ARRANGE_TABLE: 2～170点の標準チェックアウトルート
  // ─────────────────────────────────────────────────────────────────────────
  const ARRANGE_TABLE = {
    170: "T20 - T20 - Bull",
    167: "T20 - T19 - Bull",
    164: "T20 - T18 - Bull",
    161: "T20 - T17 - Bull",
    160: "T20 - T20 - D20",
    158: "T20 - T20 - D19",
    157: "T20 - T19 - D20",
    156: "T20 - T20 - D18",
    155: "T20 - T19 - D19",
    154: "T20 - T18 - D20",
    153: "T20 - T19 - D18",
    152: "T20 - T20 - D16",
    151: "T20 - T17 - D20",
    150: "T20 - T18 - D18",
    149: "T20 - T19 - D16",
    148: "T20 - T16 - D20",
    147: "T20 - T17 - D18",
    146: "T20 - T18 - D16",
    145: "T20 - T15 - D20",
    144: "T20 - T18 - D15",
    143: "T20 - T17 - D16",
    142: "T20 - T14 - D20",
    141: "T20 - T15 - D18",
    140: "T20 - T16 - D16",
    139: "T19 - T14 - D20",
    138: "T20 - T14 - D18",
    137: "T19 - T16 - D16",
    136: "T20 - T16 - D14",
    135: "T20 - T15 - D15",
    134: "T20 - T14 - D16",
    133: "T20 - T13 - D17",
    132: "T20 - T16 - D12",
    131: "T20 - T13 - D16",
    130: "T20 - T18 - D8",
    129: "T19 - T16 - D12",
    128: "T18 - T18 - D10",
    127: "T20 - T17 - D8",
    126: "T19 - T19 - D6",
    125: "T18 - T17 - D10",
    124: "T20 - D16 - D16",
    123: "T19 - T16 - D9",
    122: "T18 - T20 - D4",
    121: "T20 - T11 - D14",
    120: "T20 - S20 - D20",
    119: "T19 - S12 - D-Bull",
    118: "T20 - S18 - D20",
    117: "T20 - S17 - D20",
    116: "T20 - S16 - D20",
    115: "T20 - S15 - D20",
    114: "T20 - S14 - D20",
    113: "T19 - S16 - D20",
    112: "T20 - S12 - D20",
    111: "T20 - S11 - D20",
    110: "T20 - S10 - D20",
    109: "T19 - S12 - D20",
    108: "T20 - S16 - D16",
    107: "T19 - S18 - D16",
    106: "T20 - S14 - D16",
    105: "T19 - S16 - D16",
    104: "T20 - S12 - D16",
    103: "T19 - S10 - D18",
    102: "T20 - S10 - D16",
    101: "T17 - S10 - D20",
    100: "T20 - D20",
    99: "T19 - S10 - D16",
    98: "T20 - D19",
    97: "T19 - D20",
    96: "T20 - D18",
    95: "T19 - D19",
    94: "T18 - D20",
    93: "T19 - D18",
    92: "T20 - D16",
    91: "T17 - D20",
    90: "T20 - D15",
    89: "T19 - D16",
    88: "T16 - D20",
    87: "T17 - D18",
    86: "T18 - D16",
    85: "T15 - D20",
    84: "T16 - D18",
    83: "T17 - D16",
    82: "T14 - D20",
    81: "T15 - D18",
    80: "T20 - D10",
    79: "T13 - D20",
    78: "T14 - D18",
    77: "T15 - D16",
    76: "T20 - D8",
    75: "T17 - D12",
    74: "T14 - D16",
    73: "T19 - S8 - D4",
    72: "T16 - D12",
    71: "T13 - D16",
    70: "T18 - D8",
    69: "T15 - S12 - D6",
    68: "T16 - D10",
    67: "T17 - D8",
    66: "T14 - D12",
    65: "T15 - D10",
    64: "T16 - D8",
    63: "T13 - D12",
    62: "T10 - D16",
    61: "T11 - D14",
    60: "S20 - D20",
    59: "S19 - D20",
    58: "S18 - D20",
    57: "S17 - D20",
    56: "S16 - D20",
    55: "S15 - D20",
    54: "S14 - D20",
    53: "S13 - D20",
    52: "S12 - D20",
    51: "S11 - D20",
    50: "Bullseye",
    49: "S17 - D16",
    48: "S16 - D16",
    47: "S15 - D16",
    46: "S6 - D20",
    45: "S13 - D16",
    44: "S12 - D16",
    43: "S3 - D20",
    42: "S10 - D16",
    41: "S9 - D16",
    40: "D20",
    39: "S7 - D16",
    38: "D19",
    37: "S5 - D16",
    36: "D18",
    35: "S3 - D16",
    34: "D17",
    33: "S1 - D16",
    32: "D16",
    31: "S15 - D8",
    30: "D15",
    29: "S13 - D8",
    28: "D14",
    27: "S11 - D8",
    26: "D13",
    24: "D12",
    23: "S7 - D8",
    22: "D11",
    21: "S5 - D8",
    20: "D10",
    19: "S3 - D8",
    18: "D9",
    17: "S1 - D8",
    16: "D8",
    15: "S7 - D4",
    14: "D7",
    13: "S5 - D4",
    12: "D6",
    11: "S3 - D4",
    10: "D5",
    9: "S1 - D4",
    8: "D4",
    7: "S3 - D2",
    6: "D3",
    5: "S1 - D2",
    4: "D2",
    3: "S1 - D1",
    2: "D1",
  };

  const cloneDeep = (v) =>
    typeof window.structuredClone === "function"
      ? window.structuredClone(v)
      : JSON.parse(JSON.stringify(v));
  const getSubtotal = (throws) =>
    throws.reduce((a, t) => a + t.score * t.multiplier, 0);

  // ─────────────────────────────────────────────────────────────────────────
  // normalizeOutMode: 旧"open"など不正値を"single"に正規化（全箇所で使用）
  // ─────────────────────────────────────────────────────────────────────────
  const normalizeOutMode = (m) => {
    if (m === "open") return "single";
    return ["single", "double", "master"].includes(m) ? m : "single";
  };

  // ─────────────────────────────────────────────────────────────────────────
  // getRoundState: バースト・フィニッシュ判定
  //   isBust判定の安全ガード:
  //   ① 残り<0 → バースト
  //   ② 残り=1 かつ double/master アウト → バースト
  //   ③ 残り=0 だがアウト条件を満たさない → バースト
  // ─────────────────────────────────────────────────────────────────────────
  const getRoundState = (remaining, throws, currentOutMode) => {
    currentOutMode = normalizeOutMode(currentOutMode);
    let cur = remaining;
    for (let i = 0; i < throws.length; i++) {
      const t = throws[i];
      const pts = t.score * t.multiplier;
      // ① オーバー
      if (cur - pts < 0)
        return {
          isBust: true,
          isFinished: false,
          remainingScore: remaining,
          subtotal: 0,
        };
      cur -= pts;
      // ② レフト1はDouble/Masterでバースト
      if (
        cur === 1 &&
        (currentOutMode === "double" || currentOutMode === "master")
      )
        return {
          isBust: true,
          isFinished: false,
          remainingScore: remaining,
          subtotal: 0,
        };
      // ③ チェックアウト判定
      if (cur === 0) {
        const isBullHit = Boolean(t.isBull || t.label.includes("Bull"));
        const isDBull = t.label === "D-Bull";
        const valid =
          currentOutMode === "single" ||
          (currentOutMode === "double" && (t.multiplier === 2 || isDBull)) ||
          (currentOutMode === "master" &&
            (t.multiplier === 2 || t.multiplier === 3 || isBullHit));
        if (!valid)
          return {
            isBust: true,
            isFinished: false,
            remainingScore: remaining,
            subtotal: 0,
          };
        return {
          isBust: false,
          isFinished: true,
          remainingScore: 0,
          subtotal: getSubtotal(throws),
        };
      }
    }
    return {
      isBust: false,
      isFinished: false,
      remainingScore: cur,
      subtotal: getSubtotal(throws),
    };
  };

  const getHitSoundType = (t) => {
    if (!t || t.multiplier === 0) return "click";
    if (t.isBull || t.label.includes("Bull")) return "hit-bull";
    if (t.multiplier === 3) return "hit-triple";
    if (t.multiplier === 2) return "hit-double";
    return "hit-single";
  };

  const getThrowFromCoords = (x, y, bullType) => {
    const r = Math.sqrt(x * x + y * y);
    const rBullseye = 8.5,
      rOuterBull = 22,
      rTripleInner = 91,
      rTripleOuter = 111,
      rDoubleInner = 153,
      rDoubleOuter = 170,
      rOOB = 188;
    // D-Bull = 50点固定。multiplier:1 にしないと getSubtotal で 100点になる
    if (r <= rBullseye)
      return { score: 50, multiplier: 1, x, y, label: "D-Bull", isBull: true };
    if (r <= rOuterBull)
      return bullType === "fat"
        ? { score: 50, multiplier: 1, x, y, label: "Bull(50)", isBull: true }
        : { score: 25, multiplier: 1, x, y, label: "S-Bull(25)", isBull: true };
    const deg = (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
    const idx = Math.floor(((deg + 90 + 9) % 360) / 18);
    const scoreNum = WEDGES[idx];
    let score = scoreNum,
      multiplier = 1,
      label = `${score}`;
    if (r >= rTripleInner && r <= rTripleOuter) {
      multiplier = 3;
      label = `T${scoreNum}`;
    } else if (r >= rDoubleInner && r <= rDoubleOuter) {
      multiplier = 2;
      label = `D${scoreNum}`;
    } else if (r > rOOB) {
      score = 0;
      multiplier = 0;
      label = "Miss";
    } else {
      multiplier = 1;
      label = `S${scoreNum}`;
    }
    return { score, multiplier, x, y, label, isBull: false };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // getSteelDartsArrangement: 高得点セットアップルート
  //   301以上 → T20を何本入れれば180以内になるか計算して提示
  // ─────────────────────────────────────────────────────────────────────────
  const getSteelDartsArrangement = (score, bullType, outMode) => {
    outMode = normalizeOutMode(outMode);
    if (score > 501 || score <= 0) return null;

    // 25点の特殊処理
    if (score === 25) {
      if (outMode === "single")
        return bullType === "separate" ? "S-Bull" : "Bull";
      return bullType === "separate" ? "S17 - D4" : null;
    }

    // 50点
    if (score === 50) return bullType === "separate" ? "D-Bull" : "Bull";

    // 171～180: ARRANGE_TABLEに載っている例外スコア
    const impossible170 = [169, 168, 166, 165, 163, 162, 159];
    if (impossible170.includes(score)) {
      const fallback = {
        169: "T20 - T19 → 52",
        168: "T20 - T20 → 48",
        166: "T20 - T18 → 52",
        165: "T20 - T19 → 48",
        163: "T20 - T17 → 52",
        162: "T20 - T20 → 42",
        159: "T19 - T20 → 42",
      };
      return fallback[score];
    }

    // 2～170: テーブル参照
    if (score <= 170 && ARRANGE_TABLE[score]) return ARRANGE_TABLE[score];

    // 171～501: T20連打で削る最適ルート計算
    // 何本T20を入れれば残りが ARRANGE_TABLEで解けるスコアになるか探索
    const T20 = 60;
    for (let n = 1; n <= 3; n++) {
      const rem = score - T20 * n;
      if (rem <= 0) break;
      if (n === 3) {
        // 3本ともT20しか入らない → "T20 × 3" ペースで表示
        return `T20 - T20 - T20 (×${Math.ceil(score / 180)})`;
      }
      // rem が解けるスコアかチェック (180以下 かつ impossible外 かつ テーブルにある)
      if (rem <= 170 && !impossible170.includes(rem) && ARRANGE_TABLE[rem]) {
        const prefix = n === 1 ? "T20" : "T20 - T20";
        return `${prefix} - ${ARRANGE_TABLE[rem].split(" - ")[0]}…`;
      }
      // rem が 171-180 の場合: ARRANGE_TABLE[171..170] は手動テーブルにある
      if (rem >= 171 && rem <= 180) {
        const prefix = n === 1 ? "T20" : "T20 - T20";
        return `${prefix} → ${rem}`;
      }
    }

    // フォールバック: T20連打ペース提示
    const turns = Math.ceil(score / 180);
    return `T20 × 3 pace (${turns} turns)`;
  };

  // ═══════════════════════════════════════════════════════════════════════
  // ▼▼▼ チェックアウト/スコアリング関連ロジック（CPU・人間アシスト共有） ▼▼▼
  // 将来ファイル分割する場合の想定切り出し単位:
  //   checkout.js   → findCheckoutRoute, getSteelDartsArrangement
  //   scoring.js    → scoreLeaveQuality, findHighScorePlan, buildAssistLine
  //   difficulty.js → CPU_DIFFICULTY
  //   strategy.js   → cpuComputeThrow, cpuPlayTurn （CPU専用、人間UIは使わない）
  // 現状は単一HTML+CDN React構成（ビルドステップなし）のため分割は保留。
  // ビルドツール導入時にこの範囲をそのまま抜き出せるよう、
  // 外部state/propsへの依存を増やさないこと。
  // ═══════════════════════════════════════════════════════════════════════
  // ─────────────────────────────────────────────────────────────────────────
  // findCheckoutRoute: 動的チェックアウト探索
  //   checkoutPref: "double"|"triple"|"single"
  // ─────────────────────────────────────────────────────────────────────────
  const findCheckoutRoute = (
    score,
    dartsLeft,
    bullType,
    outMode,
    checkoutPref = "double",
  ) => {
    outMode = normalizeOutMode(outMode);
    if (score <= 0 || dartsLeft <= 0) return null;

    const isValidOut = (mult, isBull) => {
      if (outMode === "single") return true;
      if (outMode === "double") return mult === 2;
      if (outMode === "master") return mult === 2 || mult === 3 || isBull;
      return false;
    };

    // 1本フィニッシュ候補 (checkoutPref順にソート)
    const finish1 = () => {
      const cs = [];
      if (score === 50) cs.push({ label: "D-Bull", mult: 2, isBull: true });
      if (bullType === "fat" && score === 50)
        cs.push({ label: "Bull", mult: 1, isBull: true });
      if (bullType === "separate" && score === 25)
        cs.push({ label: "S-Bull", mult: 1, isBull: true });
      if (score % 2 === 0 && score <= 40) {
        const n = score / 2;
        if (WEDGES.includes(n))
          cs.push({ label: `D${n}`, mult: 2, isBull: false });
      }
      if (score % 3 === 0 && score <= 60) {
        const n = score / 3;
        if (WEDGES.includes(n))
          cs.push({ label: `T${n}`, mult: 3, isBull: false });
      }
      if (score <= 20 && WEDGES.includes(score))
        cs.push({ label: `S${score}`, mult: 1, isBull: false });
      const ord =
        checkoutPref === "triple"
          ? [3, 2, 1]
          : checkoutPref === "single"
            ? [1, 2, 3]
            : [2, 3, 1];
      cs.sort((a, b) => {
        if (a.isBull && !b.isBull) return -1;
        if (!a.isBull && b.isBull) return 1;
        return ord.indexOf(a.mult) - ord.indexOf(b.mult);
      });
      return cs;
    };
    for (const c of finish1()) {
      if (isValidOut(c.mult, c.isBull)) return { route: c.label, inDarts: 1 };
    }

    if (dartsLeft < 2) return null;

    // 前段ショット候補 (高得点トリプル優先)
    const prefer = [
      20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
    ];
    const setups = [];
    prefer.forEach((w) => {
      setups.push({ label: `T${w}`, pts: w * 3 });
      setups.push({ label: `D${w}`, pts: w * 2 });
      setups.push({ label: `S${w}`, pts: w });
    });
    setups.push({ label: "D-Bull", pts: 50 });
    setups.push({
      label: bullType === "fat" ? "Bull" : "S-Bull",
      pts: bullType === "fat" ? 50 : 25,
    });

    for (const s of setups) {
      const next = score - s.pts;
      if (next <= 0) continue;
      if (next === 1 && outMode !== "single") continue;
      const fin = findCheckoutRoute(
        next,
        dartsLeft - 1,
        bullType,
        outMode,
        checkoutPref,
      );
      if (fin)
        return { route: `${s.label} - ${fin.route}`, inDarts: fin.inDarts + 1 };
    }
    return null;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // buildAssistLine: アシストバーテキスト生成
  //   ・投げた後の残り点数を追跡
  //   ・301以上でも getSteelDartsArrangement が「次のT20でどこまで削るか」を返す
  //   ・残り点数と残り投げ数を右側に常時表示
  // ─────────────────────────────────────────────────────────────────────────
  const compactRoute = (route) => route.replace(/\s*-\s*/g, "-");

  const BOGEY_NUMBERS = new Set([169, 168, 166, 165, 163, 162, 159]);
  const PREFERRED_LEAVES = [
    170, 167, 164, 161, 160, 158, 157, 156, 155, 154, 152, 151, 150, 149, 148,
    147, 146, 145, 144, 143, 142, 141, 140, 138, 136, 132, 130, 128, 127, 126,
    124, 121, 120, 118, 116, 110, 108, 104, 100, 96, 95, 92, 90, 88, 86, 84, 82,
    81, 80, 72, 64, 60, 56, 52, 50, 48, 40, 36, 32, 24, 16, 8,
  ];
  const LEAVE_PRIORITY = new Map(
    PREFERRED_LEAVES.map((v, i) => [v, PREFERRED_LEAVES.length - i]),
  );

  const scoreLeaveQuality = (
    leave,
    bullType,
    outMode,
    checkoutPref = "double",
  ) => {
    outMode = normalizeOutMode(outMode);
    if (leave <= 0) return -999999;
    if (outMode !== "single" && leave === 1) return -999999;
    let score = 0;
    if (BOGEY_NUMBERS.has(leave)) score -= 2500;
    const in1 = findCheckoutRoute(leave, 1, bullType, outMode, checkoutPref);
    const in2 = findCheckoutRoute(leave, 2, bullType, outMode, checkoutPref);
    const in3 = findCheckoutRoute(leave, 3, bullType, outMode, checkoutPref);
    if (in1) score += 9000;
    else if (in2) score += 7800;
    else if (in3) score += 6500;
    else if (leave <= 170) score += 4200;
    else score += Math.max(0, 2600 - Math.max(0, leave - 170) * 18);
    score += LEAVE_PRIORITY.get(leave) || 0;
    if (outMode !== "single" && leave % 2 === 0 && leave <= 40) score += 260;
    if ([40, 32, 24, 16, 8].includes(leave)) score += 140;
    if (leave > 170) score -= (leave - 170) * 2;
    return score;
  };


  // ─────────────────────────────────────────────────────────────────────────
  // CPU ENGINE: 難易度付きCPUスロー
  //   difficulty: "easy"|"medium"|"hard"|"pro"
  //   pro  = ほぼ理想値（±5点のブレ）
  //   hard = ±15点のブレ、たまにバースト狙いが外れる
  //   medium = ±30点、ランダム要素大
  //   easy = ±50点、1~4投分をランダムに落とす
  // ─────────────────────────────────────────────────────────────────────────
  // CPU難易度パラメータ定義
  //   spread          : 狙った点数に対するばらつきの最大値（±spread点）。
  //                     大きいほど散らばる＝下手。cpuComputeThrowの通常ショットで使用。
  //   dropChance      : 1投ごとの「投げ損ない(MISS)」発生確率（0〜1）。
  //                     cpuPlayTurnのループ内で、対象ダーツ(i)がdropDarts範囲に入っているときのみ判定される。
  //   dropDarts       : 1ターン3投のうち、終盤何投がdropChance判定の対象になるか。
  //                     例: dropDarts=1 なら3投目だけが対象、dropDarts=2 なら2,3投目が対象。
  //                     0にすると一切ドロップしない（pro想定）。
  //   checkoutHitProb : チェックアウトルートを狙った際に成功する確率（0〜1）。
  //                     findCheckoutRouteで有効なルートが見つかった場合のみ参照される。
  //                     失敗時は通常ショット計算にフォールバックする。
  const CPU_DIFFICULTY = {
    easy:   { spread: 55, dropChance: 0.40, dropDarts: 2, checkoutHitProb: 0.10 },
    medium: { spread: 35, dropChance: 0.18, dropDarts: 1, checkoutHitProb: 0.30 },
    hard:   { spread: 20, dropChance: 0.08, dropDarts: 1, checkoutHitProb: 0.60 },
    pro:    { spread: 8,  dropChance: 0.02, dropDarts: 0, checkoutHitProb: 0.82 },
  };

  const cpuComputeThrow = (remaining, gameMode, outMode, difficulty, bullType) => {
    const cfg = CPU_DIFFICULTY[difficulty] || CPU_DIFFICULTY.medium;
    outMode = normalizeOutMode(outMode);

    // Count-Upならとにかく高得点狙い（T20が理想値）
    const safeRemaining = Math.max(2, remaining);
    const margin = outMode !== "single" ? 2 : 1;
    const idealScore = gameMode === "countup" ? 60 : Math.min(safeRemaining - margin, 60);

    // ばらつきを加算（残り点数を超えないようにガード、最小1点）
    const spread = Math.round((Math.random() * 2 - 1) * cfg.spread);
    let pts = Math.max(1, Math.min(60, Math.min(Math.max(1, idealScore + spread), safeRemaining - margin)));

    // 01ゲーム: チェックアウト可能なら狙う
    if (gameMode === "01" && remaining <= 170) {
      const checkout = findCheckoutRoute(remaining, 3, bullType, outMode, "double");
      if (checkout) {
        // proは高確率で決める、easyは低確率
        const hitProb = cfg.checkoutHitProb ?? 0.4;
        if (Math.random() < hitProb) {
          // チェックアウトルートの最初のショットを採用
          // " - " で分割して D-Bull が壊れないようにする
          const first = checkout.route.split(" - ")[0].trim();
          const isTriple = first.startsWith("T") && !first.includes("Bull");
          const isDouble = first.startsWith("D") && !first.includes("Bull");
          const isSingleBull = first === "S-Bull" || first === "S-Bull(25)";
          const isBull = first.includes("Bull");
          const bullScore = isSingleBull ? 25 : 50;
          const num = isBull ? bullScore : parseInt(first.replace(/^[TDS]/,"")) || 0;
          return {
            score: isBull ? bullScore : num,
            multiplier: isBull ? 1 : isTriple ? 3 : isDouble ? 2 : 1,
            label: first.trim(),
            isBull
          };
        }
      }
    }

    // 通常ショット：pts を近いウェッジ値に変換
    let mult = 1, num = pts;
    if (pts >= 40 && pts % 3 === 0 && pts <= 60) { mult = 3; num = pts / 3; }
    else if (pts >= 2 && pts % 2 === 0 && pts <= 40) { mult = 2; num = pts / 2; }
    else if (pts > 20) { mult = 3; num = 20; pts = 60; }
    // WEDGES にない番号を最近傍に丸める
    const nearest = WEDGES.reduce((a,b) => Math.abs(b-num)<Math.abs(a-num)?b:a, WEDGES[0]);
    num = nearest;
    pts = num * mult;

    return {
      score: pts === 0 ? 0 : num,
      multiplier: pts === 0 ? 0 : mult,
      label: pts === 0 ? "MISS" : `${mult===3?"T":mult===2?"D":"S"}${num}`,
      isBull: false
    };
  };

  // CPU がターン分（3投）計算して返す
  const cpuPlayTurn = (remaining, gameMode, outMode, difficulty, bullType) => {
    const cfg = CPU_DIFFICULTY[difficulty] || CPU_DIFFICULTY.medium;
    outMode = normalizeOutMode(outMode);
    const throws = [];
    let cur = remaining;

    for (let i = 0; i < 3; i++) {
      // ドロップ（投げ損ない）判定
      if (Math.random() < cfg.dropChance && i >= (3 - cfg.dropDarts)) break;

      const t = cpuComputeThrow(cur, gameMode, outMode, difficulty, bullType);
      const pts = t.score * t.multiplier;

      // 座標を近似
      let rx = 0, ry = 0;
      if (t.multiplier === 0) {
        const d = 188, a = Math.random() * Math.PI * 2;
        rx = Math.round(d * Math.cos(a)); ry = Math.round(d * Math.sin(a));
      } else if (t.isBull) {
        const d = 4, a = Math.random() * Math.PI * 2;
        rx = Math.round(d * Math.cos(a)); ry = Math.round(d * Math.sin(a));
      } else {
        const d = t.multiplier === 3 ? 101 : t.multiplier === 2 ? 165 : 133;
        const idx = WEDGES.indexOf(t.score);
        const a = (idx * 18 - 90) * Math.PI / 180;
        rx = Math.round(d * Math.cos(a)); ry = Math.round(d * Math.sin(a));
      }

      // 01ゲームはバースト判定（人間と同様、投げてから判定）
      if (gameMode === "01") {
        if (cur - pts < 0 || (cur - pts === 1 && outMode !== "single")) {
          // バースト: 投擲を記録してターン終了
          throws.push({ ...t, x: rx, y: ry });
          break;
        }
      }

      throws.push({ ...t, x: rx, y: ry });
      cur -= pts;
      // 0点（チェックアウト）または1点残り（ダブルアウト不可）で即終了
      if (cur <= 0) break;
      if (cur === 1 && outMode !== "single") break;
      // 安全策: 3投を超えた場合は強制終了（防衛コード）
      if (throws.length >= 3) break;
    }
    return throws.slice(0, 3); // 絶対に3投を超えない
  };
  // ▲▲▲ チェックアウト/スコアリング/CPU関連ロジック ここまで ▲▲▲

  const findHighScorePlan = (
    score,
    dartsLeft,
    bullType,
    outMode,
    checkoutPref = "double",
  ) => {
    outMode = normalizeOutMode(outMode);
    if (score <= 180 || dartsLeft <= 0) return null;
    const shots = [
      { label: "T20", pts: 60 },
      { label: "T19", pts: 57 },
      { label: "T18", pts: 54 },
      { label: "T17", pts: 51 },
      { label: "T16", pts: 48 },
      { label: "T15", pts: 45 },
      { label: "S20", pts: 20 },
      { label: "S19", pts: 19 },
    ];
    let best = null;
    const search = (remaining, depth, route, scored) => {
      if (depth === 0) {
        const leaveScore = scoreLeaveQuality(
          remaining,
          bullType,
          outMode,
          checkoutPref,
        );
        const candidate = { route: [...route], remaining, leaveScore, scored };
        if (
          !best ||
          leaveScore > best.leaveScore ||
          (leaveScore === best.leaveScore && scored > best.scored)
        )
          best = candidate;
        return;
      }
      shots.forEach((shot) => {
        const next = remaining - shot.pts;
        if (next <= 0) return;
        if (outMode !== "single" && next === 1) return;
        search(next, depth - 1, [...route, shot.label], scored + shot.pts);
      });
    };
    search(score, dartsLeft, [], 0);
    if (!best || best.route.length === 0) return null;
    return `${best.route.join("-")} → ${best.remaining}`;
  };

  const buildAssistLine = (
    remainingAtStart,
    currentThrows,
    bullType,
    outMode,
    checkoutPref = "double",
  ) => {
    outMode = normalizeOutMode(outMode);
    // getRoundState で正確なバースト・残り点数を計算（useMemoとの同期ずれなし）
    const rs = getRoundState(remainingAtStart, currentThrows, outMode);
    const dartsLeft = MAX_THROWS_PER_TURN - currentThrows.length;
    const cur = rs.remainingScore;

    if (rs.isBust)
      return { text: "BUST", sub: "", color: "text-rose-500", pulse: false };
    if (rs.isFinished)
      return {
        text: "CHECKOUT ✓",
        sub: "",
        color: "text-emerald-400",
        pulse: true,
      };
    if (cur > 501)
      return { text: "", sub: "", color: "text-zinc-700", pulse: false };

    const sub = dartsLeft > 0 ? `${cur} · ${dartsLeft}🎯` : `${cur}`;

    // 180超: 残り投げ数に応じて、次ターンの標準チェックアウトに繋がる leave を優先
    if (cur > 180) {
      const hint =
        findHighScorePlan(cur, dartsLeft, bullType, outMode, checkoutPref) ||
        getSteelDartsArrangement(cur, bullType, outMode) ||
        "T20-T20-T20";
      return {
        text: compactRoute(hint),
        sub,
        color: "text-zinc-500",
        pulse: false,
      };
    }

    if (dartsLeft === 0)
      return {
        text: String(cur),
        sub: "",
        color: "text-zinc-500",
        pulse: false,
      };

    // チェックアウト探索
    const result = findCheckoutRoute(
      cur,
      dartsLeft,
      bullType,
      outMode,
      checkoutPref,
    );
    if (!result) {
      const fallback = getSteelDartsArrangement(cur, bullType, outMode);
      return {
        text: fallback ? compactRoute(fallback) : "SETUP",
        sub,
        color: "text-zinc-500",
        pulse: false,
      };
    }
    const isFinishable = result.inDarts === dartsLeft;
    return {
      text: compactRoute(result.route),
      sub,
      color: isFinishable ? "text-amber-300" : "text-amber-400",
      pulse: isFinishable,
    };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Count-Up: ラウンド平均ペース計算
  // ─────────────────────────────────────────────────────────────────────────
  const buildCountUpAssist = (player, currentThrows, totalRounds) => {
    const roundsDone = player.history.length;
    const currentPts = getSubtotal(currentThrows);
    const total = player.accumulatedScore + currentPts;
    const roundsPlayed = roundsDone + (currentThrows.length > 0 ? 1 : 0);
    if (roundsPlayed === 0)
      return {
        text: `目標 ≈ ${totalRounds * 40}`,
        sub: "",
        color: "text-zinc-500",
        pulse: false,
      };
    const avg = Math.round(total / roundsPlayed);
    const projected = avg * totalRounds;
    const remaining = totalRounds - roundsDone;
    return {
      text: `AVG ${avg}/R → 予測 ${projected}`,
      sub: `残 ${remaining}R`,
      color: avg >= 40 ? "text-amber-300" : "text-zinc-500",
      pulse: false,
    };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Icons
  // ─────────────────────────────────────────────────────────────────────────
  const Icons = {
    Volume2: () =>
      React.createElement(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          width: "13",
          height: "13",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "2.5",
          strokeLinecap: "round",
          strokeLinejoin: "round",
        },
        React.createElement("polygon", {
          points: "11 5 6 9 2 9 2 15 6 15 11 19 11 5",
        }),
        React.createElement("path", { d: "M15.54 8.46a5 5 0 0 1 0 7.07" }),
        React.createElement("path", { d: "M19.07 4.93a10 10 0 0 1 0 14.14" }),
      ),
    VolumeX: () =>
      React.createElement(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          width: "13",
          height: "13",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "2.5",
          strokeLinecap: "round",
          strokeLinejoin: "round",
        },
        React.createElement("polygon", {
          points: "11 5 6 9 2 9 2 15 6 15 11 19 11 5",
        }),
        React.createElement("line", { x1: "22", y1: "9", x2: "16", y2: "15" }),
        React.createElement("line", { x1: "16", y1: "9", x2: "22", y2: "15" }),
      ),
    HelpCircle: () =>
      React.createElement(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          width: "12",
          height: "12",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "2.5",
          strokeLinecap: "round",
          strokeLinejoin: "round",
        },
        React.createElement("circle", { cx: "12", cy: "12", r: "10" }),
        React.createElement("path", {
          d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3",
        }),
        React.createElement("line", {
          x1: "12",
          y1: "17",
          x2: "12.01",
          y2: "17",
        }),
      ),
    Settings: () =>
      React.createElement(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          width: "12",
          height: "12",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "2.5",
          strokeLinecap: "round",
          strokeLinejoin: "round",
        },
        React.createElement("circle", { cx: "12", cy: "12", r: "3" }),
        React.createElement("path", {
          d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
        }),
      ),
    Undo2: () =>
      React.createElement(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "3",
          strokeLinecap: "round",
          strokeLinejoin: "round",
        },
        React.createElement("path", { d: "M3 7v6h6" }),
        React.createElement("path", {
          d: "M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13",
        }),
      ),
    Trash2: () =>
      React.createElement(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "3",
          strokeLinecap: "round",
          strokeLinejoin: "round",
        },
        React.createElement("polyline", { points: "3 6 5 6 21 6" }),
        React.createElement("path", {
          d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
        }),
        React.createElement("line", { x1: "10", y1: "11", x2: "10", y2: "17" }),
        React.createElement("line", { x1: "14", y1: "11", x2: "14", y2: "17" }),
      ),
    X: () =>
      React.createElement(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          width: "13",
          height: "13",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "2.5",
          strokeLinecap: "round",
          strokeLinejoin: "round",
        },
        React.createElement("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
        React.createElement("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
      ),
    RotateCcw: () =>
      React.createElement(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "3",
          strokeLinecap: "round",
          strokeLinejoin: "round",
        },
        React.createElement("path", {
          d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",
        }),
        React.createElement("polyline", { points: "3 3 3 8 8 8" }),
      ),
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Fliqlo Flip Clock
  // ─────────────────────────────────────────────────────────────────────────
  const FliqloDigit = ({ value, isActive, isBust }) => {
    const [currentVal, setCurrentVal] = useState(value);
    const [nextVal, setNextVal] = useState(value);
    const [isFlipping, setIsFlipping] = useState(false);
    const timerRef = useRef(null);
    useEffect(() => {
      if (value === currentVal) return;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        setIsFlipping(false);
      }
      setNextVal(value);
      setIsFlipping(true);
      timerRef.current = setTimeout(() => {
        setCurrentVal(value);
        setIsFlipping(false);
        timerRef.current = null;
      }, 320);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }, [value]);
    const dc = currentVal === "\xA0" ? "" : currentVal;
    const dn = nextVal === "\xA0" ? "" : nextVal;
    const activeClass = isActive
      ? "ring-2 ring-amber-500/50 shadow-[0_0_25px_rgba(245,158,11,0.2)]"
      : "opacity-75";
    const textClass = `font-fliqlo font-black fliqlo-text leading-none tracking-tighter ${isBust ? "text-rose-500" : "text-neutral-100"}`;
    return React.createElement(
      "div",
      {
        className: `relative fliqlo-tile flip-container select-none rounded-xl transition-all duration-300 ${activeClass}`,
      },
      React.createElement("div", { className: "hinge-left" }),
      React.createElement("div", { className: "hinge-right" }),
      React.createElement(
        "div",
        { className: "card-half card-top-bg fliqlo-card" },
        React.createElement(
          "div",
          { className: `card-half-inner card-top-inner ${textClass}` },
          dn,
        ),
      ),
      React.createElement(
        "div",
        { className: "card-half card-bottom-bg fliqlo-card" },
        React.createElement(
          "div",
          { className: `card-half-inner card-bottom-inner ${textClass}` },
          dc,
        ),
      ),
      isFlipping
        ? React.createElement(
            React.Fragment,
            null,
            React.createElement(
              "div",
              { className: "card-half card-top-flip fliqlo-card" },
              React.createElement(
                "div",
                { className: `card-half-inner card-top-inner ${textClass}` },
                dc,
              ),
            ),
            React.createElement(
              "div",
              { className: "card-half card-bottom-flip fliqlo-card" },
              React.createElement(
                "div",
                { className: `card-half-inner card-bottom-inner ${textClass}` },
                dn,
              ),
            ),
          )
        : React.createElement(
            React.Fragment,
            null,
            React.createElement(
              "div",
              {
                className: "card-half card-top-bg fliqlo-card",
                style: { zIndex: 20 },
              },
              React.createElement(
                "div",
                { className: `card-half-inner card-top-inner ${textClass}` },
                dc,
              ),
            ),
            React.createElement(
              "div",
              {
                className: "card-half card-bottom-bg fliqlo-card",
                style: { zIndex: 20 },
              },
              React.createElement(
                "div",
                { className: `card-half-inner card-bottom-inner ${textClass}` },
                dc,
              ),
            ),
          ),
    );
  };

  const FliqloScoreboard = ({ score, isActive, isBust }) => {
    const s = String(score)
      .padStart(3, " ")
      .split("")
      .map((d) => (d === " " ? "\xA0" : d));
    return React.createElement(
      "div",
      { className: "flex space-x-1.5 justify-center items-center" },
      s.map((d, i) =>
        React.createElement(FliqloDigit, {
          key: i,
          value: d,
          isActive,
          isBust,
        }),
      ),
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PlayerCockpit: スコアボード + 履歴パネル
  // ─────────────────────────────────────────────────────────────────────────
  const PlayerCockpit = ({
    player,
    displayScore,
    isActive,
    isBust,
    alignment,
    label,
    gameMode,
    isCpuPending,
  }) =>
    React.createElement(
      "div",
      {
        className:
          "flex flex-col justify-between h-full gap-2 bg-black/10 p-1.5 rounded-2xl border border-zinc-900/40 relative",
      },
      React.createElement(
        "div",
        null,
        React.createElement(
          "div",
          { className: "mb-1.5 px-0.5" },
          isCpuPending
            ? React.createElement(
                "div",
                { className: "active-player-banner", style: { borderColor: "rgba(99,102,241,0.5)", background: "rgba(99,102,241,0.08)" } },
                React.createElement("span", { className: "dot", style: { background: "#818cf8" } }),
                React.createElement("span", { className: "truncate text-indigo-300" }, player.name),
                React.createElement("span", { className: "text-indigo-400/70 text-[7px] font-bold shrink-0 animate-pulse" }, "THINKING..."),
              )
            : isActive
            ? React.createElement(
                "div",
                { className: "active-player-banner" },
                React.createElement("span", { className: "dot" }),
                React.createElement("span", { className: "truncate" }, player.name),
                React.createElement("span", { className: "text-amber-500/60 text-[7px] font-bold shrink-0" }, "YOUR TURN"),
              )
            : React.createElement(
                "div",
                { className: "px-1 py-1 rounded-lg text-center" },
                React.createElement(
                  "span",
                  { className: "text-[9px] font-black text-zinc-600 tracking-widest truncate uppercase block" },
                  player.name,
                ),
              ),
        ),
        React.createElement(FliqloScoreboard, {
          score: displayScore,
          isActive,
          isBust,
        }),
      ),
      // BUST強調オーバーレイ
      isBust && React.createElement(
        "div",
        { 
          className: "absolute inset-0 flex items-center justify-center bg-rose-600/90 backdrop-blur-sm rounded-2xl z-10 pointer-events-none" 
        },
        React.createElement(
          "span", 
          { 
            className: "text-5xl font-black text-white tracking-[0.1em] animate-pulse drop-shadow-2xl" 
          }, 
          "BUST"
        )
      ),
      React.createElement(
        "div",
        {
          className:
            "soft-metal panel-glow border border-zinc-800/90 rounded-xl overflow-hidden",
        },
        React.createElement(
          "span",
          {
            className:
              "text-[7px] font-mono text-zinc-600 block text-center border-b border-zinc-900 py-0.5 font-bold tracking-widest uppercase",
          },
          label,
        ),
        React.createElement(
          "div",
          { className: "overflow-y-auto h-20 md:h-24 no-scrollbar" },
          player.history.length === 0
            ? React.createElement(
                "div",
                {
                  className: "text-zinc-700 italic text-center py-3 text-[7px]",
                },
                "— no rounds —",
              )
            : player.history.map((h, idx) =>
                gameMode === "countup"
                  ? React.createElement(
                      "div",
                      {
                        key: idx,
                        className:
                          "flex items-center justify-between px-2 py-1 border-b border-zinc-800/40 last:border-0",
                      },
                      React.createElement(
                        "span",
                        {
                          className:
                            "text-[7px] font-bold text-zinc-600 w-5 shrink-0",
                        },
                        "R",
                        h.roundNum,
                      ),
                      React.createElement(
                        "span",
                        {
                          className:
                            "text-[8px] font-mono flex-1 text-center truncate px-1 text-zinc-300 font-bold",
                        },
                        h.throws.map((t) => t.label).join(" · "),
                      ),
                      React.createElement(
                        "span",
                        {
                          className:
                            "text-[8px] font-black w-10 text-right shrink-0 text-amber-400",
                        },
                        "+",
                        h.roundScore,
                      ),
                    )
                  : React.createElement(
                      "div",
                      {
                        key: idx,
                        className:
                          "flex items-center justify-between px-2 py-1 border-b border-zinc-800/40 last:border-0",
                      },
                      React.createElement(
                        "span",
                        {
                          className:
                            "text-[7px] font-bold text-zinc-600 w-5 shrink-0",
                        },
                        "R",
                        h.roundNum,
                      ),
                      React.createElement(
                        "span",
                        {
                          className: `text-[8px] font-mono flex-1 text-center truncate px-1 ${h.isBurst ? "text-rose-500 line-through" : "text-zinc-300 font-bold"}`,
                        },
                        h.throws.map((t) => t.label).join(" · "),
                      ),
                      React.createElement(
                        "span",
                        {
                          className: `text-[8px] font-black w-10 text-right shrink-0 ${h.isBurst ? "text-rose-500" : "text-amber-400"}`,
                        },
                        h.isBurst ? "BUST" : h.roundScore,
                      ),
                    ),
              ),
        ),
      ),
    );

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN APP
  // ─────────────────────────────────────────────────────────────────────────
  function App() {
    // ── ゲーム設定 ──
    // ★ 新しいstateを追加するときの4点チェックリスト ★
    // 1. useState宣言（ここ）
    // 2. CPU useEffect内で参照する場合 → useRef宣言(~L1285) + Ref同期(~L1299)
    // 3. localStorage保存リスト(~L1519) に追加
    // 4. handleRestoreSave(~L2030) で復元
    const [gameMode, setGameMode] = useState("01");       // "01" | "countup"
    const [playerCount, setPlayerCount] = useState(2);    // 1 | 2
    const [cpuMode, setCpuMode] = useState(false);        // CPU対戦ON/OFF
    const [cpuDifficulty, setCpuDifficulty] = useState("medium"); // easy|medium|hard|pro
    const [helpLang, setHelpLang] = useState("ja"); // "ja" | "en" — デフォルト日本語
    const [p1StartScore, setP1StartScore] = useState(501);
    const [p2StartScore, setP2StartScore] = useState(501);
    const [outMode, setOutMode] = useState("single");
    const [checkoutPref, setCheckoutPref] = useState("double");
    const [bullType, setBullType] = useState("separate");
    const [cuRounds, setCuRounds] = useState(COUNT_UP_ROUNDS);
    const [o1MaxRounds, setO1MaxRounds] = useState(null); // null = ∞
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [showHowTo, setShowHowTo] = useState(false);
    const [showSettingsSetup, setShowSettingsSetup] = useState(true);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [showQuitConfirm, setShowQuitConfirm] = useState(false);
    const [hasRestorableSave, setHasRestorableSave] = useState(false);

    const audioCtxRef = useRef(null);

    // ── プレイヤー状態 ──
    // 01ゲーム: remainingScore を使用
    // Count-Up: accumulatedScore を使用
    const makePlayer = (id, name, startScore) => ({
      id,
      name,
      initialScore: startScore,
      remainingScore: startScore,
      accumulatedScore: 0,
      history: [],
    });

    const [players, setPlayers] = useState([
      makePlayer("p1", "PLAYER 1", 501),
      makePlayer("p2", "PLAYER 2", 501),
    ]);
    const [activePlayerIndex, setActivePlayerIndex] = useState(0);
    const [currentThrows, setCurrentThrows] = useState([]);
    const [editingThrowIndex, setEditingThrowIndex] = useState(null);
    const [padMultiplier, setPadMultiplier] = useState(1);
    const [turnHistoryState, setTurnHistoryState] = useState([]);
    const [winner, setWinner] = useState(null);
    const [confirmStage, setConfirmStage] = useState("throwing");
    const [undoConfirmStage, setUndoConfirmStage] = useState("idle");
    const boardRef = useRef(null);
    const currentThrowsRef = useRef([]);
    const winnerRef = useRef(null);
    // 最新stateをrefで追跡 → useEffect内のクロージャが古い値を掴む問題を防ぐ
    const playersRef = useRef(players);
    const activePlayerIndexRef = useRef(0);
    const gameModeRef = useRef("01");
    const outModeRef = useRef("single");
    const bullTypeRef = useRef("separate");
    const cuRoundsRef = useRef(COUNT_UP_ROUNDS);
    const cpuDifficultyRef = useRef("medium");
    const playerCountRef = useRef(2);
    const o1MaxRoundsRef = useRef(null);

    const activePlayer = players[activePlayerIndex];

    // 常に最新値をrefに同期
    playersRef.current = players;
    activePlayerIndexRef.current = activePlayerIndex;
    gameModeRef.current = gameMode;
    outModeRef.current = outMode;
    bullTypeRef.current = bullType;
    cuRoundsRef.current = cuRounds;
    cpuDifficultyRef.current = cpuDifficulty;
    playerCountRef.current = playerCount;
    o1MaxRoundsRef.current = o1MaxRounds;
    winnerRef.current = winner; // winner の最新値をrefに同期

    const setCurrentThrowsImmediate = (nextThrows) => {
      currentThrowsRef.current = nextThrows;
      setCurrentThrows(nextThrows);
    };

    const clearSavedGame = () => {
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch (e) {}
      setHasRestorableSave(false);
    };

    const refreshRestorableSave = () => {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!raw) {
          setHasRestorableSave(false);
          return false;
        }
        const d = JSON.parse(raw);
        const ok = Date.now() - (d.savedAt || 0) < 86400000;
        if (!ok) {
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          setHasRestorableSave(false);
          return false;
        }
        setHasRestorableSave(true);
        return true;
      } catch (e) {
        setHasRestorableSave(false);
        return false;
      }
    };

    // ── 01ゲーム用: ラウンド状態（useMemoを廃止し毎レンダーで即時計算）
    // winner確定後はroundState計算を止める（BUST等の誤表示防止）
    const roundState =
      (gameMode === "01" && !winner && confirmStage !== "gameover")
        ? getRoundState(
            activePlayer.remainingScore,
            currentThrows,
            normalizeOutMode(outMode),
          )
        : {
            isBust: false,
            isFinished: false,
            remainingScore: activePlayer.remainingScore,
            subtotal: getSubtotal(currentThrows),
          };

    const committedRoundNode =
      gameMode === "01" &&
      confirmStage === "next" &&
      activePlayer.history.length > 0
        ? activePlayer.history[0]
        : null;
    const isRoundBurst =
      gameMode === "01" && !winner &&
      (confirmStage === "next"
        ? !!(committedRoundNode && committedRoundNode.isBurst)
        : roundState.isBust);
    const currentRoundSubtotal =
      committedRoundNode && confirmStage === "next"
        ? committedRoundNode.roundScore
        : getSubtotal(currentThrows);
    // CPUが操作するのは P2(index=1) かつ throwing 中のみ（設定画面表示中は動かさない）
    // !editingThrowIndex: 編集モード中にCPUが割り込まないようにする
    const isCpuTurn = cpuMode && activePlayerIndex === 1
      && confirmStage === "throwing" && !winner && !showSettingsSetup
      && editingThrowIndex === null;

    // Count-Up用表示スコア
    const cuDisplayScore = (pi) => {
      const p = players[pi];
      const isActive = pi === activePlayerIndex;
      const added =
        isActive && confirmStage === "throwing" ? currentRoundSubtotal : 0;
      return Math.min(p.accumulatedScore + added, 9999);
    };

    // 01ゲーム用表示スコア
    const currentActiveRemaining =
      gameMode === "01"
        ? confirmStage === "next"
          ? activePlayer.remainingScore   // SOLOは常にactivePlayer使用
          : roundState.remainingScore
        : 0;
    const p1DisplayScore =
      gameMode === "countup"
        ? cuDisplayScore(0)
        : activePlayerIndex === 0
          ? currentActiveRemaining
          : players[0].remainingScore;
    const p2DisplayScore =
      gameMode === "countup"
        ? cuDisplayScore(1)
        : activePlayerIndex === 1
          ? currentActiveRemaining
          : players[1].remainingScore;

    // ── アシストバー（インライン計算 - useMemo廃止で常に最新値）──
    const assistInfo = (() => {
      // winner確定後 / gameover中はアシスト計算を止める
      if (winner || confirmStage === "gameover") return { text: "", sub: "", color: "text-zinc-700", pulse: false };
      if (isCpuTurn) return { text: "CPU THINKING...", sub: "", color: "text-indigo-400", pulse: true };
      try {
        if (gameMode === "countup") {
          return buildCountUpAssist(activePlayer, currentThrows, cuRounds);
        }
        if (confirmStage === "next") {
          if (committedRoundNode && committedRoundNode.isBurst) {
            return { text: "BUST", sub: "", color: "text-rose-500", pulse: false };
          }
          return buildAssistLine(
            activePlayer.remainingScore,
            [],
            bullType,
            normalizeOutMode(outMode),
            checkoutPref,
          );
        }
        return buildAssistLine(
          activePlayer.remainingScore,
          currentThrows,
          bullType,
          normalizeOutMode(outMode),
          checkoutPref,
        );
      } catch (e) {
        return { text: "—", sub: "", color: "text-zinc-600", pulse: false };
      }
    })();

    // ── Count-Up: 全ラウンド終了チェック ──
    const isCountUpFinished =
      gameMode === "countup" &&
      players.every((p) => p.history.length >= cuRounds);

    // ── CPU自動投擲 ──
    // 設計: タイマー1本、全stateをRefで読む、cancelledフラグで確実クリーンアップ
    const cpuCommitRef = useRef(null);
    useEffect(() => {
      if (!isCpuTurn) return;
      let cancelled = false;
      const totalDelay = 900 + Math.random() * 700;
      const tid = setTimeout(() => {
        if (cancelled) return;
        const p = playersRef.current;
        const idx = activePlayerIndexRef.current;
        const pl = p[idx];
        const gm = gameModeRef.current;
        const om = normalizeOutMode(outModeRef.current);
        const bt = bullTypeRef.current;
        const diff = cpuDifficultyRef.current;
        const cu = cuRoundsRef.current;
        const pc = playerCountRef.current;
        const remaining = gm === "countup" ? 9999 : pl.remainingScore;
        const cpuThrows = cpuPlayTurn(remaining, gm, om, diff, bt);
        // キャンセル・ゲーム終了チェック（state更新前に必ず確認）
        if (cancelled) return;
        // winnerRef で最新のwinner状態を確認（stateクロージャ問題を回避）
        if (winnerRef.current) return;
        // 投擲ゼロ（全ドロップ）= スキップ扱いでP1ターンに戻す（無限ループ防止）
        if (cpuThrows.length === 0) {
          setCurrentThrowsImmediate([]);
          setActivePlayerIndex(0);
          setConfirmStage("throwing");
          return;
        }
        const snap = { players: cloneDeep(p), activePlayerIndex: idx };
        setCurrentThrowsImmediate(cpuThrows);
        if (cancelled) { setCurrentThrowsImmediate([]); return; }
        setTurnHistoryState(prev => [...prev, snap].slice(-20));
        if (gm === "countup") {
          const pts = getSubtotal(cpuThrows);
          const node = { roundNum: pl.history.length + 1, throws: cpuThrows, roundScore: pts };
          const mp = p.map((pp, i) => i === idx
            ? { ...pp, accumulatedScore: pp.accumulatedScore + pts, history: [node, ...pp.history] } : pp);
          setPlayers(mp);
          const rel = pc === 1 ? [mp[0]] : mp;
          if (rel.every(pp => pp.history.length >= cu)) {
            const isDraw = pc === 1 ? false : mp[0].accumulatedScore === mp[1].accumulatedScore;
            const w = pc === 1 ? mp[0] : (isDraw || mp[0].accumulatedScore > mp[1].accumulatedScore) ? mp[0] : mp[1];
            setConfirmStage("gameover"); setCurrentThrowsImmediate([]);
            playSound("victory");
            setWinner({ ...w, countUpResult: true, isDraw, scores: rel.map(pp => ({ name: pp.name, score: pp.accumulatedScore })) });
          } else {
            playSound("click"); setCurrentThrowsImmediate([]); setActivePlayerIndex(0); setConfirmStage("throwing");
          }
        } else {
          const freshState = getRoundState(pl.remainingScore, cpuThrows, om);
          const nextRem = freshState.remainingScore;
          const node = { roundNum: pl.history.length + 1, throws: cpuThrows, roundScore: freshState.subtotal, remainingScore: nextRem, isBurst: freshState.isBust };
          const mp = p.map((pp, i) => i === idx ? { ...pp, remainingScore: nextRem, history: [node, ...pp.history] } : pp);
          setPlayers(mp);
          if (nextRem === 0) {
            setConfirmStage("gameover"); playSound("victory"); setWinner(mp[idx]);
          } else {
            // CPUターン終了後のラウンド上限チェック（winnerRefで二重ゲームオーバー防止）
            if (winnerRef.current) return;
            const o1Max = o1MaxRoundsRef.current;
            const nextRoundNum = mp[idx].history.length;
            // CPU(idx=1)は常にラストプレイヤー
            if (o1Max !== null && nextRoundNum >= o1Max) {
              const relevant = pc === 1 ? [mp[0]] : mp.slice(0, 2);
              const minRem = Math.min(...relevant.map(pp => pp.remainingScore));
              const winners = relevant.filter(pp => pp.remainingScore === minRem);
              const isDraw = winners.length > 1;
              const w = isDraw ? { ...winners[0], id: null } : winners[0];
              setConfirmStage("gameover"); playSound("victory");
              setWinner({ ...w, o1RoundResult: true, isDraw, scores: relevant.map(pp => ({ name: pp.name, score: pp.remainingScore })) });
            } else {
              playSound("click"); setCurrentThrowsImmediate([]); setActivePlayerIndex(0); setConfirmStage("throwing");
            }
          }
        }
      }, totalDelay);
      cpuCommitRef.current = () => { cancelled = true; clearTimeout(tid); };
      return () => {
        cancelled = true;
        clearTimeout(tid);
        cpuCommitRef.current = null;
      };
    }, [isCpuTurn]);

    // ── LocalStorage 自動保存 ──
    useEffect(() => {
      if (
        !showSettingsSetup &&
        (players[0].history.length > 0 ||
          players[1].history.length > 0 ||
          currentThrows.length > 0)
      ) {
        try {
          localStorage.setItem(
            LOCAL_STORAGE_KEY,
            JSON.stringify({
              gameMode,
              players,
              activePlayerIndex,
              currentThrows,
              outMode,
              bullType,
              turnHistoryState,
              confirmStage,
              editingThrowIndex,
              padMultiplier,
              winner,
              checkoutPref,
              cuRounds,
              o1MaxRounds,
              playerCount,
              cpuMode,
              cpuDifficulty,
              helpLang,
              savedAt: Date.now(),
              version: CURRENT_SAVE_VERSION,
            }),
          );
          setHasRestorableSave(true);
        } catch (e) {}
      }
    }, [
      gameMode,
      players,
      activePlayerIndex,
      currentThrows,
      outMode,
      bullType,
      turnHistoryState,
      confirmStage,
      editingThrowIndex,
      padMultiplier,
      winner,
      checkoutPref,
      cuRounds,
      o1MaxRounds,
      playerCount,
      cpuMode,
      cpuDifficulty,
      helpLang,
      showSettingsSetup,
    ]);

    useEffect(() => {
      refreshRestorableSave();
    }, []);

    useEffect(() => {
      const h = (e) => {
        if (e.key === "Escape" && editingThrowIndex !== null)
          setEditingThrowIndex(null);
      };
      window.addEventListener("keydown", h);
      return () => window.removeEventListener("keydown", h);
    }, [editingThrowIndex]);

    useEffect(() => {
      currentThrowsRef.current = currentThrows;
    }, [currentThrows]);

    const canAddMoreThrows =
      editingThrowIndex !== null ||
      (!roundState.isBust &&
        !roundState.isFinished &&
        currentThrows.length < MAX_THROWS_PER_TURN);
    useEffect(() => {
      setUndoConfirmStage("idle");
    }, [currentThrows]);

    // ── Audio ──
    const initAudio = () => {
      if (!audioCtxRef.current)
        audioCtxRef.current = new (
          window.AudioContext || window.webkitAudioContext
        )();
    };
    const playSound = (type) => {
      if (!soundEnabled) return;
      try {
        initAudio();
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        if (ctx.state === "suspended") ctx.resume();
        const now = ctx.currentTime;
        const mk = (type, freq, gain, dur, extra) => {
          const o = ctx.createOscillator(),
            g = ctx.createGain();
          o.type = type;
          o.frequency.setValueAtTime(freq, now);
          if (extra) extra(o, g, now);
          g.gain.setValueAtTime(gain, now);
          g.gain.linearRampToValueAtTime(0, now + dur);
          o.connect(g);
          g.connect(ctx.destination);
          o.start(now);
          o.stop(now + dur + 0.02);
        };
        switch (type) {
          case "click":
            mk("triangle", 650, 0.06, 0.06, (o) => {
              o.frequency.exponentialRampToValueAtTime(100, now + 0.05);
            });
            break;
          case "revert":
            mk("sine", 220, 0.08, 0.1, (o) => {
              o.frequency.linearRampToValueAtTime(320, now + 0.1);
            });
            break;
          case "hit-single":
            mk("triangle", 160, 0.25, 0.1, (o) => {
              o.frequency.exponentialRampToValueAtTime(60, now + 0.1);
            });
            break;
          case "hit-double":
            [440, 523].forEach((f, i) => {
              const o = ctx.createOscillator(),
                g = ctx.createGain();
              o.type = "sine";
              o.frequency.setValueAtTime(f, now + i * 0.03);
              g.gain.setValueAtTime(0.12, now + i * 0.03);
              g.gain.exponentialRampToValueAtTime(1e-3, now + 0.3);
              o.connect(g);
              g.connect(ctx.destination);
              o.start(now + i * 0.03);
              o.stop(now + 0.35);
            });
            break;
          case "hit-triple":
            [587, 698, 880].forEach((f, i) => {
              const o = ctx.createOscillator(),
                g = ctx.createGain();
              o.type = "sine";
              o.frequency.setValueAtTime(f, now + i * 0.04);
              g.gain.setValueAtTime(0.1, now + i * 0.04);
              g.gain.exponentialRampToValueAtTime(1e-3, now + 0.4);
              o.connect(g);
              g.connect(ctx.destination);
              o.start(now + i * 0.04);
              o.stop(now + 0.45);
            });
            break;
          case "hit-bull":
            {
              const o1 = ctx.createOscillator(),
                o2 = ctx.createOscillator(),
                g = ctx.createGain();
              o1.type = "sine";
              o2.type = "sine";
              o1.frequency.setValueAtTime(880, now);
              o2.frequency.setValueAtTime(1109, now);
              g.gain.setValueAtTime(0.15, now);
              g.gain.exponentialRampToValueAtTime(1e-3, now + 0.6);
              o1.connect(g);
              o2.connect(g);
              g.connect(ctx.destination);
              o1.start();
              o2.start();
              o1.stop(now + 0.65);
              o2.stop(now + 0.65);
            }
            break;
          case "burst":
            mk("sawtooth", 140, 0.1, 0.4, (o) => {
              o.frequency.exponentialRampToValueAtTime(45, now + 0.4);
            });
            break;
          case "victory":
            [261, 329, 392, 523, 659, 783].forEach((f, i) => {
              const o = ctx.createOscillator(),
                g = ctx.createGain();
              o.type = "triangle";
              o.frequency.setValueAtTime(f, now + i * 0.08);
              g.gain.setValueAtTime(0.08, now + i * 0.08);
              g.gain.exponentialRampToValueAtTime(1e-3, now + 1.2);
              o.connect(g);
              g.connect(ctx.destination);
              o.start(now + i * 0.08);
              o.stop(now + 1.3);
            });
            break;
        }
      } catch (e) {}
    };

    // ── ゲーム開始 ──
    const handleStartGame = (showSetup = false) => {
      cancelCpuTimer();
      playSound("revert");
      clearSavedGame();
      const p2IsHuman = !cpuMode && playerCount >= 2;
      const cpuLabel = `CPU (${cpuDifficulty.toUpperCase()})`;
      const p2Name = cpuMode ? cpuLabel : (playerCount === 1 ? "---" : (players[1].name.trim() || "PLAYER 2"));
      setPlayers([
        makePlayer("p1", players[0].name.trim() || "PLAYER 1", p1StartScore),
        makePlayer("p2", p2Name, p2StartScore),
      ]);
      winnerRef.current = null; // winnerRefを即時リセット（CPUuseEffect誤発火防止）
      setActivePlayerIndex(0);
      setCurrentThrowsImmediate([]);
      setEditingThrowIndex(null);
      setPadMultiplier(1);
      setTurnHistoryState([]);
      setWinner(null);
      setShowQuitConfirm(false);
      setShowExitConfirm(false);
      setShowSettingsSetup(showSetup);
      setConfirmStage("throwing");
      setUndoConfirmStage("idle");
    };

    // ── キーパッドタップ ──
    const handleKeypadTap = (score, specifiedMult, isBullType) => {
      if (winner || confirmStage === "next" || confirmStage === "gameover" || isCpuTurn)
        return;
      if (editingThrowIndex === null && !canAddMoreThrows) return;
      initAudio();
      const activeMult =
        specifiedMult !== undefined ? specifiedMult : padMultiplier;
      let finalMult = activeMult,
        label = "",
        isBull = false;
      if (score === 25) {
        isBull = true;
        if (isBullType === "inner" || activeMult === 2) {
          score = 50;
          finalMult = 1;
          label = "D-Bull";
        } else if (bullType === "fat") {
          score = 50;
          finalMult = 1;
          label = "Bull(50)";
        } else {
          score = 25;
          finalMult = 1;
          label = "S-Bull(25)";
        }
      } else if (score === 0) {
        finalMult = 0;
        label = "MISS";
      } else {
        label = `${finalMult === 3 ? "T" : finalMult === 2 ? "D" : "S"}${score}`;
      }
      let rx = 0,
        ry = 0;
      if (score === 0) {
        const d = 186 + Math.random() * 8,
          a = ((-110 + Math.random() * 220) * Math.PI) / 180;
        rx = Math.round(d * Math.cos(a));
        ry = Math.round(d * Math.sin(a));
      } else if (isBull) {
        const d = label === "D-Bull" || isBullType === "inner" ? 4 : 14,
          a = Math.random() * Math.PI * 2;
        rx = Math.round(d * Math.cos(a));
        ry = Math.round(d * Math.sin(a));
      } else if (score > 0) {
        const d = finalMult === 3 ? 101 : finalMult === 2 ? 165 : 133,
          i = WEDGES.indexOf(score),
          a = ((i * 18 - 90) * Math.PI) / 180;
        rx = Math.round(d * Math.cos(a));
        ry = Math.round(d * Math.sin(a));
      }
      const nT = { score, multiplier: finalMult, x: rx, y: ry, label, isBull };
      const nThrows =
        editingThrowIndex !== null
          ? currentThrows.map((t, i) => (i === editingThrowIndex ? nT : t))
          : [...currentThrows, nT];
      setCurrentThrowsImmediate(nThrows);
      if (editingThrowIndex !== null) setEditingThrowIndex(null);
      playSound(getHitSoundType(nT));
      if (
        gameMode === "01" &&
        getRoundState(
          activePlayer.remainingScore,
          nThrows,
          normalizeOutMode(outMode),
        ).isBust
      )
        playSound("burst");
    };

    // ── ボードクリック ──
    const handleBoardClick = (e) => {
      if (winner || confirmStage === "next" || confirmStage === "gameover" || isCpuTurn)
        return;
      if (editingThrowIndex === null && !canAddMoreThrows) return;
      if (!boardRef.current) return;
      initAudio();
      const rect = boardRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2,
        cy = rect.top + rect.height / 2,
        scale = rect.width / 420;
      const clientX =
        e.clientX ||
        (e.changedTouches && e.changedTouches[0]
          ? e.changedTouches[0].clientX
          : 0);
      const clientY =
        e.clientY ||
        (e.changedTouches && e.changedTouches[0]
          ? e.changedTouches[0].clientY
          : 0);
      const ct = getThrowFromCoords(
        (clientX - cx) / scale,
        (clientY - cy) / scale,
        bullType,
      );
      const nThrows =
        editingThrowIndex !== null
          ? currentThrows.map((t, i) => (i === editingThrowIndex ? ct : t))
          : [...currentThrows, ct];
      setCurrentThrowsImmediate(nThrows);
      if (editingThrowIndex !== null) setEditingThrowIndex(null);
      playSound(getHitSoundType(ct));
      if (
        gameMode === "01" &&
        getRoundState(
          activePlayer.remainingScore,
          nThrows,
          normalizeOutMode(outMode),
        ).isBust
      )
        playSound("burst");
    };

    const cancelCpuTimer = () => {
      if (cpuCommitRef.current) { cpuCommitRef.current(); cpuCommitRef.current = null; }
    };

    const handleUndoSingleDart = () => {
      if (confirmStage === "next" || confirmStage === "gameover" || isCpuTurn) return;
      if (currentThrows.length === 0) return;
      playSound("revert");
      setCurrentThrowsImmediate(currentThrows.slice(0, -1));
      setEditingThrowIndex(null);
    };

    const handleFlushRound = () => {
      if (confirmStage === "gameover") return;
      cancelCpuTimer();
      playSound("revert");
      if (confirmStage === "next") {
        // OK押し後のCLEAR = ターン確定を完全取り消し
        // スナップからplayers・activePlayerIndexを戻す（スナップは消費する）
        if (turnHistoryState.length > 0) {
          const prev = turnHistoryState[turnHistoryState.length - 1];
          setPlayers(prev.players);
          setActivePlayerIndex(prev.activePlayerIndex);
          setTurnHistoryState(turnHistoryState.slice(0, -1));
        }
        setCurrentThrowsImmediate([]);
        setEditingThrowIndex(null);
        setConfirmStage("throwing");
        setUndoConfirmStage("idle");
        return;
      }
      setCurrentThrowsImmediate([]);
      setEditingThrowIndex(null);
      setConfirmStage("throwing");
      setUndoConfirmStage("idle");
    };

    const handleUndoCommittedTurn = () => {
      cancelCpuTimer();
      if (turnHistoryState.length === 0) return;
      // gameover中（winner表示中）はPREV不可
      if (confirmStage === "gameover") return;
      // confirmStage==='next'(OK押し後)なら確認なしで即復元
      // confirmStage==='throwing' なら2段階確認（誤タップ防止）
      if (confirmStage !== "next" && undoConfirmStage === "idle") {
        playSound("click");
        setUndoConfirmStage("confirm");
        return;
      }
      playSound("revert");
      const prev = turnHistoryState[turnHistoryState.length - 1];
      setPlayers(prev.players);
      setActivePlayerIndex(prev.activePlayerIndex);
      setCurrentThrowsImmediate([]);
      setEditingThrowIndex(null);
      // PRVはゲーム履歴（players/activePlayerIndex）の巻き戻しのみ担当。
      // winner はUI状態であり履歴対象外 → 常にnullリセット。
      // （gameover中はPREV不可なので、winner=nullで問題ない）
      setWinner(null);
      setConfirmStage("throwing");
      setUndoConfirmStage("idle");
      setTurnHistoryState(turnHistoryState.slice(0, -1));
    };

    // ── ラウンド確定 ──
    // "gameover" = ゲーム終了後の不活性状態（winner表示中）
    const handleCommitRound = () => {
      // winner確定済み・gameover状態は即リターン（OKボタン連打対策）
      if (winner || confirmStage === "gameover") return;

      if (confirmStage === "throwing") {
        const liveThrows = currentThrowsRef.current;
        if (liveThrows.length === 0) return;
        initAudio();
        const snap = { players: cloneDeep(players), activePlayerIndex };
        setTurnHistoryState((p) => [...p, snap].slice(-20));

        if (gameMode === "countup") {
          // Count-Up: 累積加算（このブロックは必ず1回だけ実行）
          const pts = getSubtotal(liveThrows);
          const node = {
            roundNum: activePlayer.history.length + 1,
            throws: liveThrows,
            roundScore: pts,
          };
          const mp = players.map((p, i) =>
            i === activePlayerIndex
              ? {
                  ...p,
                  accumulatedScore: p.accumulatedScore + pts,
                  history: [node, ...p.history],
                }
              : p,
          );
          setPlayers(mp);

          // setPlayers後のmpで終了判定（Reactのstate更新は非同期なのでmpを直接使う）
          // 1P時はP1(index=0)だけが全ラウンド終了で終了
          const relevantPlayers = (playerCount === 1) ? [mp[0]] : mp;
          const bothDone = relevantPlayers.every((p) => p.history.length >= cuRounds);
          if (bothDone) {
            // ゲーム終了: confirmStage="gameover"で以降の入力を完全遮断
            // SOLO時はrelevantPlayers([mp[0]])だけで判定・表示する（P2の初期値0が紛れ込まないように）
            const isDraw =
              playerCount === 1
                ? false
                : mp[0].accumulatedScore === mp[1].accumulatedScore;
            const w =
              playerCount === 1
                ? mp[0]
                : isDraw || mp[0].accumulatedScore > mp[1].accumulatedScore
                  ? mp[0]
                  : mp[1];
            setConfirmStage("gameover");
            setCurrentThrowsImmediate([]);
            setEditingThrowIndex(null);
            playSound("victory");
            setWinner({
              ...w,
              countUpResult: true,
              isDraw,
              scores: relevantPlayers.map((p) => ({
                name: p.name,
                score: p.accumulatedScore,
              })),
            });
          } else {
            playSound("click");
            setConfirmStage("next");
          }
        } else {
          // 01ゲーム: useMemoのroundStateに依存せず、currentThrowsから直接計算
          // → 編集モード後のコミットでバースト判定がズレる問題を根本解決
          const normOut = normalizeOutMode(outMode);
          const freshState = getRoundState(
            activePlayer.remainingScore,
            liveThrows,
            normOut,
          );
          const nextRem = freshState.remainingScore;
          const node = {
            roundNum: activePlayer.history.length + 1,
            throws: liveThrows,
            roundScore: freshState.subtotal,
            remainingScore: nextRem,
            isBurst: freshState.isBust,
          };
          const mp = players.map((p, i) =>
            i === activePlayerIndex
              ? { ...p, remainingScore: nextRem, history: [node, ...p.history] }
              : p,
          );
          setPlayers(mp);
          if (nextRem === 0) {
            setConfirmStage("gameover");
            playSound("victory");
            setWinner(mp[activePlayerIndex]);
          } else {
            // ラウンド上限チェック（o1MaxRounds が設定されている場合）
            const nextRoundNum = mp[activePlayerIndex].history.length; // 今追加したラウンド数
            const isLastPlayer = playerCount === 1 || activePlayerIndex === (playerCount - 1);
            if (o1MaxRounds !== null && isLastPlayer && nextRoundNum >= o1MaxRounds) {
              // 全プレイヤーが規定ラウンドを終えた → 残り点数が少ない方が勝ち
              const relevant = playerCount === 1 ? [mp[0]] : mp.slice(0, 2);
              const minRem = Math.min(...relevant.map(p => p.remainingScore));
              const winners = relevant.filter(p => p.remainingScore === minRem);
              const isDraw = winners.length > 1;
              const w = isDraw ? { ...winners[0], id: null } : winners[0];
              setConfirmStage("gameover");
              playSound("victory");
              setWinner({ ...w, o1RoundResult: true, isDraw, scores: relevant.map(p => ({ name: p.name, score: p.remainingScore })) });
            } else {
              playSound("click");
              setConfirmStage("next");
            }
          }
        }
      } else if (confirmStage === "next") {
        // winner確定後のNEXT押下は無視（二重チェック）
        if (winner) return;
            playSound("click");
          
            if (playerCount !== 1) {
              setActivePlayerIndex(activePlayerIndex === 0 ? 1 : 0);
            }
            setCurrentThrowsImmediate([]);
            setEditingThrowIndex(null);
            setConfirmStage("throwing");
          }
    };

    // ── セーブデータ migration 枠 ──
    // version が上がるたびに、ここに旧バージョンからの変換処理を追加する。
    // 現状は変換不要のため中身は空だが、枠を用意しておくことで
    // 将来のフィールド追加・構造変更時に対応しやすくする。
    //
    // 戻り値が null の場合、呼び出し側（handleRestoreSave）は復元を拒否する。
    const migrateSaveData = (save) => {
      const v = save.version ?? 0;

      // 未来バージョン（このアプリより新しい形式）は復元しない。
      // 例: v7で保存したデータを、まだv6のままのアプリで開いた場合。
      // 中身を無理に読むと構造不一致でクラッシュする可能性があるため拒否する。
      if (v > CURRENT_SAVE_VERSION) {
        console.warn(`セーブデータのバージョン(${v})がアプリの対応バージョン(${CURRENT_SAVE_VERSION})より新しいため復元をスキップしました。`);
        return null;
      }

      switch (v) {
        case 0:
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          // 旧バージョン: 現状は構造変更なしなのでそのまま通す。
          // 将来フィールド名変更やデフォルト値補完が必要になったらここに追加。
          break;
        default:
          break;
      }
      return save;
    };

    const handleRestoreSave = () => {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        const d = migrateSaveData(parsed);
        if (!d) {
          // 未来バージョン等で復元拒否されたケース。データ自体は消さずに残す
          // （ユーザーがアプリを更新すれば読めるようになる可能性があるため）。
          return false;
        }
        if (Date.now() - (d.savedAt || 0) > 86400000) {
          clearSavedGame();
          return false;
        }
        const restoredMode = ["01", "countup"].includes(d.gameMode) ? d.gameMode : "01";
        const restoredPlayers =
          Array.isArray(d.players) && d.players.length === 2
            ? d.players
            : players;
        const restoredIndex = d.activePlayerIndex === 1 ? 1 : 0;
        const restoredThrows = Array.isArray(d.currentThrows)
          ? d.currentThrows.slice(0, MAX_THROWS_PER_TURN)
          : [];
        const restoredOutMode = normalizeOutMode(d.outMode ?? "single");
        let safeStage = ["throwing", "next", "gameover"].includes(
          d.confirmStage,
        )
          ? d.confirmStage
          : "throwing";
        if (safeStage === "gameover" && !d.winner) safeStage = "throwing";
        if (safeStage === "next" && restoredThrows.length === 0 && !d.winner)
          safeStage = "throwing";
        setGameMode(restoredMode);
        setPlayers(restoredPlayers);
        setActivePlayerIndex(restoredIndex);
        setCurrentThrowsImmediate(restoredThrows);
        setOutMode(restoredOutMode);
        setBullType(["separate", "fat"].includes(d.bullType) ? d.bullType : "separate");
        setTurnHistoryState(
          Array.isArray(d.turnHistoryState) ? d.turnHistoryState : [],
        );
        // editingThrowIndex / undoConfirmStage は復帰時に必ずリセット
        setConfirmStage(d.winner ? "gameover" : safeStage);
        setEditingThrowIndex(null);
        setUndoConfirmStage("idle");
        setPadMultiplier([1, 2, 3].includes(d.padMultiplier) ? d.padMultiplier : 1);
        setWinner(d.winner ?? null);
        setCheckoutPref(["double", "triple", "single"].includes(d.checkoutPref) ? d.checkoutPref : "double");
        setCuRounds(d.cuRounds ?? COUNT_UP_ROUNDS);
        setO1MaxRounds(d.o1MaxRounds ?? null);
        setPlayerCount(d.playerCount ?? 2);
        setCpuMode(!!d.cpuMode);
        const safeDiff = ["easy","medium","hard","pro"].includes(d.cpuDifficulty) ? d.cpuDifficulty : "medium";
        setCpuDifficulty(safeDiff);
        const safeLang = ["ja","en"].includes(d.helpLang) ? d.helpLang : "ja"; // 旧セーブはjaをデフォルト
        setHelpLang(safeLang);
        setUndoConfirmStage("idle");
        if (d.players && d.players[0] && d.players[1]) {
          setP1StartScore(d.players[0].initialScore);
          setP2StartScore(d.players[1].initialScore);
        }
        setHasRestorableSave(true);
        setShowSettingsSetup(false);
        return true;
      } catch (e) {
        return false;
      }
    };

    const handleBackToMenuRequest = () => {
      if (
        players[0].history.length > 0 ||
        (playerCount >= 2 && players[1].history.length > 0) ||
        currentThrows.length > 0
      ) {
        playSound("click");
        setShowExitConfirm(true);
      } else {
        playSound("revert");
        setShowSettingsSetup(true);
      }
    };

    const handleLeaveToMenu = () => {
      cancelCpuTimer();
      playSound("revert");
      clearSavedGame();
      const cpuLabel = `CPU (${cpuDifficulty.toUpperCase()})`;
      const p2Name = cpuMode
        ? cpuLabel
        : playerCount === 1
          ? "---"
          : players[1].name.trim() || "PLAYER 2";
      setPlayers([
        makePlayer("p1", players[0].name.trim() || "PLAYER 1", p1StartScore),
        makePlayer("p2", p2Name, p2StartScore),
      ]);
      winnerRef.current = null;
      setActivePlayerIndex(0);
      setCurrentThrowsImmediate([]);
      setEditingThrowIndex(null);
      setPadMultiplier(1);
      setTurnHistoryState([]);
      setWinner(null);
      setConfirmStage("throwing");
      setUndoConfirmStage("idle");
      setShowExitConfirm(false);
      setShowQuitConfirm(false);
      setShowSettingsSetup(true);
    };

    // ─────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────
    return React.createElement(
      "div",
      {
        className:
          "min-h-[100dvh] w-full bg-[#050508] text-amber-100 flex flex-col justify-between select-none antialiased overflow-y-auto font-sans relative pb-8",
      },
      React.createElement("div", {
        className:
          "fixed inset-0 bg-gradient-to-b from-zinc-950 via-[#0a0a0f] to-[#040406] z-0 pointer-events-none",
      }),

      /* ── Header ── */
      React.createElement(
        "header",
        {
          className:
            "relative z-30 border-b border-zinc-900/80 bg-[#09090c]/90 backdrop-blur-md px-3.5 py-2.5 flex items-center justify-between shrink-0 shadow-[0_8px_24px_rgba(0,0,0,0.3)]",
        },
        React.createElement(
          "div",
          { className: "flex items-center space-x-2" },
          React.createElement(
            "div",
            {
              className:
                "w-6 h-6 rounded-full border border-amber-500/30 bg-neutral-950 flex items-center justify-center shadow-[0_0_14px_rgba(245,158,11,0.12)]",
            },
            React.createElement(
              "svg",
              {
                viewBox: "0 0 24 24",
                className: "w-3.5 h-3.5 text-amber-400",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "1.8",
                strokeLinecap: "round",
                strokeLinejoin: "round",
              },
              React.createElement("circle", {
                cx: "12",
                cy: "12",
                r: "7.5",
                opacity: "0.38",
              }),
              React.createElement("circle", {
                cx: "12",
                cy: "12",
                r: "3.5",
                opacity: "0.82",
              }),
              React.createElement("circle", {
                cx: "12",
                cy: "12",
                r: "1.3",
                fill: "currentColor",
                stroke: "none",
              }),
            ),
          ),
          React.createElement(
            "div",
            null,
            React.createElement(
              "h1",
              {
                className:
                  "text-[10px] font-black tracking-widest text-amber-400 leading-none uppercase",
              },
              "PUB DARTS CABIN",
            ),
            React.createElement(
              "p",
              {
                className:
                  "text-[7px] text-zinc-600 font-mono mt-0.5 tracking-wider uppercase",
              },
              gameMode === "countup"
                ? `COUNT-UP · ${cuRounds}R`
                : "Interactive Scorer",
            ),
          ),
        ),
        React.createElement(
          "div",
          { className: "flex items-center space-x-1.5" },
          React.createElement(
            "button",
            {
              onClick: () => setSoundEnabled(!soundEnabled),
              "aria-label": soundEnabled
                ? (helpLang === "ja" ? "ミュートにする" : "Mute sound")
                : (helpLang === "ja" ? "ミュートを解除する" : "Unmute sound"),
              className:
                "w-7 h-7 rounded-lg bg-[#141419] border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-amber-400 hover:border-amber-500/30 transition cursor-pointer",
            },
            soundEnabled
              ? React.createElement(
                  "span",
                  { className: "text-emerald-500" },
                  React.createElement(Icons.Volume2, null),
                )
              : React.createElement(
                  "span",
                  { className: "text-zinc-600" },
                  React.createElement(Icons.VolumeX, null),
                ),
          ),
          React.createElement(
            "button",
            {
              onClick: () => setShowHowTo(true),
              "aria-label": helpLang === "ja" ? "使い方を表示" : "Show how to play",
              className:
                "w-7 h-7 rounded-lg bg-[#141419] border border-zinc-800 flex items-center justify-center text-amber-500/80 hover:border-amber-500/30 transition cursor-pointer",
            },
            React.createElement(Icons.HelpCircle, null),
          ),
          React.createElement(
            "button",
            {
              onClick: handleBackToMenuRequest,
              className:
                "h-7 px-2.5 rounded-lg bg-[#141419] border border-zinc-800 flex items-center gap-1.5 text-[9px] font-bold text-zinc-400 hover:text-amber-400 hover:border-amber-500/30 transition cursor-pointer",
            },
            React.createElement(Icons.Settings, null),
            React.createElement("span", null, "MENU"),
          ),
        ),
      ),

      /* ── Main ── */
      React.createElement(
        "main",
        {
          className:
            "flex-grow flex flex-col lg:flex-row justify-center items-stretch relative z-10 p-2 md:p-4 gap-4 max-w-5xl mx-auto w-full",
          onClick: (e) => {
            if (editingThrowIndex === null) return;
            const t =
              e.target && typeof e.target.closest === "function"
                ? e.target
                : null;
            if (
              !(
                t &&
                t.closest('button,svg,input,label,[data-throw-slot="true"]')
              )
            )
              setEditingThrowIndex(null);
          },
        },

        React.createElement(
          "div",
          {
            className:
              "flex-grow flex flex-col justify-center items-center min-h-0 w-full lg:max-w-3xl relative",
          },

          /* ── アシストバー ── */
          React.createElement(
            "div",
            { className: "w-full px-2 py-1.5 mb-1 shrink-0 z-20" },
            editingThrowIndex !== null &&
              React.createElement(
                "div",
                { className: "flex items-center gap-1.5 px-3 pb-1" },
                React.createElement(
                  "span",
                  {
                    className:
                      "text-[9px] font-black text-sky-400 tracking-widest animate-pulse uppercase",
                  },
                  "✏ EDITING DART " +
                    (editingThrowIndex + 1) +
                    " — tap to overwrite",
                ),
              ),
            React.createElement(
              "div",
              {
                className: `flex items-center justify-center bg-zinc-950/70 border rounded-xl px-3 py-2.5 shadow-inner min-h-[42px] ${editingThrowIndex !== null ? "border-sky-500/60 shadow-[0_0_18px_rgba(56,189,248,0.12)]" : "border-zinc-800/80"}`,
              },
              React.createElement(
                "div",
                {
                  className: `assist-bar ${assistInfo.color}${assistInfo.pulse ? " assist-active" : ""} text-center tracking-[0.04em] overflow-hidden w-full`,
                },
                React.createElement(
                  "span",
                  {
                    className: "assist-line block text-center",
                    style: {
                      fontSize:
                        assistInfo.text && assistInfo.text.length > 28
                          ? "0.7rem"
                          : "",
                    },
                  },
                  assistInfo.text || "\u00A0",
                ),
              ),
            ),
          ),

          /* ── Board + Cockpits ── */
          React.createElement(
            "div",
            {
              className:
                "w-full flex flex-row items-center justify-center relative my-auto py-2 select-none gap-1 sm:gap-4",
            },
            React.createElement(
              "div",
              { className: "w-[28%] flex flex-col justify-center shrink-0" },
              React.createElement(PlayerCockpit, {
                player: players[0],
                displayScore: p1DisplayScore,
                isActive: activePlayerIndex === 0,
                isBust: !winner && isRoundBurst && activePlayerIndex === 0,
                alignment: "left",
                label: "P1 HIST",
                gameMode,
              }),
            ),

            /* Dart Board */
            React.createElement(
              "div",
              {
                className: `relative w-[42%] aspect-square flex items-center justify-center pointer-events-auto shrink-0 z-20 ${editingThrowIndex !== null ? "rounded-full ring-2 ring-sky-400/50 shadow-[0_0_28px_rgba(56,189,248,0.18)]" : ""}`,
              },
              React.createElement("div", {
                className:
                  "absolute inset-0 rounded-full bg-black/60 blur-md pointer-events-none transform translate-y-2 scale-[0.98]",
              }),
              React.createElement(
                "svg",
                {
                  ref: boardRef,
                  onClick: handleBoardClick,
                  onTouchEnd: (e) => {
                    e.preventDefault();
                    handleBoardClick(e);
                  },
                  viewBox: "-210 -210 420 420",
                  className:
                    "w-full h-full drop-shadow-[0_15px_30px_rgba(0,0,0,0.95)] overflow-visible cursor-crosshair",
                  style: { touchAction: "none" },
                },
                React.createElement(
                  "defs",
                  null,
                  React.createElement(
                    "filter",
                    {
                      id: "marker-glow",
                      x: "-50%",
                      y: "-50%",
                      width: "200%",
                      height: "200%",
                    },
                    React.createElement("feGaussianBlur", {
                      stdDeviation: "3",
                      result: "blur",
                    }),
                    React.createElement(
                      "feMerge",
                      null,
                      React.createElement("feMergeNode", { in: "blur" }),
                      React.createElement("feMergeNode", {
                        in: "SourceGraphic",
                      }),
                    ),
                  ),
                ),
                React.createElement("circle", {
                  r: "195",
                  fill: "#0c0c10",
                  stroke: "#1c1c24",
                  strokeWidth: "3",
                }),
                React.createElement("circle", {
                  r: "176",
                  fill: "none",
                  stroke: "#2c2c36",
                  strokeWidth: "0.8",
                }),
                React.createElement("circle", {
                  r: "154",
                  fill: "none",
                  stroke: "#2c2c36",
                  strokeWidth: "0.8",
                }),
                React.createElement("circle", {
                  r: "112",
                  fill: "none",
                  stroke: "#2c2c36",
                  strokeWidth: "0.8",
                }),
                React.createElement("circle", {
                  r: "90",
                  fill: "none",
                  stroke: "#2c2c36",
                  strokeWidth: "0.8",
                }),
                WEDGES.map((w, i) => {
                  const a = i * 18 - 90,
                    rs = ((a - 9) * Math.PI) / 180,
                    re = ((a + 9) * Math.PI) / 180,
                    ev = i % 2 === 0;
                  const bp = (r1, r2) => {
                    const x1 = r1 * Math.cos(rs),
                      y1 = r1 * Math.sin(rs),
                      x2 = r2 * Math.cos(rs),
                      y2 = r2 * Math.sin(rs),
                      x3 = r2 * Math.cos(re),
                      y3 = r2 * Math.sin(re),
                      x4 = r1 * Math.cos(re),
                      y4 = r1 * Math.sin(re);
                    return `M ${x1} ${y1} L ${x2} ${y2} A ${r2} ${r2} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${r1} ${r1} 0 0 0 ${x1} ${y1} Z`;
                  };
                  const ta = (a * Math.PI) / 180,
                    tx = 185 * Math.cos(ta),
                    ty = 185 * Math.sin(ta);
                  return React.createElement(
                    "g",
                    { key: w },
                    React.createElement("path", {
                      d: bp(112, 154),
                      fill: ev ? "#09090c" : "#eaeaea",
                      stroke: "#222",
                      strokeWidth: "0.5",
                    }),
                    React.createElement("path", {
                      d: bp(22, 90),
                      fill: ev ? "#09090c" : "#eaeaea",
                      stroke: "#222",
                      strokeWidth: "0.5",
                    }),
                    React.createElement("path", {
                      d: bp(154, 176),
                      fill: ev ? "#e11d48" : "#16a34a",
                      stroke: "#222",
                      strokeWidth: "0.5",
                    }),
                    React.createElement("path", {
                      d: bp(90, 112),
                      fill: ev ? "#e11d48" : "#16a34a",
                      stroke: "#222",
                      strokeWidth: "0.5",
                    }),
                    React.createElement(
                      "text",
                      {
                        x: tx,
                        y: ty,
                        textAnchor: "middle",
                        dominantBaseline: "central",
                        fill: "#f59e0b",
                        fontSize: "13",
                        fontWeight: "900",
                        transform: `rotate(${a + 90},${tx},${ty})`,
                      },
                      w,
                    ),
                  );
                }),
                React.createElement("circle", {
                  r: "22",
                  fill: "#16a34a",
                  stroke: "#222",
                  strokeWidth: "0.5",
                }),
                React.createElement("circle", {
                  r: "8.5",
                  fill: "#e11d48",
                  stroke: "#222",
                  strokeWidth: "0.5",
                }),
                /* ダーツマーカー: アクティブ投を大きく、完了投を小さく表示 */
                currentThrows.map((t, idx) => {
                  const isFocused = idx === editingThrowIndex;
                  const isLast = idx === currentThrows.length - 1;
                  const r = isFocused ? 9 : isLast ? 8 : 6;
                  const fill = isFocused
                    ? "#38bdf8"
                    : isLast
                      ? "#fbbf24"
                      : "#f59e0b";
                  const sw = isFocused ? 3 : isLast ? 2.5 : 1.5;
                  return React.createElement("circle", {
                    key: idx,
                    cx: t.x,
                    cy: t.y,
                    r,
                    fill,
                    stroke: "white",
                    strokeWidth: sw,
                    filter: "url(#marker-glow)",
                    className: "transition-all duration-150",
                  });
                }),
              ),
              /* Corner buttons removed - using action bar below */
            ),

            (playerCount >= 2 || cpuMode) && React.createElement(
              "div",
              { className: "w-[28%] flex flex-col justify-center shrink-0" },
              React.createElement(PlayerCockpit, {
                player: players[1],
                displayScore: p2DisplayScore,
                isActive: activePlayerIndex === 1,
                isBust: !winner && isRoundBurst && activePlayerIndex === 1,
                alignment: "right",
                label: cpuMode ? "CPU" : "P2 HIST",
                gameMode,
                isCpuPending: cpuMode && isCpuTurn,
              }),
            ),
          ),

          /* ── アクションバー（ミス + 操作系） ── */
          React.createElement(
            "div",
            { className: "w-full max-w-sm mt-2 flex gap-1.5 relative z-20" },
            React.createElement(
              "button",
              {
                className: "action-bar-btn ab-miss",
                onClick: () => handleKeypadTap(0),
                disabled: winner || isCpuTurn || confirmStage === "next" || confirmStage === "gameover" || (!canAddMoreThrows && editingThrowIndex === null),
                title: "Miss",
              },
              React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" },
                React.createElement("circle", { cx: "12", cy: "12", r: "9", opacity: "0.35" }),
                React.createElement("line", { x1: "8", y1: "8", x2: "16", y2: "16" }),
                React.createElement("line", { x1: "16", y1: "8", x2: "8", y2: "16" }),
              ),
              React.createElement("span", null, "MISS"),
            ),
            React.createElement(
              "button",
              {
                className: "action-bar-btn ab-undo",
                onClick: handleUndoSingleDart,
                disabled: currentThrows.length === 0 || confirmStage === "next" || confirmStage === "gameover",
                title: "Undo last dart",
              },
              React.createElement(Icons.Undo2, null),
              React.createElement("span", null, "UNDO"),
            ),
            React.createElement(
              "button",
              {
                className: "action-bar-btn ab-clear",
                onClick: handleFlushRound,
                disabled: (currentThrows.length === 0 && confirmStage !== "next") || confirmStage === "gameover",
                title: "Clear turn",
              },
              React.createElement(Icons.Trash2, null),
              React.createElement("span", null, "CLEAR"),
            ),
            React.createElement(
              "button",
              {
                className: `action-bar-btn ab-prev${undoConfirmStage === "confirm" ? " pulsing" : ""}`,
                onClick: handleUndoCommittedTurn,
                disabled: turnHistoryState.length === 0 || !!winner || confirmStage === "gameover",
                title: "Undo previous turn",
              },
              React.createElement(Icons.RotateCcw, null),
              React.createElement("span", null, undoConfirmStage === "confirm" ? "SURE?" : "PREV"),
            ),
          ),

          /* ── Throw Slots + Round Sum ── */
          React.createElement(
            "div",
            {
              className:
                "w-full max-w-sm mt-1.5 soft-metal score-slot p-2 rounded-xl border border-zinc-800/90 flex justify-between items-center relative z-20 shadow-[0_8px_20px_rgba(0,0,0,0.25)]",
            },
            React.createElement(
              "div",
              { className: "flex gap-1.5" },
              [0, 1, 2].map((idx) => {
                const t = currentThrows[idx],
                  focused = editingThrowIndex === idx;
                return React.createElement(
                  "div",
                  {
                    key: idx,
                    "data-throw-slot": "true",
                    onClick: () => {
                      if (focused) {
                        setEditingThrowIndex(null);
                        playSound("click");
                      } else if (t) {
                        setEditingThrowIndex(idx);
                        playSound("click");
                      }
                    },
                    className: `w-14 h-10 rounded-lg flex flex-col justify-center items-center font-mono cursor-pointer transition-all ${focused ? "bg-sky-500/20 border-2 border-sky-300 text-sky-200 shadow-[0_0_14px_rgba(56,189,248,0.35)] scale-[1.03]" : t ? "bg-[#18181f] border border-amber-500/30 text-white" : "bg-black/40 border border-zinc-800 text-zinc-700"}`,
                  },
                  React.createElement(
                    "span",
                    {
                      className:
                        "text-[7px] block text-zinc-500 uppercase leading-none mb-0.5",
                    },
                    "Dart ",
                    idx + 1,
                  ),
                  React.createElement(
                    "span",
                    { className: "text-sm font-black" },
                    t ? t.label : "-",
                  ),
                );
              }),
            ),
            React.createElement(
              "div",
              { className: "text-right pr-1" },
              React.createElement(
                "span",
                {
                  className:
                    "text-[7px] text-zinc-500 block uppercase font-bold tracking-wider leading-none mb-0.5",
                },
                gameMode === "countup" ? "Round Pts" : "Round Sum",
              ),
              React.createElement(
                "span",
                {
                  className: `text-lg font-black font-mono leading-none ${isRoundBurst ? "line-through text-rose-500" : "text-amber-400"}`,
                },
                isRoundBurst ? "BUST" : currentRoundSubtotal,
              ),
            ),
          ),
        ),

        /* ── Keypad Panel ── */
        React.createElement(
          "div",
          {
            className:
              "w-full lg:w-[410px] shrink-0 flex flex-col justify-center relative z-20",
          },
          React.createElement(
            "div",
            {
              className:
                "w-full mt-2 soft-metal panel-glow p-3 rounded-2xl border border-zinc-800/90 backdrop-blur-md",
            },
            React.createElement(
              "div",
              { className: "grid grid-cols-12 gap-2.5" },
              React.createElement(
                "div",
                { className: "col-span-9 flex flex-col gap-3" },
                React.createElement(
                  "div",
                  {
                    className:
                      "grid grid-cols-3 gap-1.5 p-1 bg-black/40 rounded-xl border border-zinc-800",
                  },
                  [
                    ["S", "Single", 1, "py-2 rounded-lg font-black uppercase cursor-pointer transition-all border"],
                    ["D", "Double", 2, "py-2 rounded-lg font-black uppercase cursor-pointer transition-all border"],
                    ["T", "Triple", 3, "py-2 rounded-lg font-black uppercase cursor-pointer transition-all border"],
                  ].map(([prefix, lbl, m, cls]) =>
                    React.createElement(
                      "button",
                      {
                        key: m,
                        onClick: () => {
                          playSound("click");
                          setPadMultiplier(m);
                        },
                        className: `${cls} ${padMultiplier === m ? (m === 1 ? "bg-amber-500 border-amber-400 text-black shadow-[0_3px_8px_rgba(245,158,11,0.2)] translate-y-[-1px]" : m === 2 ? "bg-rose-600 border-rose-500 text-white shadow-[0_3px_8px_rgba(225,29,72,0.25)] translate-y-[-1px]" : "bg-emerald-600 border-emerald-500 text-white shadow-[0_3px_8px_rgba(16,185,129,0.25)] translate-y-[-1px]") : "bg-transparent text-zinc-500 border-transparent active:translate-y-0.5"}`,
                      },
                      React.createElement("div", { className: "flex flex-col items-center leading-tight gap-0" },
                        React.createElement("span", { className: "text-[15px] font-black leading-none" }, prefix),
                        React.createElement("span", { className: "text-[7px] font-bold opacity-70 leading-tight" }, lbl),
                      ),
                    ),
                  ),
                ),
                React.createElement(
                  "div",
                  { className: "flex flex-col gap-2" },
                  React.createElement(
                    "div",
                    {
                      className:
                        "grid grid-cols-6 gap-1.5 bg-amber-500/5 p-1.5 rounded-xl border border-amber-500/10",
                    },
                    [20, 19, 18, 17, 16, 15].map((n) =>
                      React.createElement(
                        "button",
                        {
                          key: n,
                          onClick: () => handleKeypadTap(n),
                          className:
                            "w-11 h-11 md:w-[52px] md:h-[52px] rounded-xl flex items-center justify-center font-black font-mono text-sm md:text-base bg-zinc-950 border border-amber-500/25 text-amber-300 hover:border-amber-400 active:translate-y-0.5 transition-all shadow-[0_4px_10px_rgba(0,0,0,0.5)] cursor-pointer",
                        },
                        n,
                      ),
                    ),
                  ),
                  React.createElement(
                    "div",
                    {
                      className:
                        "grid grid-cols-5 gap-1.5 justify-items-center",
                    },
                    [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map(
                      (n) =>
                        React.createElement(
                          "button",
                          {
                            key: n,
                            onClick: () => handleKeypadTap(n),
                            className: `w-11 h-11 md:w-[52px] md:h-[52px] rounded-xl flex items-center justify-center font-black font-mono text-sm md:text-base active:translate-y-0.5 transition-all cursor-pointer shadow-[0_4px_10px_rgba(0,0,0,0.5)] border ${n === 0 ? "bg-[#18181f] border-rose-900/60 text-rose-400 hover:bg-[#23232b]" : "bg-zinc-950 border-zinc-800 text-zinc-200 hover:border-zinc-500"}`,
                          },
                          n,
                        ),
                    ),
                  ),
                ),
              ),
              React.createElement(
                "div",
                {
                  className:
                    "col-span-3 flex flex-col justify-between gap-2 self-stretch",
                },
                React.createElement(
                  "button",
                  {
                    onClick: () => handleKeypadTap(25, 1, "outer"),
                    className:
                      "flex-1 rounded-xl font-mono font-black uppercase border-2 flex flex-col justify-center items-center gap-1 active:translate-y-0.5 transition-all cursor-pointer bg-zinc-950 border-[#16a34a] text-[#16a34a] hover:bg-emerald-950/20 shadow-[0_4px_10px_rgba(0,0,0,0.4)]",
                    title:
                      bullType === "fat" ? "Outer Bull 50" : "Outer Bull 25",
                  },
                  React.createElement(
                    "span",
                    { className: "w-9 h-9 flex items-center justify-center" },
                    React.createElement(
                      "svg",
                      {
                        viewBox: "0 0 40 40",
                        className: "w-9 h-9",
                        fill: "none",
                      },
                      React.createElement("circle", {
                        cx: "20",
                        cy: "20",
                        r: "14.5",
                        fill: "currentColor",
                        stroke: "none",
                        opacity: "0.90",
                      }),
                      React.createElement("circle", {
                        cx: "20",
                        cy: "20",
                        r: "7.2",
                        fill: "#09090c",
                        stroke: "none",
                      }),
                    ),
                  ),
                  React.createElement(
                    "span",
                    {
                      className:
                        "leading-tight text-xs font-black tracking-tight",
                    },
                    "OUT",
                    React.createElement("br", null),
                    "BULL",
                  ),
                  React.createElement(
                    "span",
                    { className: "text-base font-black text-zinc-200" },
                    bullType === "fat" ? "50" : "25",
                  ),
                ),
                React.createElement(
                  "button",
                  {
                    onClick: () => handleKeypadTap(25, 2, "inner"),
                    className:
                      "flex-1 rounded-xl font-mono font-black uppercase border flex flex-col justify-center items-center gap-1 active:translate-y-0.5 transition-all cursor-pointer bg-zinc-950 border-rose-900/70 text-rose-400 hover:bg-rose-950/20 shadow-[0_4px_10px_rgba(0,0,0,0.4)]",
                    title: "Inner Bull 50",
                  },
                  React.createElement(
                    "span",
                    { className: "w-9 h-9 flex items-center justify-center" },
                    React.createElement(
                      "svg",
                      {
                        viewBox: "0 0 40 40",
                        className: "w-9 h-9",
                        fill: "none",
                        stroke: "currentColor",
                        strokeWidth: "2.2",
                      },
                      React.createElement("circle", {
                        cx: "20",
                        cy: "20",
                        r: "14.5",
                        opacity: "0.28",
                      }),
                      React.createElement("circle", {
                        cx: "20",
                        cy: "20",
                        r: "6.8",
                        fill: "currentColor",
                        stroke: "none",
                        opacity: "0.96",
                      }),
                    ),
                  ),
                  React.createElement(
                    "span",
                    {
                      className:
                        "leading-tight text-xs font-black tracking-tight",
                    },
                    "INNER",
                    React.createElement("br", null),
                    "BULL",
                  ),
                  React.createElement(
                    "span",
                    { className: "text-base font-black text-zinc-200" },
                    "50",
                  ),
                ),
              ),
            ),
            React.createElement(
              "div",
              { className: "mt-4 pt-3 border-t border-zinc-800 space-y-2" },
              isRoundBurst &&
                React.createElement(
                  "div",
                  { className: "w-full py-2 rounded-xl bg-rose-950/60 border border-rose-500/60 text-center" },
                  React.createElement("span", { className: "text-rose-400 font-black text-xs tracking-wider" }, "💥 BUST"),
                ),
              React.createElement(
                "button",
                {
                  onClick: handleCommitRound,
                  disabled: currentThrows.length === 0 && confirmStage !== "next",
                  className: `w-full py-4 rounded-2xl font-fliqlo font-black text-sm tracking-[0.18em] uppercase transition-all duration-200 border cursor-pointer ${
                    currentThrows.length === 0 && confirmStage !== "next"
                      ? "bg-zinc-800 border-zinc-700 text-zinc-600 cursor-not-allowed opacity-50"
                      : confirmStage === "next"
                        ? "bg-emerald-600 border-emerald-500 text-white shadow-[0_8px_20px_rgba(16,185,129,0.25)]"
                        : "bg-gradient-to-r from-amber-400 to-amber-500 border-amber-300 text-black shadow-[0_8px_20px_rgba(245,158,11,0.18)]"
                  }`,
                },
                confirmStage === "next" ? "NEXT  →" : "OK",
              ),
            ),
          ),
        ),
      ),

      /* ── GAME SETUP Modal ── */
      showSettingsSetup &&
        React.createElement(
          "div",
          {
            className:
              "fixed inset-0 z-50 bg-black/92 backdrop-blur-xl flex items-end sm:items-center justify-center p-3 sm:p-5",
          },
          React.createElement(
            "div",
            {
              className:
                "setup-card w-full max-w-sm rounded-3xl sm:rounded-2xl overflow-hidden",
            },
            /* Header */
            React.createElement(
              "div",
              {
                className:
                  "flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/5",
              },
              React.createElement(
                "div",
                null,
                React.createElement(
                  "div",
                  { className: "flex items-center gap-2 mb-0.5" },
                  React.createElement(
                    "span",
                    { className: "text-amber-400 text-base" },
                    "🎯",
                  ),
                  React.createElement(
                    "h2",
                    {
                      className:
                        "text-xs font-black tracking-[0.15em] text-amber-400 uppercase",
                    },
                    "GAME SETUP",
                  ),
                ),
                React.createElement(
                  "p",
                  {
                    className:
                      "text-[9px] text-zinc-600 font-mono tracking-wider pl-6",
                  },
                  "Mode / Players / Rules",
                ),
              ),
              players[0].history.length > 0 &&
                React.createElement(
                  "button",
                  {
                    onClick: () => {
                      playSound("revert");
                      setShowSettingsSetup(false);
                    },
                    className:
                      "w-7 h-7 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white cursor-pointer transition",
                  },
                  React.createElement(Icons.X, null),
                ),
            ),

            React.createElement(
              "div",
              {
                className:
                  "p-5 space-y-5 overflow-y-auto max-h-[75vh] no-scrollbar",
              },

              /* ── GAME MODE ── */
              React.createElement(
                "div",
                { className: "space-y-2" },
                React.createElement(
                  "p",
                  { className: "setup-section-label" },
                  "GAME MODE",
                ),
                React.createElement(
                  "div",
                  { className: "grid grid-cols-2 gap-2" },
                  [
                    ["01", "01 GAME", "🎯"],
                    ["countup", "COUNT-UP", "📈"],
                  ].map(([m, lbl, ico]) =>
                    React.createElement(
                      "button",
                      {
                        key: m,
                        onClick: () => {
                          playSound("click");
                          setGameMode(m);
                        },
                        className: `setup-toggle-btn flex items-center justify-center gap-1.5 py-3 ${gameMode === m ? "setup-toggle-active" : "setup-toggle-inactive"}`,
                      },
                      React.createElement("span", null, ico),
                      React.createElement("span", null, lbl),
                    ),
                  ),
                ),
              ),

              /* ── PLAYERS & OPPONENT ── */
              React.createElement("div", { className: "space-y-3" },
                React.createElement("p", { className: "setup-section-label" }, "PLAYERS"),

                /* プレイヤー数 (Count-Up: SOLO/1P/2P、01: 1P/2P) */
                React.createElement("div", { className: "grid grid-cols-3 gap-1.5" },
                  (gameMode === "countup"
                    ? [[1,"👤 1P"],[2,"👥 2P"]]   // ← ここをSOLO/VS → 1P/2Pに変更
                    : [[1,"👤 1P"],[2,"👥 2P"]]
                  ).map(([n,lbl]) =>
                    React.createElement("button", {
                      key: n,
                      onClick: () => { playSound("click"); setPlayerCount(n); if(n===1) setCpuMode(false); },
                      className: `setup-toggle-btn py-2.5 ${playerCount === n && !cpuMode ? "setup-toggle-active" : "setup-toggle-inactive"}`,
                    }, lbl)
                  ),
                  React.createElement("button", {
                    onClick: () => { playSound("click"); setCpuMode(c=>!c); if(!cpuMode) setPlayerCount(2); },
                    className: `setup-toggle-btn py-2.5 ${cpuMode ? "setup-toggle-active" : "setup-toggle-inactive"}`,
                  }, "🤖 CPU"),
                ),

                /* 名前入力（P2はCPUのとき非表示） */
                React.createElement("div", { className: `grid gap-2 ${(!cpuMode && playerCount>=2) ? "grid-cols-2" : "grid-cols-1"}` },
                  [0, 1].filter(i => i===0 || (!cpuMode && playerCount>=2)).map(i =>
                    React.createElement("div", { key: i, className: "bg-zinc-950/80 border border-zinc-800/70 rounded-xl p-2 space-y-2" },
                      React.createElement("input", {
                        type: "text", maxLength: 10,
                        value: players[i].name,
                        onChange: e => { const u=[...players]; u[i]={...u[i],name:e.target.value.toUpperCase()}; setPlayers(u); },
                        className: "w-full bg-black/60 border border-zinc-700/60 rounded-lg px-2 py-2 text-sm text-amber-200 outline-none uppercase font-black text-center tracking-wider focus:border-amber-500/50 transition",
                        placeholder: `P${i+1} NAME`,
                      }),
                      gameMode === "01" && React.createElement("div", { className: "flex items-center justify-between gap-1.5" },
                        React.createElement("button", {
                          onClick: () => { playSound("click"); i===0 ? setP1StartScore(p=>Math.max(11,p-10)) : setP2StartScore(p=>Math.max(11,p-10)); },
                          className: "setup-score-btn flex-1",
                        }, "－"),
                        React.createElement("span", { className: "text-lg font-black font-mono text-white tabular-nums w-12 text-center" },
                          i===0 ? p1StartScore : p2StartScore),
                        React.createElement("button", {
                          onClick: () => { playSound("click"); i===0 ? setP1StartScore(p=>Math.min(999,p+10)) : setP2StartScore(p=>Math.min(999,p+10)); },
                          className: "setup-score-btn flex-1",
                        }, "＋"),
                      ),
                    )
                  ),
                ),

                /* CPU難易度 */
                cpuMode && React.createElement("div", { className: "space-y-1.5" },
                  React.createElement("p", { className: "setup-section-label" }, "CPU DIFFICULTY"),
                  React.createElement("div", { className: "grid grid-cols-4 gap-1.5" },
                    [["easy","EASY"],["medium","MED"],["hard","HARD"],["pro","PRO"]].map(([d,lbl]) =>
                      React.createElement("button", {
                        key: d,
                        onClick: () => { playSound("click"); setCpuDifficulty(d); },
                        className: `setup-toggle-btn py-2 ${cpuDifficulty===d?"setup-toggle-active":"setup-toggle-inactive"}`,
                      }, lbl)
                    ),
                  ),
                ),
              ),

              /* ── 01専用: Quick Preset ── */
              gameMode === "01" && React.createElement("div", { className: "space-y-1.5" },
                React.createElement("p", { className: "setup-section-label" }, "PRESET"),
                React.createElement("div", { className: "grid grid-cols-3 gap-2" },
                  [301, 501, 701].map(s =>
                    React.createElement("button", {
                      key: s,
                      onClick: () => { playSound("click"); setP1StartScore(s); setP2StartScore(s); },
                      className: `setup-toggle-btn ${p1StartScore===s&&p2StartScore===s?"setup-toggle-active":"setup-toggle-inactive"}`,
                    }, s)
                  ),
                ),
              ),

              /* ── Count-Up専用: ラウンド数 ── */
              gameMode === "countup" && React.createElement("div", { className: "space-y-1.5" },
                React.createElement("p", { className: "setup-section-label" }, "ROUNDS"),
                React.createElement("div", { className: "grid grid-cols-4 gap-2" },
                  [5,8,10,15].map(r =>
                    React.createElement("button", {
                      key: r,
                      onClick: () => { playSound("click"); setCuRounds(r); },
                      className: `setup-toggle-btn ${cuRounds===r?"setup-toggle-active":"setup-toggle-inactive"}`,
                    }, r)
                  ),
                ),
              ),

              /* ── 01専用: ラウンド上限 ── */
              gameMode === "01" && React.createElement("div", { className: "space-y-1.5" },
                React.createElement("p", { className: "setup-section-label" }, "MAX ROUNDS"),
                React.createElement("div", { className: "grid grid-cols-4 gap-2" },
                  [[10,"10"],[15,"15"],[20,"20"],[null,"∞"]].map(([r,lbl]) =>
                    React.createElement("button", {
                      key: String(r),
                      onClick: () => { playSound("click"); setO1MaxRounds(r); },
                      className: `setup-toggle-btn ${o1MaxRounds===r?"setup-toggle-active":"setup-toggle-inactive"}`,
                    }, lbl)
                  ),
                ),
              ),

              /* ── RULES (共通 + 01のみOUT) ── */
              React.createElement("div", { className: "space-y-2" },
                React.createElement("p", { className: "setup-section-label" }, "RULES"),
                /* BULL */
                React.createElement("div", { className: "flex items-center gap-3" },
                  React.createElement("span", { className: "text-[9px] text-zinc-600 font-bold w-8 shrink-0" }, "BULL"),
                  React.createElement("div", {
                    className: "flex-1 slide-track",
                    onClick: () => { playSound("click"); setBullType(b=>b==="separate"?"fat":"separate"); },
                  },
                    React.createElement("div", { className: `slide-thumb ${bullType==="separate"?"left":"right"}` }),
                    React.createElement("button", { className: `slide-opt ${bullType==="separate"?"active":"inactive"}` }, "25/50"),
                    React.createElement("button", { className: `slide-opt ${bullType==="fat"?"active":"inactive"}` }, "50/50"),
                  ),
                ),
                /* OUT (01のみ) */
                gameMode === "01" && React.createElement("div", { className: "flex items-center gap-3" },
                  React.createElement("span", { className: "text-[9px] text-zinc-600 font-bold w-8 shrink-0" }, "OUT"),
                  React.createElement("div", { className: "flex-1 pill-seg" },
                    [["single","OPEN","active-s"],["double","DOUBLE","active-d"],["master","MASTER","active-m"]].map(([m,lbl,ac]) =>
                      React.createElement("button", {
                        key: m,
                        onClick: () => { playSound("click"); setOutMode(m); },
                        className: `pill-opt ${outMode===m?ac:"inactive"}`,
                      }, lbl)
                    ),
                  ),
                ),
              ),

              /* ── Start / Confirm ── */
              showQuitConfirm
                ? React.createElement(
                    "div",
                    { className: "space-y-2" },
                    React.createElement(
                      "p",
                      {
                        className:
                          "text-center text-[11px] font-bold text-rose-400 bg-rose-950/30 border border-rose-900/40 rounded-xl py-3 px-3",
                      },
                      "End the current game and start a new one?",
                    ),
                    React.createElement(
                      "div",
                      { className: "grid grid-cols-2 gap-2" },
                      React.createElement(
                        "button",
                        {
                          onClick: () => {
                            playSound("revert");
                            setShowQuitConfirm(false);
                          },
                          className:
                            "py-3 rounded-xl bg-zinc-900 border border-zinc-700/60 text-zinc-400 font-black text-xs cursor-pointer",
                        },
                        "CANCEL",
                      ),
                      React.createElement(
                        "button",
                        {
                          onClick: () => {
                            setShowQuitConfirm(false);
                            handleStartGame();
                          },
                          className:
                            "py-3 rounded-xl bg-rose-600 border border-rose-500 text-white font-black text-xs cursor-pointer",
                        },
                        "NEW GAME",
                      ),
                    ),
                  )
                : React.createElement(
                    React.Fragment,
                    null,
                    React.createElement(
                      "button",
                      {
                        onClick: () => {
                          players[0].history.length > 0 ||
                          (playerCount >= 2 && players[1].history.length > 0)
                            ? setShowQuitConfirm(true)
                            : handleStartGame();
                        },
                        className:
                          "w-full py-4 bg-gradient-to-r from-amber-400 to-amber-500 border border-amber-300/60 text-black font-black text-sm rounded-2xl uppercase cursor-pointer shadow-[0_8px_24px_rgba(245,158,11,0.18)] tracking-[0.12em] transition hover:from-amber-300 hover:to-amber-400",
                      },
                      "START GAME",
                    ),
                    hasRestorableSave && React.createElement(
                      "button",
                      {
                        onClick: handleRestoreSave,
                        className:
                          "w-full py-2.5 bg-zinc-900/80 border border-amber-500/30 text-amber-500/80 font-black text-[10px] rounded-xl uppercase cursor-pointer tracking-widest hover:border-amber-400/50 transition",
                      },
                      "RESUME LAST GAME",
                    ),
                  ),
            ),
          ),
        ),

      /* ── Exit Confirm ── */
      showExitConfirm &&
        React.createElement(
          "div",
          {
            className:
              "fixed inset-0 z-50 bg-black/95 backdrop-blur-lg flex items-center justify-center p-4",
          },
          React.createElement(
            "div",
            {
              className: "setup-card max-w-sm w-full p-6 rounded-2xl space-y-4",
            },
            React.createElement(
              "div",
              { className: "text-center space-y-2" },
              React.createElement(
                "span",
                { className: "text-3xl block" },
                "🚨",
              ),
              React.createElement(
                "h3",
                {
                  className:
                    "text-xs font-black tracking-widest text-rose-500 uppercase",
                },
                "ゲーム終了",
              ),
              React.createElement(
                "p",
                { className: "text-[11px] text-zinc-400 leading-relaxed" },
                "現在のゲームを終了してメニューに戻りますか？",
                React.createElement("br", null),
                React.createElement(
                  "span",
                  { className: "text-rose-500/80 font-bold" },
                  "ターン履歴は消去されます。",
                ),
              ),
            ),
            React.createElement(
              "div",
              { className: "grid grid-cols-2 gap-3" },
              React.createElement(
                "button",
                {
                  onClick: () => {
                    playSound("revert");
                    setShowExitConfirm(false);
                  },
                  className:
                    "py-3 bg-zinc-900 border border-zinc-700/60 text-zinc-400 text-xs font-bold rounded-xl cursor-pointer",
                },
                "CANCEL",
              ),
              React.createElement(
                "button",
                {
                  onClick: handleLeaveToMenu,
                  className:
                    "py-3 bg-rose-600 border border-rose-500 text-white text-xs font-black rounded-xl cursor-pointer",
                },
                "LEAVE",
              ),
            ),
          ),
        ),

      /* ── How To ── */
      showHowTo && (() => {
        const isJa = helpLang !== "en"; // デフォルト日本語
        const helpItems = isJa ? [
          ["1. 入力", "盤面を直接タップするか、テンキーを使います。S/D/T でシングル・ダブル・トリプルを選んでから数字をタップ。"],
          ["2. 編集", "3つのダーツスロットをタップすると上書き編集できます。UNDOで1投取り消し、CLEARでターン全消去。"],
          ["3. アレンジ (01)", "上部バーに標準チェックアウトルートが表示されます。"],
          ["4. Count-Up", "各プレイヤーが3投×Nラウンド投げて合計点を競います。"],
          ["5. CPU対戦", "設定で🤖CPUをONにすると、AIが自動で投げます。難易度は EASY〜PRO から選べます。"],
          ["6. PREV TURN", "PREV（戻る）ボタンで前のターンに戻れます。throwing中は2回押し確認、next中は1回で即戻り。"],
        ] : [
          ["1. Input", "Tap the board directly or use the keypad. Choose S/D/T (Single/Double/Triple) then tap the number."],
          ["2. Edit", "Tap a dart slot to overwrite. UNDO removes the last dart, CLEAR wipes the whole turn."],
          ["3. Assist (01)", "The top bar shows the standard checkout route for your remaining score."],
          ["4. Count-Up", "Players throw 3 darts × N rounds and accumulate points. Highest total wins."],
          ["5. CPU Match", "Enable 🤖 CPU in the setup to play against AI. Choose difficulty from EASY to PRO."],
          ["6. PREV TURN", "PREV button undoes the previous turn. Press twice during throwing, once after OK."],
        ];
        return React.createElement("div", {
          className: "fixed inset-0 z-50 bg-black/90 backdrop-blur-md p-4 flex items-center justify-center",
        },
          React.createElement("div", {
            className: "setup-card max-w-sm w-full p-5 rounded-2xl space-y-4 no-scrollbar overflow-y-auto max-h-[85vh]",
          },
            React.createElement("div", { className: "flex justify-between items-center" },
              React.createElement("h3", { className: "text-[10px] font-black tracking-widest text-amber-400 uppercase" },
                isJa ? "クイックヘルプ" : "QUICK HELP"),
              React.createElement("div", { className: "flex items-center gap-2" },
                React.createElement("button", {
                  onClick: () => { playSound("click"); setHelpLang(l=>l==="ja"?"en":"ja"); },
                  className: "px-2 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-[9px] font-black text-zinc-400 hover:text-amber-400 cursor-pointer transition",
                }, isJa ? "EN" : "JP"),
                React.createElement("button", {
                  onClick: () => { playSound("revert"); setShowHowTo(false); },
                  className: "w-7 h-7 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white cursor-pointer",
                }, React.createElement(Icons.X, null)),
              ),
            ),
            React.createElement("div", { className: "space-y-3" },
              helpItems.map(([title, body]) =>
                React.createElement("div", { key: title, className: "bg-zinc-900/60 rounded-xl p-3 border border-zinc-800/60" },
                  React.createElement("p", { className: "text-[10px] font-black text-amber-300 mb-1" }, title),
                  React.createElement("p", { className: "text-[11px] text-zinc-300 leading-relaxed" }, body),
                )
              ),
            ),
            React.createElement("button", {
              onClick: () => { playSound("revert"); setShowHowTo(false); },
              className: "w-full py-2 bg-zinc-900 border border-zinc-800 text-zinc-500 font-bold text-[10px] rounded-xl cursor-pointer hover:text-zinc-300 transition",
            }, isJa ? "閉じる" : "CLOSE"),
          ),
        );
      })(),

      /* ── Winner / Count-Up Result ── */
      winner &&
        React.createElement(
          "div",
          {
            className:
              "fixed inset-0 z-[100] bg-[#050508] flex flex-col justify-center items-center p-4",
          },
          React.createElement(
            "div",
            { className: "text-center space-y-5 max-w-xs w-full" },
            React.createElement(
              "span",
              { className: "text-5xl block animate-bounce" },
              winner.isDraw ? "🤝" : winner.countUpResult ? "🏆" : "👑",
            ),
            React.createElement(
              "h2",
              {
                className:
                  "text-xl font-black tracking-wider text-amber-400 uppercase",
              },
              winner.isDraw ? "DRAW!" : winner.name + " WINS!",
            ),
            winner.countUpResult
              ? (() => {
                  const sortedScores = (winner.scores || [])
                    .slice()
                    .sort((a, b) => b.score - a.score);
                  const leadScore = sortedScores[0] ? sortedScores[0].score : 0;
                  return React.createElement(
                    "div",
                    { className: "space-y-2" },
                    sortedScores.map((s, rank) => {
                      const isWinner = !winner.isDraw && s.name === winner.name;
                      const diffFromLead = leadScore - s.score;
                      return React.createElement(
                        "div",
                        {
                          key: s.name,
                          className: `flex justify-between items-center rounded-xl px-4 py-3 border ${isWinner ? "bg-amber-950/40 border-amber-500/50" : "bg-zinc-900/60 border-zinc-800"}`,
                        },
                        React.createElement(
                          "div",
                          { className: "text-left flex items-center gap-3" },
                          React.createElement(
                            "span",
                            {
                              className: `w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border ${rank === 0 ? "border-amber-400 text-amber-300 bg-amber-500/10" : "border-zinc-700 text-zinc-500 bg-black/20"}`,
                            },
                            rank + 1,
                          ),
                          React.createElement(
                            "div",
                            null,
                            React.createElement(
                              "span",
                              {
                                className: `block text-[11px] font-black uppercase ${isWinner ? "text-amber-300" : "text-zinc-300"}`,
                              },
                              s.name,
                            ),
                            diffFromLead > 0 &&
                              React.createElement(
                                "span",
                                {
                                  className:
                                    "block text-[9px] text-zinc-500 font-bold mt-0.5",
                                },
                                `LEAD -${diffFromLead}`,
                              ),
                          ),
                        ),
                        React.createElement(
                          "span",
                          {
                            className: `text-2xl font-black font-mono tabular-nums ${isWinner ? "text-amber-300" : "text-zinc-300"}`,
                          },
                          s.score,
                        ),
                      );
                    }),
                  );
                })()
              : React.createElement("div", { className: "space-y-2" },
                  React.createElement("p", { className: "text-[10px] text-zinc-500 font-bold tracking-widest mb-2" },
                    winner.o1RoundResult ? "🏁 ラウンド終了！" : "🎯 チェックアウト！"),
                  players.filter((p,i) => i < playerCount).map((p,i) =>
                    React.createElement("div", {
                      key: p.id,
                      // isDraw時はid=nullなので全行をニュートラル表示、勝者はnameで判定
                      className: `flex justify-between items-center rounded-xl px-4 py-2.5 border ${!winner.isDraw && p.id === winner.id ? "bg-amber-950/40 border-amber-500/50" : "bg-zinc-900/60 border-zinc-800"}`,
                    },
                      React.createElement("span", { className: `text-[11px] font-black uppercase ${!winner.isDraw && p.id===winner.id?"text-amber-300":"text-zinc-400"}` }, p.name),
                      React.createElement("span", { className: `text-lg font-black font-mono ${!winner.isDraw && p.id===winner.id?"text-amber-300":"text-zinc-400"}` },
                        winner.o1RoundResult
                          ? p.remainingScore
                          : p.remainingScore === 0 ? "✓ OUT" : p.remainingScore)
                    )
                  ),
                ),
            React.createElement(
              "button",
              {
                onClick: () => {
                  handleStartGame(true);
                },
                className:
                  "w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 text-black font-black text-base rounded-2xl cursor-pointer hover:from-amber-300 hover:to-amber-400 shadow-[0_8px_24px_rgba(245,158,11,0.2)] tracking-[0.1em] uppercase transition",
              },
              "もう一度 / PLAY AGAIN",
            ),
          ),
        ),
    );
  }

  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(React.createElement(App, null));
})();
