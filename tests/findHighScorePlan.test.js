"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadGameLogic } = require("./load-game-logic.js");

const { findHighScorePlan, scoreLeaveQuality } = loadGameLogic();

test("dartsLeft===1で、Bull(S-Bull/D-Bull)経由が最良のリーブになるケースでは実際に選ばれる", () => {
  // score=90, dartsLeft=1: D-Bull(50)を刺せば残り40(D20で1投フィニッシュ可能な最優先リーブ)。
  // 旧shots(T15-20/S19-20のみ)にはBullが無かったため、このルートは原理的に選べなかった。
  assert.equal(findHighScorePlan(90, 1, "separate", "double"), "D-Bull → 40");
});

test("dartsLeft===1では全ナンバー(S/D/T)+Bullが候補になり、旧来のT15-20/S19-20限定より広い範囲を探索する", () => {
  // 旧実装ではshotsがT15-T20とS19/S20の8種類固定だったため、score=83のような
  // 「T17で残り32」のような、T15-20以外の主要トリプルを使うと良いケースをそもそも
  // 候補にできなかった(83-51=32は好リーブ)。
  const plan = findHighScorePlan(83, 1, "separate", "double");
  assert.equal(plan, "T17 → 32");
});

test("findHighScorePlanが返すルートの各ショットは、スコアを正しく減算できている", () => {
  const plan = findHighScorePlan(301, 3, "separate", "double");
  assert.match(plan, /^.+ → \d+$/);
  const [routePart, remainingPart] = plan.split(" → ");
  const remaining = Number(remainingPart);
  const shots = routePart.split("-");
  const ptsOf = (label) => {
    if (label === "D-Bull") return 50;
    if (label === "S-Bull") return 25;
    const m = label.match(/^([SDT])(\d+)$/);
    const mult = { S: 1, D: 2, T: 3 }[m[1]];
    return mult * Number(m[2]);
  };
  const total = shots.reduce((sum, s) => sum + ptsOf(s), 0);
  assert.equal(301 - total, remaining);
});

test("dartsLeft<=0はnullを返す(そもそも投げるダーツがない)", () => {
  assert.equal(findHighScorePlan(100, 0, "separate", "double"), null);
});

test("findCheckoutRouteはメモ化されているが、outMode/checkoutPrefが違えば別結果になる(キャッシュキーの取り違えがない)", () => {
  const { findCheckoutRoute } = loadGameLogic();
  // checkoutPref="single"を明示することで、Single Outでは実際にS20が選ばれることを確認
  const singlePref = findCheckoutRoute(20, 1, "separate", "single", "single");
  const doublePref = findCheckoutRoute(20, 1, "separate", "double", "double");
  assert.equal(singlePref.route, "S20", "checkoutPref=singleならS20が優先される");
  assert.equal(doublePref.route, "D10", "checkoutPref=double(デフォルト)ならD10が優先される");
});

test("scoreLeaveQuality: 50はD-Bullで1投フィニッシュ可能なので高評価", () => {
  const s50 = scoreLeaveQuality(50, "separate", "double");
  const s83 = scoreLeaveQuality(83, "separate", "double"); // チェックアウト不可帯
  assert.ok(s50 > s83);
});

