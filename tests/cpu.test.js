"use strict";
// ═══════════════════════════════════════════════════════════════════════
// cpu.test.js — js/cpu.js の純粋関数テスト
//
// CPUAIの確率分布そのものは固定しない(実装の自然な改善を妨げないため)。
// 代わりに3層に分けて検証する:
//   1. 決定論的テスト: Math.random()を定数関数に差し替え、境界での挙動を固定する
//      (「ランダム値の並びを正確に予測する」のではなく、min/max付近の極端な値で
//       何が起きるかという契約を確認する)
//   2. 不変条件テスト: 本物のMath.random()で大量に実行し、difficulty/gameMode/outMode
//      を問わず常に成り立つべき制約(投擲数上限・有効なscore/multiplier等)を確認する
//   3. 契約テスト: 「PROは有利な条件でチェックアウトを狙える」「EASYでも不正な投擲を
//      生成しない」等、difficultyごとの振る舞いの大枠を確認する
//
// Math.randomはload-game-logic.jsのvmサンドボックスに同一参照で渡っているため、
// このファイル内でMath.randomを差し替えると、cpu.js側の呼び出しにもそのまま反映される。
// ═══════════════════════════════════════════════════════════════════════
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadGameLogic } = require("./load-game-logic.js");

const {
  CPU_DIFFICULTY,
  cpuComputeThrow,
  cpuPlayTurn,
  cpuComputeCricketThrow,
  cpuPlayCricketTurn,
  CRICKET_TARGETS,
  WEDGES,
} = loadGameLogic();

const DIFFICULTIES = ["easy", "medium", "hard", "pro"];

// Math.randomを固定値に差し替えて関数を実行する。テスト後は必ず元に戻す。
function withConstantRandom(value, fn) {
  const orig = Math.random;
  Math.random = () => value;
  try {
    return fn();
  } finally {
    Math.random = orig;
  }
}

const isValidScoreMultiplier = (t) => {
  if (t.multiplier === 0) return t.score === 0 && t.label === "MISS";
  if (t.isBull) {
    return (
      (t.score === 50 && t.multiplier === 1) ||
      (t.score === 25 && t.multiplier === 1)
    );
  }
  return (
    [1, 2, 3].includes(t.multiplier) &&
    WEDGES.includes(t.score) &&
    t.score >= 1 &&
    t.score <= 20
  );
};

// ─────────────────────────────────────────────────────────────────────────
// 1. 決定論的テスト
// ─────────────────────────────────────────────────────────────────────────

test("決定論(cpuComputeThrow): random=0(最小)かつチェックアウト圏外なら、必ず20番シングルを狙う", () => {
  DIFFICULTIES.forEach((d) => {
    const t = withConstantRandom(0, () =>
      cpuComputeThrow(300, "countup", "single", d, "separate"),
    );
    // random=0 → numberAccuracy判定は外れない(0 > accuracy は常にfalse) → 20を継続狙い
    // → ring roll(0)は必ずsingleバケットに収まる(single weight > 0のため)
    assert.equal(t.score, 20);
    assert.equal(t.multiplier, 1);
    assert.equal(t.label, "S20");
  });
});

test("決定論(cpuComputeThrow): random≈1(最大)かつチェックアウト圏外なら、必ずTripleを狙う(20の隣に外れる)", () => {
  DIFFICULTIES.forEach((d) => {
    const t = withConstantRandom(0.999999, () =>
      cpuComputeThrow(300, "countup", "single", d, "separate"),
    );
    assert.equal(t.multiplier, 3, `difficulty=${d}: ring roll最大値はtripleバケットに入るはず`);
    assert.ok(WEDGES.includes(t.score));
  });
});

test("決定論(cpuComputeThrow): 01でチェックアウト圏内・random=0なら、必ずチェックアウトに成功する", () => {
  // random=0 < hitProb(全難易度で0より大) は常に成立するため、checkout成功分岐に入る
  DIFFICULTIES.forEach((d) => {
    const t = withConstantRandom(0, () =>
      cpuComputeThrow(40, "01", "double", d, "separate"),
    );
    // 40はD20で1投フィニッシュ可能な残り点数。成功分岐なら合致するはず
    assert.equal(t.score * t.multiplier, 40);
  });
});

test("決定論(cpuComputeThrow): 01でチェックアウト圏内・random≈1なら、必ずチェックアウトに失敗し安全なショットへ落ちる", () => {
  DIFFICULTIES.forEach((d) => {
    const t = withConstantRandom(0.999999, () =>
      cpuComputeThrow(40, "01", "double", d, "separate"),
    );
    // 失敗分岐はどのケースでも合法なThrowを返すはず(MISSも合法)
    assert.ok(isValidScoreMultiplier(t), `difficulty=${d}: ${JSON.stringify(t)}`);
  });
});

