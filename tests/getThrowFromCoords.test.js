"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadGameLogic } = require("./load-game-logic.js");

const { getThrowFromCoords, WEDGES } = loadGameLogic();

// 盤面描画側 (app-main.js の bp() 呼び出し) が使っている半径。
// getThrowFromCoords の判定半径はこれと必ず一致していなければならない
// (①「盤面の表示と判定範囲がズレている」の再発防止テスト)。
const DRAWN = {
  bullseye: 8.5,
  outerBull: 22,
  tripleInner: 90,
  tripleOuter: 112,
  singleOuterEnd: 154, // = doubleInner
  doubleOuter: 176,
};

function throwAt(deg, r, bullType = "separate") {
  const rad = (deg * Math.PI) / 180;
  const x = r * Math.cos(rad);
  const y = r * Math.sin(rad);
  return getThrowFromCoords(x, y, bullType);
}

test("20の中心角(真上, deg=-90)でSingle/Triple/Doubleが正しく判定される", () => {
  assert.equal(throwAt(-90, 50).label, "S20");
  assert.equal(throwAt(-90, DRAWN.tripleInner + 1).label, "T20");
  assert.equal(throwAt(-90, DRAWN.tripleOuter - 1).label, "T20");
  assert.equal(throwAt(-90, 130).label, "S20");
  assert.equal(throwAt(-90, DRAWN.singleOuterEnd + 1).label, "D20");
  assert.equal(throwAt(-90, DRAWN.doubleOuter - 1).label, "D20");
});

test("Triple帯の境界(90/112)は描画側の半径と完全一致する", () => {
  assert.equal(throwAt(-90, DRAWN.tripleInner).multiplier, 3, "内側境界ちょうどはTripleに含まれる");
  assert.equal(throwAt(-90, DRAWN.tripleInner - 0.01).multiplier, 1, "境界のすぐ内側はSingle");
  assert.equal(throwAt(-90, DRAWN.tripleOuter).multiplier, 3, "外側境界ちょうどはTripleに含まれる");
  assert.equal(throwAt(-90, DRAWN.tripleOuter + 0.01).multiplier, 1, "境界のすぐ外側はSingle");
});

test("Double帯の境界(154/176)は描画側の半径と完全一致する — 旧バグ(153/170)の再発防止", () => {
  assert.equal(throwAt(-90, DRAWN.singleOuterEnd).multiplier, 2, "内側境界ちょうどはDoubleに含まれる");
  assert.equal(throwAt(-90, DRAWN.singleOuterEnd - 0.01).multiplier, 1, "境界のすぐ内側はSingle");
  assert.equal(throwAt(-90, DRAWN.doubleOuter).multiplier, 2, "外側境界ちょうどはDoubleに含まれる");
  assert.equal(throwAt(-90, DRAWN.doubleOuter + 0.01).score, 0, "外側境界のすぐ外はMiss");
  // 旧バグの直接再現テスト: r=172は見た目Double帯の内側だが、旧定数(rDoubleOuter=170)ではMissだった
  const t = throwAt(-90, 172);
  assert.equal(t.multiplier, 2);
  assert.equal(t.score, 20);
});

test("ブル境界(8.5/22)", () => {
  assert.equal(throwAt(0, 0, "separate").label, "D-Bull");
  assert.equal(throwAt(0, DRAWN.bullseye, "separate").label, "D-Bull");
  assert.equal(throwAt(0, DRAWN.bullseye + 0.01, "separate").label, "S-Bull(25)");
  assert.equal(throwAt(0, DRAWN.outerBull, "separate").label, "S-Bull(25)");
  assert.equal(throwAt(0, DRAWN.outerBull + 0.01, "separate").label, "S6"); // deg=0(右方向)はWEDGES上6の区画
});

test("bullType='fat'では外側ブルも50点扱いになる", () => {
  const t = throwAt(0, 15, "fat");
  assert.equal(t.score, 50);
  assert.equal(t.label, "Bull(50)");
});

test("bullType='separate'では外側ブルは25点固定", () => {
  const t = throwAt(0, 15, "separate");
  assert.equal(t.score, 25);
  assert.equal(t.label, "S-Bull(25)");
});

test("盤外(r > 176)は常にMiss", () => {
  const t = throwAt(-90, 200);
  assert.deepEqual(
    { score: t.score, multiplier: t.multiplier, label: t.label },
    { score: 0, multiplier: 0, label: "Miss" },
  );
});

test("WEDGESの全20ナンバーが、各セグメント中心角でSingle判定される", () => {
  for (let i = 0; i < WEDGES.length; i++) {
    const deg = i * 18 - 90;
    const t = throwAt(deg, 50, "separate");
    assert.equal(t.score, WEDGES[i], `index ${i} (deg=${deg}) は ${WEDGES[i]} であるべき`);
    assert.equal(t.multiplier, 1);
  }
});

test("セグメント境界(隣接ウェッジの間, ±9度)をまたぐと隣のナンバーになる", () => {
  // WEDGES[0]=20 (中心角 -90度)。 -90+9=-81度が20/1の境界。
  const justInside20 = throwAt(-81.01, 50, "separate");
  const justInside1 = throwAt(-80.99, 50, "separate");
  assert.equal(justInside20.score, 20);
  assert.equal(justInside1.score, 1);
});
