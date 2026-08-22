// ═══════════════════════════════════════════════════════════════════════
// scoring.js — リーブの質評価 + アシストバー文言生成
// 依存: constants.js, checkout.js
// ═══════════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════════
  // ◆ SECTION: Scoring Logic (Leave Quality)
  // 残り点数の「上がりやすさ」評価。compactRoute(表示整形) / BOGEY_NUMBERS / PREFERRED_LEAVES / LEAVE_PRIORITY /
  // scoreLeaveQuality(リーブの質をスコア化)。
  // ═══════════════════════════════════════════════════════════════════════
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
  //   numberAccuracy  : 狙った番号（常に20）に当たる確率（0〜1）。外れると隣接ウェッジ
  //                     （1 or 5）に逸れる。低いほど「20を狙って隣の1/5に刺さる」ミスが増える。
  //   ringWeights     : 通常ショットでシングル/ダブル/トリプルどのリングに刺さるかの重み。
  //                     実際のダーツと同様、下手なほど「細いトリプルを狙わずシングルの
  //                     広い的を狙う」判断をするという想定（狙いは常に20、リングだけが変わる）。
  //   dropChance      : 1投ごとの「投げ損ない(MISS)」発生確率（0〜1）。
  //                     cpuPlayTurnのループ内で、対象ダーツ(i)がdropDarts範囲に入っているときのみ判定される。
  //   dropDarts       : 1ターン3投のうち、終盤何投がdropChance判定の対象になるか。
  //                     例: dropDarts=1 なら3投目だけが対象、dropDarts=2 なら2,3投目が対象。
  //                     0にすると一切ドロップしない（pro想定）。
  //   checkoutHitProb : チェックアウトルートを狙った際に成功する確率（0〜1）。
  //                     findCheckoutRouteで有効なルートが見つかった場合のみ参照される。
  //                     失敗時は通常ショット計算にフォールバックする。
  // ═══════════════════════════════════════════════════════════════════════
  // ◆ SECTION: Scoring Logic (Assist Output) — つづき
  // findHighScorePlan(301+の高得点セットアップ探索) / buildAssistLine(画面上部アシスト文言生成) /
  // buildCountUpAssist(Count-Up用のペース表示)。CPU Strategyの前段(scoreLeaveQuality)と同一責務区分。
  // ═══════════════════════════════════════════════════════════════════════
  // ─────────────────────────────────────────────────────────────────────────
  // findHighScorePlan の候補ショット定義
  //   HIGH_VALUE_SHOTS: dartsLeft>=2(まだ後続の投擲がある)ケース用。組み合わせ探索の
  //     分岐数がdepth乗で効いてくる(buildAssistLineはuseMemo無しで毎レンダー再計算されるため
  //     重い候補セットは体感パフォーマンスに直結する)ので、実戦で高得点セットアップとして
  //     現実的に選ばれる範囲(T15-T20 / S19-S20 / Bull)に絞る。
  //   ALL_SHOTS: dartsLeft===1(そのターン最後の1投)専用。この場合は分岐が1段しかないため
  //     全ナンバー×S/D/T + Bullを試しても計算コストは無視できる。以前はここもHIGH_VALUE_SHOTS
  //     を流用していたため「最後の1投で本来はD/Bullや他ナンバーを狙うべきリーブ」が
  //     候補から漏れていた。
  // ─────────────────────────────────────────────────────────────────────────
  const HIGH_VALUE_SHOTS = [
    { label: "T20", pts: 60 },
    { label: "T19", pts: 57 },
    { label: "T18", pts: 54 },
    { label: "T17", pts: 51 },
    { label: "T16", pts: 48 },
    { label: "T15", pts: 45 },
    { label: "D-Bull", pts: 50 },
    { label: "S-Bull", pts: 25 },
    { label: "S20", pts: 20 },
    { label: "S19", pts: 19 },
  ];
  const ALL_SHOTS = (() => {
    const arr = [];
    for (let n = 1; n <= 20; n++) {
      arr.push({ label: `S${n}`, pts: n });
      arr.push({ label: `D${n}`, pts: n * 2 });
      arr.push({ label: `T${n}`, pts: n * 3 });
    }
    arr.push({ label: "D-Bull", pts: 50 });
    arr.push({ label: "S-Bull", pts: 25 });
    return arr;
  })();

  const findHighScorePlan = (
    score,
    dartsLeft,
    bullType,
    outMode,
    checkoutPref = "double",
  ) => {
    outMode = normalizeOutMode(outMode);
    // 以前は score<=180 で弾いていたが、ターン途中（dartsLeft<3）の続きのプラン探索にも
    // このsearch関数を再利用したいため撤廃。呼び出し側は「直接チェックアウトできない場合」
    // にのみこれを使うので、スコア帯による足切りは不要。
    if (dartsLeft <= 0) return null;
    const shots = dartsLeft === 1 ? ALL_SHOTS : HIGH_VALUE_SHOTS;
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
      // ターン開始時（まだ1本も投げていない）は標準アレンジ表(ARRANGE_TABLE/BOGEY_SETUP_TABLE)を
      // そのまま使う。一方ターン途中（既に1本以上投げていて dartsLeft < MAX_THROWS_PER_TURN）は
      // getSteelDartsArrangement が「残り投げ数を無視して毎回ゼロから引き直す」ため、
      // 1投目・2投目の結果と矛盾するアレンジ（例: T20-T18を投げた直後に3投目の代わりに
      // 全く別の3本アレンジが出る）が起きていた。ターン途中は dartsLeft を渡せる
      // findHighScorePlan を優先し、それでも見つからない場合のみ従来のフォールバックに回す。
      const isFreshTurn = dartsLeft === MAX_THROWS_PER_TURN;
      const fallback = isFreshTurn
        ? getSteelDartsArrangement(cur, bullType, outMode)
        : findHighScorePlan(cur, dartsLeft, bullType, outMode, checkoutPref) ||
          getSteelDartsArrangement(cur, bullType, outMode);
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
  // Cricket: 次に狙うべきナンバーの提示（自分がまだ閉じていない最上位ナンバー優先）
  // ─────────────────────────────────────────────────────────────────────────
  const buildCricketAssist = (player, opponentsMarks, currentThrows) => {
    const live = getCricketRoundState(player.cricketMarks, player.cricketScore, currentThrows, opponentsMarks);
    const openForMe = CRICKET_TARGETS.filter((k) => (live.marks[k] || 0) < 3);
    const label = (k) => (k === 25 ? "BULL" : String(k));
    if (openForMe.length === 0) {
      // ソロプレイ(opponentsMarks.length===0)で自分が全ナンバーを閉じ切った場合は
      // 既に勝利条件を満たしているので、まだ狙う先があるかのような
      // "SCORE ON 20" ではなく、決着間近であることが分かる文言にする。
      if (opponentsMarks.length === 0) {
        return { text: "ALL CLOSED", sub: `SCORE ${live.score} · OK to finish`, color: "text-emerald-300", pulse: true };
      }
      const scorable = CRICKET_TARGETS.filter(
        (k) => !opponentsMarks.every((om) => (om[k] || 0) >= 3),
      );
      if (scorable.length === 0) {
        return { text: "ALL CLOSED", sub: `SCORE ${live.score}`, color: "text-amber-300", pulse: false };
      }
      return {
        text: `SCORE ON ${label(scorable[0])}`,
        sub: `SCORE ${live.score}`,
        color: "text-amber-300",
        pulse: true,
      };
    }
    const target = openForMe[0];
    const need = 3 - (live.marks[target] || 0);
    return {
      text: `AIM ${label(target)} (残${need})`,
      sub: `SCORE ${live.score}`,
      color: "text-zinc-500",
      pulse: false,
    };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 通算成績(ゲームをまたいだ成長記録)
  //
  // 設計方針(Phase 1 / Phase 2への移行を見据えた設計):
  //   ・プレイヤー識別は最初から playerKey / playerName を分けて持つ。
  //     Phase 1(今回): playerKey = normalizePlayerName(playerName) による名前ベースの簡易名寄せ。
  //     Phase 2(将来): プロフィールUIを追加したら playerKey を "player_001" のような固定IDに
  //       差し替えられる。レコードのフィールド構成自体は変えずに済む設計にしてある。
  //   ・normalizePlayerNameは「表記ゆれの吸収」だけに留め、別名の同一人物推定(ローマ字⇄
  //     かな⇄カナ等)はしない。誤った名寄せは統計システムでは分離より厄介なため。
  // ─────────────────────────────────────────────────────────────────────────
  const normalizePlayerName = (name) => {
    if (typeof name !== "string") return "";
    return name
      .normalize("NFKC") // 全角/半角スペース・英数字の表記ゆれを吸収
      .trim()
      .replace(/\s+/g, " "); // 連続空白を1つに圧縮
  };

  // 1ゲーム終了時点で、参加プレイヤーごとの統計レコードを生成する。
  // 生のhistory(投擲ログ)は保存せず、後から再集計したくなった時のために
  // 「集計値＋ゲーム条件」だけを残す設計(ダーツ本数を含めるのはPPD等の再計算余地を残すため)。
  const buildGameStatsRecords = (players, playerCount, winner, gameMode, outMode) => {
    if (!winner) return [];
    const relevant = playerCount === 1 ? [players[0]] : players.slice(0, 2);

    return relevant.map((p) => {
      const dartsThrown = p.history.reduce(
        (sum, node) => sum + (Array.isArray(node.throws) ? node.throws.length : 0),
        0,
      );
      const rounds = p.history.length;

      let win = null; // solo(playerCount===1)は勝敗の概念がないのでnull
      let isDraw = false;
      if (playerCount >= 2) {
        isDraw = Boolean(winner.isDraw);
        win = !isDraw && p.name === winner.name;
      }

      let finalScore = null;
      let ppd = null;
      let mpr = null;
      let checkoutSuccess = null;

      if (gameMode === "01") {
        finalScore = p.remainingScore;
        const scored = p.initialScore - p.remainingScore;
        ppd = dartsThrown > 0 ? scored / dartsThrown : null;
        checkoutSuccess = p.remainingScore === 0;
      } else if (gameMode === "cricket") {
        finalScore = p.cricketScore;
        const totalMarks = Object.values(p.cricketMarks || {}).reduce(
          (a, b) => a + b,
          0,
        );
        mpr = rounds > 0 ? totalMarks / rounds : null;
      } else if (gameMode === "countup") {
        finalScore = p.accumulatedScore;
        ppd = dartsThrown > 0 ? p.accumulatedScore / dartsThrown : null;
      }

      return {
        ts: Date.now(),
        gameMode,
        startingScore: gameMode === "01" ? p.initialScore : null,
        outMode: gameMode === "01" ? normalizeOutMode(outMode) : null,
        playerCount,
        playerKey: normalizePlayerName(p.name),
        playerName: p.name,
        win,
        isDraw,
        rounds,
        darts: dartsThrown,
        finalScore,
        ppd,
        mpr,
        checkoutSuccess,
      };
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Icons
  // ─────────────────────────────────────────────────────────────────────────
