"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadGameLogic } = require("./load-game-logic.js");

const { getRoundState, findCheckoutRoute, getFinishTargets, getThrowFromCoords } =
  loadGameLogic();

// getThrowFromCoordsが実際に返す値をそのまま使う(手書きのモックにしない。
// このバグ自体が「判定側の特殊ケース処理漏れ」だったため、実際の返り値の形と
// 完全に一致させないと同種の見落としを再現できない)。
const fatOuterBullThrow = () => getThrowFromCoords(15, 0, "fat"); // r=15 → outer bull, fat設定
const separateOuterBullThrow = () => getThrowFromCoords(15, 0, "separate"); // r=15 → outer bull, separate設定
const dBullThrow = () => getThrowFromCoords(0, 0, "fat"); // r=0 → inner bull(D-Bull)、bullType問わず同じ

test("前提確認: fatモードの外側ブルは50点・multiplier=1・label='Bull(50)'として返る", () => {
  const t = fatOuterBullThrow();
  assert.equal(t.score, 50);
  assert.equal(t.multiplier, 1);
  assert.equal(t.label, "Bull(50)");
  assert.equal(t.isBull, true);
  assert.equal(t.bullRing, "outer", "構造化フィールドbullRingも正しく返る");
});

test("設計確認: getRoundStateの判定はlabel文字列ではなくisBull/scoreの構造化データに依存している", () => {
  // labelだけを書き換えたThrowオブジェクトでも、isBull/scoreが正しければ同じ判定結果になるはず。
  // これが崩れる(=labelを見て判定している)と、将来UIの表示文言を変えただけで
  // 採点ロジックが壊れる。
  const relabeled = { ...fatOuterBullThrow(), label: "OUTER BULL 50" };
  const r = getRoundState(50, [relabeled], "double");
  assert.equal(r.isFinished, true, "labelを変えてもisBull/score=50から正しくfinish判定される");
});

test("バグ修正確認: fat(50/50)設定 + Double Out で、外側ブルを踏んで残り50→0はBUSTにならずfinish", () => {
  const t = fatOuterBullThrow();
  const r = getRoundState(50, [t], "double");
  assert.equal(r.isBust, false, "外側ブル(50点)はDouble Outでも有効なフィニッシュのはず");
  assert.equal(r.isFinished, true);
});

test("fat設定 + Master Out でも外側ブルは引き続き有効(既存挙動の維持確認)", () => {
  const t = fatOuterBullThrow();
  const r = getRoundState(50, [t], "master");
  assert.equal(r.isFinished, true);
});

test("fat設定 + Single Out でも外側ブルは有効(既存挙動の維持確認)", () => {
  const t = fatOuterBullThrow();
  const r = getRoundState(50, [t], "single");
  assert.equal(r.isFinished, true);
});

test("separate設定の外側ブル(25点)は、Double Outでは引き続き無効(修正の副作用で誤って許可されていないか)", () => {
  const t = separateOuterBullThrow();
  assert.equal(t.score, 25);
  const r = getRoundState(25, [t], "double");
  assert.equal(r.isBust, true, "25点はDoubleではないので、separate設定ではDouble Outで上がれない");
});

test("separate設定の外側ブル(25点)は、Master Outでは有効(ブルは種類を問わず有効という既存ルール)", () => {
  const t = separateOuterBullThrow();
  const r = getRoundState(25, [t], "master");
  assert.equal(r.isFinished, true);
});

test("D-Bull(中心)は bullType や outMode によらず常に有効(既存挙動の維持確認)", () => {
  ["single", "double", "master"].forEach((om) => {
    const r = getRoundState(50, [dBullThrow()], om);
    assert.equal(r.isFinished, true, `outMode=${om}でもD-Bullは常に有効`);
  });
});

test("findCheckoutRoute: fat設定 + Double Out で残り50は Bull(50) を1投フィニッシュとして提案できる", () => {
  const route = findCheckoutRoute(50, 1, "fat", "double", "double");
  // D-BullとBull(50)はどちらも有効な1投フィニッシュ。checkoutPref="double"の並び順次第で
  // どちらが優先されてもおかしくないが、少なくともnullにはならず、有効な候補が返ること、
  // かつ返されたrouteが実際にgetRoundStateでもfinishすることを確認する。
  assert.ok(route, "有効な1投フィニッシュが見つかるはず");
  assert.equal(route.inDarts, 1);
});

test("findCheckoutRoute: fat設定 + Double Out で残り50に対して返されたルートは、実際にgetRoundStateでもfinishする(assistと実判定の整合性)", () => {
  const route = findCheckoutRoute(50, 1, "fat", "double", "double");
  const throwForLabel =
    route.route === "Bull(50)" ? fatOuterBullThrow() : dBullThrow();
  const r = getRoundState(50, [throwForLabel], "double");
  assert.equal(
    r.isFinished,
    true,
    `findCheckoutRouteが提案した"${route.route}"は実際にはfinishしなかった(assistと実判定が矛盾)`,
  );
});

test("getFinishTargets: fat設定・残り50・Double Outでは inner/outer 両方のブルが光る", () => {
  const targets = getFinishTargets(50, "double", "fat");
  const rings = targets.filter((t) => t.num === 25).map((t) => t.ring);
  assert.ok(rings.includes("bullInner"));
  assert.ok(rings.includes("bullOuter"));
});

test("getFinishTargets: separate設定・残り25・Master Outでは外側ブルが光る(以前は光らなかった漏れの修正)", () => {
  const targets = getFinishTargets(25, "master", "separate");
  const hasOuterBull = targets.some(
    (t) => t.num === 25 && t.ring === "bullOuter",
  );
  assert.equal(
    hasOuterBull,
    true,
    "Master Outでは外側ブル(25点)も有効なフィニッシュなので光るべき",
  );
});

test("getFinishTargets: separate設定・残り25・Double Outでは外側ブルは光らない(25点はDoubleではないため)", () => {
  const targets = getFinishTargets(25, "double", "separate");
  const hasOuterBull = targets.some(
    (t) => t.num === 25 && t.ring === "bullOuter",
  );
  assert.equal(hasOuterBull, false);
});

test("getFinishTargets: fat設定・残り25では、そもそも外側ブルをターゲットに含めない(fatは25点にならないため)", () => {
  const targets = getFinishTargets(25, "master", "fat");
  const hasOuterBull = targets.some(
    (t) => t.num === 25 && t.ring === "bullOuter",
  );
  assert.equal(hasOuterBull, false);
});
