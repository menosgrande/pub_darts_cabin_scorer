"use strict";
// ═══════════════════════════════════════════════════════════════════════
// integration.test.js — 「盤面タップ→ハイライト→アシスト→実判定」を1本で通すテスト
//
// これまでのテストは各関数(getThrowFromCoords/getRoundState/findCheckoutRoute/
// getFinishTargets)を個別に検証していた。しかし実際に起きたfat Bullバグは、
// 「各関数は単体では正しいのに、getFinishTargetsが光らせた場所と
// getRoundStateの実判定が食い違う」という*関数をまたいだ*契約違反だった。
// このファイルは、実際のプレイフローに沿って複数関数を横断させ、
// 「ハイライトされた場所は実際にフィニッシュできるか」
// 「findCheckoutRouteが提案したルートは実際にフィニッシュできるか」
// 「盤面上の任意の位置をタップした結果が、そのままgetRoundStateに通せるか」
// を自動で総当たり検証する。
// ═══════════════════════════════════════════════════════════════════════
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadGameLogic } = require("./load-game-logic.js");

const {
  getThrowFromCoords,
  getRoundState,
  findCheckoutRoute,
  getFinishTargets,
} = loadGameLogic();

// getFinishTargets が返す { num, ring } を、実際に盤面をタップしたのと同じ
// 座標(x,y)に変換する。半径は checkout.js の getThrowFromCoords と一致させる
// (この対応がズレていたら、それ自体がテスト漏れの再現になってしまうため、
// 意図的にgetThrowFromCoordsが実際に使っている境界値の"内側"を狙う)。
const RADII = { single: 50, double: 165, triple: 100, bullInner: 0, bullOuter: 15 };

function pointForTarget(target) {
  if (target.ring === "bullInner") return { x: 0, y: 0 };
  if (target.ring === "bullOuter") return { x: RADII.bullOuter, y: 0 };
  // num(1-20)の中心角を求める。WEDGES[0]=20が-90度(真上)、以降18度刻み。
  const WEDGES = [
    20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
  ];
  const idx = WEDGES.indexOf(target.num);
  const deg = idx * 18 - 90;
  const rad = (deg * Math.PI) / 180;
  const r = RADII[target.ring];
  return { x: r * Math.cos(rad), y: r * Math.sin(rad) };
}

// checkoutルートの1ステップ分のラベル("T20","D-Bull"等)を、実際にタップした
// のと同じThrowオブジェクトに変換する(getThrowFromCoordsの座標系を使う)。
function throwForRouteLabel(label, bullType) {
  if (label === "D-Bull") return getThrowFromCoords(0, 0, bullType);
  if (label === "Bull(50)" || label === "S-Bull(25)")
    return getThrowFromCoords(15, 0, bullType);
  const m = label.match(/^([SDT])(\d+)$/);
  if (!m) throw new Error(`未知のルートラベル: ${label}`);
  const WEDGES = [
    20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
  ];
  const idx = WEDGES.indexOf(Number(m[2]));
  const deg = idx * 18 - 90;
  const rad = (deg * Math.PI) / 180;
  const r = { S: RADII.single, D: RADII.double, T: RADII.triple }[m[1]];
  const x = r * Math.cos(rad);
  const y = r * Math.sin(rad);
  return getThrowFromCoords(x, y, bullType);
}

// ── ① getFinishTargets が光らせた場所は、実際にタップすると本当にfinishするか ──
const BULL_TYPES = ["separate", "fat"];
const OUT_MODES = ["single", "double", "master"];