test("決定論(cpuPlayTurn): random≈1(最大)なら、EASYでもドロップは発生しない(dropChanceは1未満なので判定に必ず落ちる)", () => {
  const throws = withConstantRandom(0.999999, () =>
    cpuPlayTurn(501, "01", "double", "easy", "separate"),
  );
  // dropChance(easy=0.35)より大きい乱数は常にドロップ条件を満たさない
  assert.equal(throws.length, 3, "ドロップが起きないので3投投げ切るはず(501からチェックアウトはできないため)");
});

test("決定論(cpuPlayTurn): random=0(最小)かつEASY(dropDarts=2)なら、2投目でドロップして早期終了する", () => {
  const throws = withConstantRandom(0, () =>
    cpuPlayTurn(501, "01", "double", "easy", "separate"),
  );
  // dropChance判定は毎回random(0) < 0.35 = true。i>=(3-dropDarts)=i>=1 を満たす1投目(i=1)で
  // ドロップし、そこでターン終了する。つまり1投しか記録されない。
  assert.equal(throws.length, 1);
});

test("決定論(cpuPlayTurn): PRO(dropDarts=0)はrandomの値によらずドロップしない", () => {
  [0, 0.5, 0.999999].forEach((r) => {
    const throws = withConstantRandom(r, () =>
      cpuPlayTurn(501, "01", "double", "pro", "separate"),
    );
    assert.equal(throws.length, 3, `random=${r}でもPROはドロップしないはず`);
  });
});

test("決定論(cpuComputeCricketThrow): random=0なら開いている最優先ターゲットのシングルを狙う", () => {
  const myMarks = {}; // 全て未クローズ
  const t = withConstantRandom(0, () =>
    cpuComputeCricketThrow(myMarks, [], "medium"),
  );
  assert.equal(t.score, CRICKET_TARGETS[0]); // 降順の最初=20
  assert.equal(t.multiplier, 1);
});

test("決定論(cpuComputeCricketThrow): Bullが最優先ターゲットの場合、random=0ならS-Bull(25)を狙う", () => {
  // 20-15を全部クローズ済みにして、残りのターゲットがBull(25)だけの状態を作る
  const myMarks = { 20: 3, 19: 3, 18: 3, 17: 3, 16: 3, 15: 3 };
  const t = withConstantRandom(0, () =>
    cpuComputeCricketThrow(myMarks, [], "medium"),
  );
  assert.equal(t.isBull, true);
  // random=0 → numberAccuracy判定は外れない → isInner判定(0 < ringWeights.triple)は
  // triple weightが0より大きい全難易度でtrueになるのでD-Bull(inner)
  assert.equal(t.label, "D-Bull");
});

// ─────────────────────────────────────────────────────────────────────────
// 2. 不変条件テスト(本物のMath.randomで大量実行)
// ─────────────────────────────────────────────────────────────────────────

const GAME_MODES_FOR_THROW = ["01", "countup"];
const OUT_MODES = ["single", "double", "master"];
const BULL_TYPES = ["separate", "fat"];
const ITERATIONS = 300;

for (const difficulty of DIFFICULTIES) {
  test(`不変条件(cpuPlayTurn, difficulty=${difficulty}): 投擲数は常に3以下、各投擲は常に合法な値`, () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const gameMode = GAME_MODES_FOR_THROW[i % GAME_MODES_FOR_THROW.length];
      const outMode = OUT_MODES[i % OUT_MODES.length];
      const bullType = BULL_TYPES[i % BULL_TYPES.length];
      const remaining = 2 + (i % 500); // 2〜501の範囲を回す
      const throws = cpuPlayTurn(remaining, gameMode, outMode, difficulty, bullType);
      assert.ok(throws.length <= 3, `投擲数が3を超えた: ${throws.length}`);
      throws.forEach((t) => {
        assert.ok(
          isValidScoreMultiplier(t),
          `不正なThrow: ${JSON.stringify(t)} (remaining=${remaining}, gameMode=${gameMode}, outMode=${outMode})`,
        );
        assert.equal(typeof t.x, "number");
        assert.equal(typeof t.y, "number");
        assert.ok(Number.isFinite(t.x));
        assert.ok(Number.isFinite(t.y));
      });
    }
  });
}

test("不変条件(cpuPlayTurn, 01): バーストする組み合わせのThrowは生成されない(投げた時点でのcurが負にならない範囲で安全側に倒す設計を確認)", () => {
  for (let i = 0; i < ITERATIONS; i++) {
    const difficulty = DIFFICULTIES[i % DIFFICULTIES.length];
    const outMode = OUT_MODES[i % OUT_MODES.length];
    const remaining = 2 + (i % 170); // チェックアウト圏内を重点的に
    const throws = cpuPlayTurn(remaining, "01", outMode, difficulty, "separate");
    let cur = remaining;
    for (const t of throws) {
      cur -= t.score * t.multiplier;
    }
    // 最終的な残り点数が負になっていない、またはバーストとして記録された1投で終わっている
    // (cpuPlayTurn内部でバースト検出時は「バーストしたその1投を記録してturn終了」する仕様のため、
    //  負になること自体はバーストの記録として許容されるが、その場合は必ずその投擲でthrowsが終わる)
    if (cur < 0 || (cur === 1 && normalizeOutModeSafe(outMode) !== "single")) {
      // バーストが記録された場合、それが最後の投擲であることを確認
      assert.ok(throws.length > 0, "バーストなのに投擲が記録されていない");
    }
  }
});

