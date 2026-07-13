// ═══════════════════════════════════════════════════════════════════════
// checkout.js — チェックアウトルート探索 + 盤面座標/ラウンド判定などの共通基盤
// 依存: constants.js
// ═══════════════════════════════════════════════════════════════════════
  // ─────────────────────────────────────────────────────────────────────────
  // ARRANGE_TABLE: 2～170点の標準チェックアウトルート
  // ─────────────────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════
  // ◆ SECTION: Checkout Logic
  // チェックアウトルート探索。ARRANGE_TABLE(標準アレンジ表) / BOGEY_SETUP_TABLE(ボギー数の一般的セットアップ) /
  // getSteelDartsArrangement(高得点時のセットアップ提案) / findCheckoutRoute(動的チェックアウト探索)。
  // ═══════════════════════════════════════════════════════════════════════
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

  // ─────────────────────────────────────────────────────────────────────────
  // BOGEY_SETUP_TABLE: ボギー数(169/168/166/165/163/162/159)用の一般的アレンジ
  //   この7点は3本では絶対に上がれない（標準double-out、3ダーツ前提）。
  //   「理論上最適」ではなく、多くのプレイヤーが自然に投げる一般的なセットアップを表示する
  //   （DARTSLIVE/PHOENIX等の市販マシンと同じ方針）。セパレートブル基準。
  //   ファットブル(50/50)設定では159/165等が上がれる場合があるが、
  //   それは findCheckoutRoute 側の通常探索で別途処理されるため、ここでは扱わない。
  // ─────────────────────────────────────────────────────────────────────────
  const BOGEY_SETUP_TABLE = {
    169: "T20 - T19 - 52",
    168: "T20 - T20 - 48",
    166: "T20 - T20 - 46",
    165: "T20 - T19 - 48",
    163: "T20 - T17 - 52",
    162: "T20 - T20 - 42",
    159: "T19 - T19 - 45",
  };

  // ═══════════════════════════════════════════════════════════════════════
  // ◆ SECTION: Round & Throw Helpers
  // Checkout/Scoring双方が依存する共通基盤。cloneDeep / getSubtotal / normalizeOutMode /
  // getRoundState(バースト・フィニッシュ判定) / getHitSoundType / getThrowFromCoords(盤面タップ→投擲変換)。
  // ═══════════════════════════════════════════════════════════════════════
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

  // ─────────────────────────────────────────────────────────────────────────
  // ◆ Cricket Logic
  // 標準クリケット（自分が閉じた数字で得点、相手の点には影響しない）のルールエンジン。
  // 対象ナンバーは20-19-18-17-16-15-Bull(=25として扱う)の7つ。
  // 1本のダーツで入るマーク数 = S:1 D:2 T:3（Bullはシングル25点で1、ダブル50点で2）。
  // マークが3を超えた分（オーバーフロー）は、その番号を「他の全プレイヤーがまだ閉じていない」場合のみ
  // 得点（オーバーフロー本数×番号の値）に変換される。
  // ─────────────────────────────────────────────────────────────────────────
  const CRICKET_TARGETS = [20, 19, 18, 17, 16, 15, 25]; // 25 = Bull。降順でCPUの優先狙い順にもなる

  // 投擲1本をクリケットの「対象ナンバー・マーク数・1マークあたりの得点」に変換する。
  // 対象外（15-20でもBullでもない、またはMISS）ならnullを返す。
  const getCricketTarget = (t) => {
    if (!t || t.multiplier === 0) return null;
    if (t.isBull) return { key: 25, marksHit: t.score === 50 ? 2 : 1, value: 25 };
    if (!CRICKET_TARGETS.includes(t.score)) return null;
    return { key: t.score, marksHit: t.multiplier, value: t.score };
  };

  // ダーツ1本をmarks/scoreに適用する（不変：新しいオブジェクトを返す純粋関数）
  //   marks          : 適用対象プレイヤーの現在のマーク状況 { 20:0-3, 19:0-3, ..., 25:0-3 }
  //   score          : 適用対象プレイヤーの現在のクリケット得点
  //   opponentsMarks : 他プレイヤー全員のmarksの配列（そのナンバーが全員closed=3済みかどうかの判定に使う）
  const applyCricketDart = (marks, score, t, opponentsMarks) => {
    const target = getCricketTarget(t);
    if (!target) return { marks, score, pointsScored: 0, key: null };
    const { key, marksHit, value } = target;
    const current = marks[key] || 0;
    const usedToClose = Math.min(marksHit, Math.max(0, 3 - current));
    const overflow = marksHit - usedToClose; // 3を閉じた後に余ったマーク数
    const updatedMarks = { ...marks, [key]: Math.min(3, current + marksHit) };
    // 対戦相手がいない（ソロ練習）場合は常にscorable扱い
    const allOpponentsClosed =
      opponentsMarks.length > 0 && opponentsMarks.every((om) => (om[key] || 0) >= 3);
    const pointsScored = allOpponentsClosed ? 0 : overflow * value;
    return { marks: updatedMarks, score: score + pointsScored, pointsScored, key };
  };

  // currentThrows（最大3本）をまとめて適用し、そのターン終了時点のmarks/score/獲得点を返す。
  // 01ゲームのgetRoundStateに相当するもの（ライブ表示・コミット処理の両方から呼ばれる）。
  const getCricketRoundState = (marks, score, throws, opponentsMarks) => {
    let m = marks, s = score, pointsThisTurn = 0;
    for (const t of throws) {
      const r = applyCricketDart(m, s, t, opponentsMarks);
      m = r.marks; s = r.score; pointsThisTurn += r.pointsScored;
    }
    return { marks: m, score: s, pointsThisTurn };
  };

  const isCricketAllClosed = (marks) => CRICKET_TARGETS.every((k) => (marks[k] || 0) >= 3);

  // 勝利判定: 全ナンバークローズ かつ 他の全プレイヤー以上の得点。
  // opponents が空（ソロ練習）の場合は全クローズのみで勝利。
  const checkCricketWinner = (player, opponents) =>
    isCricketAllClosed(player.cricketMarks) &&
    opponents.every((o) => player.cricketScore >= o.cricketScore);

  // ── DARTSLIVE2準拠 オートハンデ（01ゲーム）──
  // 出典: https://dlservicehelp.dartslive.com/hc/ja/article_attachments/360095644854
  // レーティング差(0.5刻み, 0.5〜8.5以降は一定)×持ち点(301/501/701/901/1101/1501) の実測値をそのまま転記。
  // 数式(持ち点×6%×差)でも近似できるが、下限プラトー(8.5以降固定)の挙動は公式表をそのまま使うのが確実。
  const DARTSLIVE2_01_BASE_SCORES = [301, 501, 701, 901, 1101, 1501];
  const DARTSLIVE2_01_HANDICAP_TABLE = {
    "0.5": [292, 486, 680, 874, 1068, 1456],
    "1": [283, 471, 659, 847, 1035, 1411],
    "1.5": [274, 456, 638, 820, 1002, 1366],
    "2": [265, 441, 617, 793, 969, 1321],
    "2.5": [256, 426, 596, 766, 936, 1276],
    "3": [247, 411, 575, 739, 903, 1231],
    "3.5": [238, 396, 554, 712, 870, 1186],
    "4": [229, 381, 533, 685, 837, 1141],
    "4.5": [220, 366, 512, 658, 804, 1096],
    "5": [211, 351, 491, 631, 771, 1051],
    "5.5": [202, 336, 470, 604, 738, 1006],
    "6": [193, 321, 449, 577, 705, 961],
    "6.5": [184, 306, 428, 550, 672, 916],
    "7": [181, 291, 407, 523, 639, 871],
    "7.5": [181, 276, 386, 496, 606, 826],
    "8": [181, 261, 365, 469, 573, 781],
    "8.5": [181, 251, 351, 451, 551, 751], // 8.5以降(9〜17)は表上ずっとこの値のまま変化しない
  };
  // レーティング差とベース持ち点から「レーティングが低い方」の実際の持ち点を算出。
  // ベース持ち点が公式6種以外、または差が0の場合はハンデなし(baseScoreそのまま)。
  const getDartslive2_01Handicap = (diff, baseScore) => {
    const idx = DARTSLIVE2_01_BASE_SCORES.indexOf(baseScore);
    if (idx === -1 || !Number.isFinite(diff)) return baseScore;
    const d = Math.min(17, Math.max(0, Math.round(diff * 2) / 2));
    if (d < 0.5) return baseScore;
    const key = d >= 8.5 ? "8.5" : String(d);
    return DARTSLIVE2_01_HANDICAP_TABLE[key][idx];
  };

  const makeEmptyCricketMarks = () =>
    CRICKET_TARGETS.reduce((acc, k) => ({ ...acc, [k]: 0 }), {});

  // ── DARTSLIVE2準拠 オートハンデ（クリケット）──
  // 出典: ユーザー提供のDARTSLIVE2公式資料（画像で確認済み、レーティング差1〜17の整数のみ。
  // 「※CRICKETは小数点以下切り捨て」との注記あり）。
  // 18→17→16→15の順に「/」(1マーク)→「×」(2マーク)を1ナンバーずつ積み、diff=8で
  // 全4ナンバーが2マーク到達（3マーク＝完全クローズには一度も到達しない点に注意）。
  // diff=9以降はマークは増えず、得点(ボーナス)だけが加算され続ける。20・19・Bullには触れない。
  const DARTSLIVE2_CRICKET_HANDICAP_TABLE = {
    1: { marks: { 18: 1 }, bonus: 8 },
    2: { marks: { 18: 2 }, bonus: 16 },
    3: { marks: { 18: 2, 17: 1 }, bonus: 24 },
    4: { marks: { 18: 2, 17: 2 }, bonus: 32 },
    5: { marks: { 18: 2, 17: 2, 16: 1 }, bonus: 40 },
    6: { marks: { 18: 2, 17: 2, 16: 2 }, bonus: 48 },
    7: { marks: { 18: 2, 17: 2, 16: 2, 15: 1 }, bonus: 56 },
    8: { marks: { 18: 2, 17: 2, 16: 2, 15: 2 }, bonus: 64 },
    9: { marks: { 18: 2, 17: 2, 16: 2, 15: 2 }, bonus: 88 },
    10: { marks: { 18: 2, 17: 2, 16: 2, 15: 2 }, bonus: 112 },
    11: { marks: { 18: 2, 17: 2, 16: 2, 15: 2 }, bonus: 136 },
    12: { marks: { 18: 2, 17: 2, 16: 2, 15: 2 }, bonus: 160 },
    13: { marks: { 18: 2, 17: 2, 16: 2, 15: 2 }, bonus: 184 },
    14: { marks: { 18: 2, 17: 2, 16: 2, 15: 2 }, bonus: 208 },
    15: { marks: { 18: 2, 17: 2, 16: 2, 15: 2 }, bonus: 232 },
    16: { marks: { 18: 2, 17: 2, 16: 2, 15: 2 }, bonus: 256 },
    17: { marks: { 18: 2, 17: 2, 16: 2, 15: 2 }, bonus: 280 },
  };
  // レーティング差から { marks, bonus } を返す。diffは整数に切り捨て、0〜17にクランプ。
  const getDartslive2CricketHandicap = (diff) => {
    const d = Math.min(17, Math.max(0, Math.floor(diff || 0)));
    if (d < 1) return { marks: makeEmptyCricketMarks(), bonus: 0 };
    const entry = DARTSLIVE2_CRICKET_HANDICAP_TABLE[d];
    return { marks: { ...makeEmptyCricketMarks(), ...entry.marks }, bonus: entry.bonus };
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

    // 171～180: ARRANGE_TABLEに載っていないボギー数（3本では上がれないスコア）
    // BOGEY_SETUP_TABLE は「理論上最適」ではなく、一般的に投げられるアレンジ。
    // DARTSLIVE/PHOENIXのアシスト方針と同じく、多くのプレイヤーが自然に投げる
    // セットアップを表示する（セパレートブル基準）。
    if (BOGEY_SETUP_TABLE[score]) return BOGEY_SETUP_TABLE[score];

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
      // rem が解けるスコアかチェック (180以下 かつ ボギー数以外 かつ テーブルにある)
      if (rem <= 170 && !BOGEY_SETUP_TABLE[rem] && ARRANGE_TABLE[rem]) {
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
