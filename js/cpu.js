// ═══════════════════════════════════════════════════════════════════════
// cpu.js — CPU難易度パラメータ + CPUの投擲戦略
// 依存: constants.js, checkout.js
// ═══════════════════════════════════════════════════════════════════════
  // ◆ SECTION: CPU Difficulty
  // CPU難易度パラメータ定義。numberAccuracy/ringWeights(狙いの精度) / dropChance(投げ損ない率) / checkoutHitProb(仕上げ成功率)。
  // ═══════════════════════════════════════════════════════════════════════
  const CPU_DIFFICULTY = {
    easy:   { numberAccuracy: 0.55, ringWeights: { single: 0.75, double: 0.22, triple: 0.03 }, dropChance: 0.40, dropDarts: 2, checkoutHitProb: 0.10 },
    medium: { numberAccuracy: 0.62, ringWeights: { single: 0.68, double: 0.25, triple: 0.07 }, dropChance: 0.24, dropDarts: 1, checkoutHitProb: 0.20 },
    hard:   { numberAccuracy: 0.85, ringWeights: { single: 0.08, double: 0.17, triple: 0.75 }, dropChance: 0.08, dropDarts: 1, checkoutHitProb: 0.60 },
    pro:    { numberAccuracy: 0.95, ringWeights: { single: 0.03, double: 0.07, triple: 0.90 }, dropChance: 0.02, dropDarts: 0, checkoutHitProb: 0.82 },
  };

  // ═══════════════════════════════════════════════════════════════════════
  // ◆ SECTION: CPU Strategy
  // CPU自動投擲ロジック。cpuComputeThrow(1投の計算) / cpuPlayTurn(1ターン=最大3投の計算)。
  // ═══════════════════════════════════════════════════════════════════════
  const cpuComputeThrow = (remaining, gameMode, outMode, difficulty, bullType) => {
    const cfg = CPU_DIFFICULTY[difficulty] || CPU_DIFFICULTY.medium;
    outMode = normalizeOutMode(outMode);

    const safeRemaining = Math.max(2, remaining);
    const margin = outMode !== "single" ? 2 : 1;
    const cap = gameMode === "countup" ? Infinity : safeRemaining - margin; // これを超えるとバーストする上限

    // 01ゲーム: チェックアウト可能なら狙う
    if (gameMode === "01" && remaining <= 170) {
      const checkout = findCheckoutRoute(remaining, 3, bullType, outMode, "double");
      if (checkout) {
        // proは高確率で決める、easyは低確率
        const hitProb = cfg.checkoutHitProb ?? 0.4;
        const first = checkout.route.split(" - ")[0].trim();
        const isTriple = first.startsWith("T") && !first.includes("Bull");
        const isDouble = first.startsWith("D") && !first.includes("Bull");
        // S-Bull は 25点 (separate bull設定時), D-Bull/Bull は 50点
        const isSingleBull = first === "S-Bull" || first === "S-Bull(25)";
        const isBull = first.includes("Bull");
        const bullScore = isSingleBull ? 25 : 50; // separate bullでもCPUが正しく処理できる
        const num = isBull ? bullScore : parseInt(first.replace(/^[TDS]/, "")) || 0;

        if (Math.random() < hitProb) {
          // 成功：チェックアウトルートの最初のショットを採用
          return {
            score: isBull ? bullScore : num,
            multiplier: isBull ? 1 : isTriple ? 3 : isDouble ? 2 : 1,
            label: first,
            isBull,
          };
        }

        // 失敗：「20番に切り替える」のではなく、狙った番号のまま一段階弱いリングに
        // 落ちる自然なミスを再現する（ダブル失敗→同じ番号のシングル、が最も典型的）。
        if (isBull) {
          // インナーブル失敗→アウターブル、さらに外れれば隣接シングルへ
          if (Math.random() < 0.6) {
            return { score: 25, multiplier: 1, label: "S-Bull(25)", isBull: true };
          }
          const missNum = WEDGES[Math.floor(Math.random() * WEDGES.length)];
          return { score: missNum, multiplier: 1, label: `S${missNum}`, isBull: false };
        }
        if (isTriple) {
          // トリプル失敗→同じ番号のシングルへ落ちることが多い（まれにダブルへ）
          const toDouble = Math.random() < 0.15;
          return toDouble
            ? { score: num, multiplier: 2, label: `D${num}`, isBull: false }
            : { score: num, multiplier: 1, label: `S${num}`, isBull: false };
        }
        if (isDouble) {
          // ダブル失敗→同じ番号のシングルへ（一番よくある外し方）。まれに完全ミス
          if (Math.random() < 0.08) {
            return { score: 0, multiplier: 0, label: "MISS", isBull: false };
          }
          return { score: num, multiplier: 1, label: `S${num}`, isBull: false };
        }
        // シングル狙い（低い残り点数）失敗→隣のウェッジへ逸れる
        const idx = WEDGES.indexOf(num);
        const missNum = idx >= 0
          ? WEDGES[Math.random() < 0.5 ? (idx + 1) % WEDGES.length : (idx - 1 + WEDGES.length) % WEDGES.length]
          : num;
        return { score: missNum, multiplier: 1, label: `S${missNum}`, isBull: false };
      }
    }

    // 通常ショット：常に20番を狙う。当たるかどうか(numberAccuracy)と、
    // 当たった場合にどのリングに刺さるか(ringWeights)を難易度ごとに分けて判定する。
    // easyは的の広いシングルを狙い、proは細いトリプルを狙う、という判断の違いを表現する。
    let num = 20;
    if (Math.random() > cfg.numberAccuracy) {
      // 20の隣（WEDGES上で隣接する1 or 5）に逸れる
      const idx20 = WEDGES.indexOf(20);
      const neighborIdx = Math.random() < 0.5
        ? (idx20 + 1) % WEDGES.length
        : (idx20 - 1 + WEDGES.length) % WEDGES.length;
      num = WEDGES[neighborIdx];
    }

    let mult = 1;
    const roll = Math.random();
    let acc = 0;
    for (const ring of ["single", "double", "triple"]) {
      acc += cfg.ringWeights[ring] ?? 0;
      if (roll <= acc) { mult = ring === "triple" ? 3 : ring === "double" ? 2 : 1; break; }
    }

    let pts = num * mult;

    // 残り点数を超えてバーストする組み合わせは、安全なリング/番号に落とし直す
    if (pts > cap) {
      if (cap >= 40) { mult = 2; }
      else if (cap >= 20) { mult = 1; }
      else {
        // capが20未満：cap以下で最も近いウェッジをシングル狙いにする
        const candidates = WEDGES.filter((w) => w <= cap);
        num = candidates.length
          ? candidates.reduce((a, b) => (Math.abs(b - cap) < Math.abs(a - cap) ? b : a), candidates[0])
          : 1;
        mult = 1;
      }
      pts = num * mult;
    }

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

      // 座標を近似（毎回同じピクセルに刺さらないよう、リング/ウェッジ内で軽くばらつかせる）
      let rx = 0, ry = 0;
      if (t.multiplier === 0) {
        const d = 188 + (Math.random() * 10 - 5), a = Math.random() * Math.PI * 2;
        rx = Math.round(d * Math.cos(a)); ry = Math.round(d * Math.sin(a));
      } else if (t.isBull) {
        const d = 4 + Math.random() * 4, a = Math.random() * Math.PI * 2;
        rx = Math.round(d * Math.cos(a)); ry = Math.round(d * Math.sin(a));
      } else {
        const d = (t.multiplier === 3 ? 101 : t.multiplier === 2 ? 165 : 133) + (Math.random() * 8 - 4);
        const idx = WEDGES.indexOf(t.score);
        const a = ((idx * 18 - 90) + (Math.random() * 10 - 5)) * Math.PI / 180;
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

  // ─────────────────────────────────────────────────────────────────────────
  // Cricket CPU戦略
  //   ①まだ自分が閉じていないナンバーを高い順（CRICKET_TARGETSの並び）に狙う
  //   ②自分が全部閉じ終えたら、相手がまだ閉じていない最も高いナンバーを狙って加点する
  //   通常ショットと同じ numberAccuracy / ringWeights を精度モデルとして流用する。
  // ─────────────────────────────────────────────────────────────────────────
  const cpuComputeCricketThrow = (myMarks, opponentsMarks, difficulty) => {
    const cfg = CPU_DIFFICULTY[difficulty] || CPU_DIFFICULTY.medium;

    const openForMe = CRICKET_TARGETS.filter((k) => (myMarks[k] || 0) < 3);
    let targetKey;
    if (openForMe.length > 0) {
      targetKey = openForMe[0];
    } else {
      const scorable = CRICKET_TARGETS.filter(
        (k) => opponentsMarks.length === 0 || !opponentsMarks.every((om) => (om[k] || 0) >= 3),
      );
      targetKey = scorable.length > 0 ? scorable[0] : 20;
    }

    // Bull狙い
    if (targetKey === 25) {
      if (Math.random() > cfg.numberAccuracy) {
        // Bull失投：適当な番号のシングルへ逸れる
        const num = WEDGES[Math.floor(Math.random() * WEDGES.length)];
        return { score: num, multiplier: 1, label: `S${num}`, isBull: false };
      }
      // ringWeights.tripleをインナーブル（50点=2マーク）を狙う精度の代わりに流用
      const isInner = Math.random() < cfg.ringWeights.triple;
      return isInner
        ? { score: 50, multiplier: 1, label: "D-Bull", isBull: true }
        : { score: 25, multiplier: 1, label: "S-Bull(25)", isBull: true };
    }

    // 通常ナンバー狙い：外れると隣接ウェッジに逸れる
    let num = targetKey;
    if (Math.random() > cfg.numberAccuracy) {
      const idx = WEDGES.indexOf(targetKey);
      const neighborIdx = Math.random() < 0.5
        ? (idx + 1) % WEDGES.length
        : (idx - 1 + WEDGES.length) % WEDGES.length;
      num = WEDGES[neighborIdx];
    }

    let mult = 1, roll = Math.random(), acc = 0;
    for (const ring of ["single", "double", "triple"]) {
      acc += cfg.ringWeights[ring] ?? 0;
      if (roll <= acc) { mult = ring === "triple" ? 3 : ring === "double" ? 2 : 1; break; }
    }
    return { score: num, multiplier: mult, label: `${mult === 3 ? "T" : mult === 2 ? "D" : "S"}${num}`, isBull: false };
  };

  // CPUがクリケットのターン分（3投）を計算して返す。座標近似はcpuPlayTurnと同じ考え方。
  const cpuPlayCricketTurn = (myMarks, opponentsMarks, difficulty) => {
    const cfg = CPU_DIFFICULTY[difficulty] || CPU_DIFFICULTY.medium;
    const throws = [];
    let marks = { ...myMarks };

    for (let i = 0; i < MAX_THROWS_PER_TURN; i++) {
      if (Math.random() < cfg.dropChance && i >= (MAX_THROWS_PER_TURN - cfg.dropDarts)) break;

      const t = cpuComputeCricketThrow(marks, opponentsMarks, difficulty);

      let rx = 0, ry = 0;
      if (t.isBull) {
        const d = 4 + Math.random() * 4, a = Math.random() * Math.PI * 2;
        rx = Math.round(d * Math.cos(a)); ry = Math.round(d * Math.sin(a));
      } else {
        const d = (t.multiplier === 3 ? 101 : t.multiplier === 2 ? 165 : 133) + (Math.random() * 8 - 4);
        const idx = WEDGES.indexOf(t.score);
        const a = ((idx * 18 - 90) + (Math.random() * 10 - 5)) * Math.PI / 180;
        rx = Math.round(d * Math.cos(a)); ry = Math.round(d * Math.sin(a));
      }

      throws.push({ ...t, x: rx, y: ry });
      // このダーツ後の自分のmarksを更新して次のダーツの狙い先判断に反映する
      // （得点計算はpointsに影響しないのでscore/opponentsMarksはダミーで構わない）
      marks = applyCricketDart(marks, 0, t, opponentsMarks).marks;
      if (throws.length >= MAX_THROWS_PER_TURN) break;
    }
    return throws.slice(0, MAX_THROWS_PER_TURN);
  };
  // ▲▲▲ チェックアウト/スコアリング/CPU関連ロジック ここまで ▲▲▲

  // ═══════════════════════════════════════════════════════════════════════