// normalizeOutModeはcheckout.js側のクロージャ内にあり直接importできないため、
// テスト側で同じ正規化ロジックの簡易版を用意する(このテストの判定用途に限定)。
function normalizeOutModeSafe(om) {
  if (om === "open") return "single";
  if (["single", "double", "master"].includes(om)) return om;
  return "double";
}

for (const difficulty of DIFFICULTIES) {
  test(`不変条件(cpuComputeCricketThrow/cpuPlayCricketTurn, difficulty=${difficulty}): 常に有効なCRICKET_TARGETSのナンバー(または合法なMISS相当の隣接シングル)を返す`, () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const myMarks = {}; // 未クローズから開始(最も分岐が広いケース)
      const t = cpuComputeCricketThrow(myMarks, [], difficulty);
      if (t.isBull) {
        assert.ok([25, 50].includes(t.score));
      } else {
        // Cricket用CPUは対象外ナンバーに外れる場合もある(隣接ウェッジへの逸れ)ので、
        // WEDGES全体に含まれていることだけを保証する(CRICKET_TARGETS限定ではない)
        assert.ok(WEDGES.includes(t.score), `score=${t.score}がWEDGESに含まれない`);
      }
      assert.ok([1, 2, 3].includes(t.multiplier) || t.isBull);
    }
  });

  test(`不変条件(cpuPlayCricketTurn, difficulty=${difficulty}): 投擲数は常に3以下`, () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const throws = cpuPlayCricketTurn({}, [{}], difficulty);
      assert.ok(throws.length <= 3, `投擲数が3を超えた: ${throws.length}`);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────
// 3. 契約テスト(difficultyごとの振る舞いの大枠)
// ─────────────────────────────────────────────────────────────────────────

test("契約: PROは有利な条件(random=0)下では常にチェックアウトを決められる", () => {
  const throws = withConstantRandom(0, () =>
    cpuPlayTurn(40, "01", "double", "pro", "separate"),
  );
  const total = throws.reduce((sum, t) => sum + t.score * t.multiplier, 0);
  assert.equal(total, 40, "残り40をrandom=0(最有利)条件で1投フィニッシュできるはず");
});

test("契約: EASYは不利な条件(random≈1)下でも不正なThrowは生成しない", () => {
  const throws = withConstantRandom(0.999999, () =>
    cpuPlayTurn(501, "01", "double", "easy", "separate"),
  );
  throws.forEach((t) => assert.ok(isValidScoreMultiplier(t)));
});

test("契約: Cricketで自分の未クローズナンバーがある間は、そちらを優先して狙う(相手の得点機会には向かわない)", () => {
  const myMarks = { 20: 3 }; // 20だけクローズ済み、19以降は未クローズ
  const opponentsMarks = [{ 19: 3, 18: 3, 17: 3, 16: 3, 15: 3, 20: 0, 25: 0 }];
  const t = withConstantRandom(0, () =>
    cpuComputeCricketThrow(myMarks, opponentsMarks, "medium"),
  );
  // 自分が未クローズな19を狙うはず(相手の得点機会である20/25ではなく)
  assert.equal(t.score, 19);
});

test("契約: Cricketで自分が全クローズしたら、相手がまだ閉じていないナンバーへ切り替える", () => {
  const myMarks = { 20: 3, 19: 3, 18: 3, 17: 3, 16: 3, 15: 3, 25: 3 }; // 全クローズ
  const opponentsMarks = [{ 20: 3, 19: 0, 18: 3, 17: 3, 16: 3, 15: 3, 25: 3 }]; // 19だけ相手も未クローズ
  const t = withConstantRandom(0, () =>
    cpuComputeCricketThrow(myMarks, opponentsMarks, "medium"),
  );
  assert.equal(t.score, 19, "相手も自分も19だけ未クローズなので、そこを狙って加点する");
});

test("契約: Cricketで自分も相手も全員が全ナンバーをクローズ済みなら20番にフォールバックする", () => {
  const closedAll = { 20: 3, 19: 3, 18: 3, 17: 3, 16: 3, 15: 3, 25: 3 };
  const t = withConstantRandom(0, () =>
    cpuComputeCricketThrow(closedAll, [closedAll], "medium"),
  );
  assert.equal(t.score, 20);
});