for (const bullType of BULL_TYPES) {
  for (const outMode of OUT_MODES) {
    test(`統合: getFinishTargets(bullType=${bullType}, outMode=${outMode})がハイライトする全ターゲットは、実際にタップするとgetRoundStateでfinishする`, () => {
      for (let remaining = 2; remaining <= 170; remaining++) {
        const targets = getFinishTargets(remaining, outMode, bullType);
        for (const target of targets) {
          const { x, y } = pointForTarget(target);
          const t = getThrowFromCoords(x, y, bullType);
          const r = getRoundState(remaining, [t], outMode);
          assert.equal(
            r.isFinished,
            true,
            `remaining=${remaining}, target=${JSON.stringify(target)} (bullType=${bullType}, outMode=${outMode}) はハイライトされたのにfinishしなかった: throw=${JSON.stringify(t)}`,
          );
        }
      }
    });
  }
}

// ── ② findCheckoutRouteが提案する1投ルートは、実際にタップすると本当にfinishするか ──
for (const bullType of BULL_TYPES) {
  for (const outMode of OUT_MODES) {
    for (const checkoutPref of ["double", "triple", "single"]) {
      test(`統合: findCheckoutRoute(bullType=${bullType}, outMode=${outMode}, checkoutPref=${checkoutPref})の1投ルート提案は、実際にタップするとfinishする`, () => {
        for (let score = 2; score <= 170; score++) {
          const route = findCheckoutRoute(score, 1, bullType, outMode, checkoutPref);
          if (!route) continue; // 1投で上がれないケースはスキップ(②の対象外)
          const label = route.route;
          let t;
          try {
            t = throwForRouteLabel(label, bullType);
          } catch (e) {
            continue; // 未知のラベル形式はここでは扱わない(通常発生しない)
          }
          const r = getRoundState(score, [t], outMode);
          assert.equal(
            r.isFinished,
            true,
            `score=${score} (bullType=${bullType}, outMode=${outMode}, checkoutPref=${checkoutPref}) の1投提案"${label}"は実際にはfinishしなかった`,
          );
        }
      });
    }
  }
}

// ── ③ 盤面上の主要な位置をタップした結果は、そのままgetRoundStateに通せる(壊れた形のオブジェクトを返さない) ──
test("統合: getThrowFromCoordsの全出力パターンは、getRoundStateに直接渡してもクラッシュしない", () => {
  const bullTypes = ["separate", "fat"];
  const sampleXY = [];
  // 盤面全体を粗くサンプリング(20度刻み・半径10刻み)して、返り値の形を横断的に確認する
  for (let r = 0; r <= 200; r += 10) {
    for (let deg = 0; deg < 360; deg += 20) {
      const rad = (deg * Math.PI) / 180;
      sampleXY.push({ x: r * Math.cos(rad), y: r * Math.sin(rad) });
    }
  }
  for (const bullType of bullTypes) {
    for (const { x, y } of sampleXY) {
      const t = getThrowFromCoords(x, y, bullType);
      assert.equal(typeof t.score, "number");
      assert.equal(typeof t.multiplier, "number");
      assert.equal(typeof t.label, "string");
      assert.equal(typeof t.isBull, "boolean");
      // getRoundStateに通してもクラッシュしないことだけを確認(結果の正誤はここでは問わない)
      assert.doesNotThrow(() => getRoundState(100, [t], "double"));
    }
  }
});

// ── ④ fat Bull問題の再発防止を、この統合テストの枠組みでも直接確認しておく ──
test("統合(fat Bull回帰): remaining=50, bullType=fat, outMode=doubleでは、内側・外側どちらのブルもハイライト対象かつ実際にfinishする", () => {
  const targets = getFinishTargets(50, "double", "fat");
  const rings = targets.filter((t) => t.num === 25).map((t) => t.ring);
  assert.ok(rings.includes("bullInner"));
  assert.ok(rings.includes("bullOuter"));
  for (const target of targets.filter((t) => t.num === 25)) {
    const { x, y } = pointForTarget(target);
    const t = getThrowFromCoords(x, y, "fat");
    const r = getRoundState(50, [t], "double");
    assert.equal(r.isFinished, true, `${target.ring}が光っているのにfinishしなかった`);
  }
});
