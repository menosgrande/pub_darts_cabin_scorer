"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadGameLogic } = require("./load-game-logic.js");

const { getRoundState } = loadGameLogic();

// throwsのショートハンド
const S = (score) => ({ score, multiplier: 1, label: `S${score}`, isBull: false });
const D = (score) => ({ score, multiplier: 2, label: `D${score}`, isBull: false });
const T = (score) => ({ score, multiplier: 3, label: `T${score}`, isBull: false });
const MISS = { score: 0, multiplier: 0, label: "Miss", isBull: false };
const S_BULL = { score: 25, multiplier: 1, label: "S-Bull(25)", isBull: true };
const D_BULL = { score: 50, multiplier: 1, label: "D-Bull", isBull: true };

test("Single Out: ちょうど0ならどのマルチプライヤーで上がってもfinish", () => {
  const r = getRoundState(40, [S(20), S(20)], "single");
  assert.equal(r.isFinished, true);
  assert.equal(r.isBust, false);
  assert.equal(r.remainingScore, 0);
});

test("Single Out: Singleでの上がりも許可される(ダブルアウト縛りなし)", () => {
  const r = getRoundState(20, [S(20)], "single");
  assert.equal(r.isFinished, true);
  assert.equal(r.isBust, false);
});

test("Double Out: Doubleでちょうど0ならfinish", () => {
  const r = getRoundState(40, [D(20)], "double");
  assert.equal(r.isFinished, true);
  assert.equal(r.isBust, false);
});

test("Double Out: Singleでちょうど0になってもDoubleでないのでbust", () => {
  const r = getRoundState(20, [S(20)], "double");
  assert.equal(r.isBust, true);
  assert.equal(r.isFinished, false);
});

test("Double Out: D-Bull(50点固定・multiplier=1)は特例でDouble扱いされfinish", () => {
  const r = getRoundState(50, [D_BULL], "double");
  assert.equal(r.isFinished, true);
  assert.equal(r.isBust, false);
});

test("Double Out: S-Bull(25点)はDoubleではないのでbust", () => {
  const r = getRoundState(25, [S_BULL], "double");
  assert.equal(r.isBust, true);
});

test("Double/Master Out: 残り1はどのダーツを投げる前でもbust確定", () => {
  const r1 = getRoundState(21, [S(20)], "double"); // 残り1
  assert.equal(r1.isBust, true);
  assert.equal(r1.isFinished, false);
  const r2 = getRoundState(21, [S(20)], "master");
  assert.equal(r2.isBust, true);
});

test("Single Out: 残り1になってもbustにならない(次でSingle1を狙える)", () => {
  const r = getRoundState(21, [S(20)], "single");
  assert.equal(r.isBust, false);
  assert.equal(r.isFinished, false);
  assert.equal(r.remainingScore, 1);
});

test("オーバー(残り点数を超えるスコア)は即bust", () => {
  const r = getRoundState(20, [T(20)], "single"); // 60 > 20
  assert.equal(r.isBust, true);
  assert.equal(r.remainingScore, 20, "bust時は元の残り点数に巻き戻る");
});

test("Master Out: Double/Triple/Bullのいずれでも上がれる", () => {
  assert.equal(getRoundState(40, [D(20)], "master").isFinished, true);
  assert.equal(getRoundState(60, [T(20)], "master").isFinished, true);
  assert.equal(getRoundState(50, [D_BULL], "master").isFinished, true);
  assert.equal(getRoundState(25, [S_BULL], "master").isFinished, true, "Master OutはS-Bull(25)でも上がれる(isBullHit)");
});

test("Master Out: Singleで0になったらbust", () => {
  const r = getRoundState(20, [S(20)], "master");
  assert.equal(r.isBust, true);
});

test("1投目でちょうど0になったらfinish(呼び出し元はcurrentThrowsを1本ずつ増やして毎回呼ぶ想定)", () => {
  // 実UI(app-main.js)は1本投げるごとにcurrentThrowsへ追加してgetRoundStateを呼び直し、
  // isFinished/isBustになった時点でそれ以上の入力を止める。そのため「上がった後にも
  // まだ配列に残りダーツがある」状態は実運用では発生しない。
  const r = getRoundState(40, [D(20)], "double");
  assert.equal(r.isFinished, true);
  assert.equal(r.subtotal, 40);
});

test("2本目のダーツで上がるケース(1本目はノーマルスコア)", () => {
  const r = getRoundState(60, [S(20), D(20)], "double"); // 20 + 40 = 60
  assert.equal(r.isFinished, true);
  assert.equal(r.isBust, false);
  assert.equal(r.subtotal, 60);
});

test("3投すべて外してもbust/finishでなければ通常のラウンド継続", () => {
  const r = getRoundState(100, [MISS, MISS, MISS], "double");
  assert.equal(r.isBust, false);
  assert.equal(r.isFinished, false);
  assert.equal(r.remainingScore, 100);
  assert.equal(r.subtotal, 0);
});

test("normalizeOutModeの正規化: 旧'open'は'single'として扱われる", () => {
  const r = getRoundState(20, [S(20)], "open");
  assert.equal(r.isFinished, true, "'open'は'single'相当なのでSingleで上がれる");
});
