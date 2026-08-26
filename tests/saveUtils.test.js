"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadGameLogic } = require("./load-game-logic.js");

const { makePlayer, sanitizeRestoredPlayer, migrateSaveData, CURRENT_SAVE_VERSION } =
  loadGameLogic();

// ─────────────────────────────────────────────────────────────────────────
// makePlayer
// ─────────────────────────────────────────────────────────────────────────

test("makePlayer: 01用の基本形(ハンデなし)", () => {
  const p = makePlayer("p1", "めの", 501);
  assert.equal(p.id, "p1");
  assert.equal(p.name, "めの");
  assert.equal(p.initialScore, 501);
  assert.equal(p.remainingScore, 501);
  assert.equal(p.accumulatedScore, 0);
  assert.equal(p.cricketScore, 0);
  assert.equal(p.cricketHandicap, 0);
  assert.equal(p.history.length, 0);
});

test("makePlayer: クリケットのハンデ(marks/handicapCount)を渡すとそのまま反映される", () => {
  const marks = { 20: 2, 19: 1, 18: 0, 17: 0, 16: 0, 15: 0, 25: 0 };
  const p = makePlayer("p2", "対戦相手", 0, marks, 3, 0);
  assert.equal(JSON.stringify(p.cricketMarks), JSON.stringify(marks));
  assert.equal(p.cricketHandicap, 3);
});

test("makePlayer: DL2オートハンデのボーナス得点(initialCricketScore)が反映される", () => {
  const p = makePlayer("p1", "めの", 0, null, 0, 15);
  assert.equal(p.cricketScore, 15);
});

test("makePlayer: handicapMarksを渡さない場合は空のクリケットマークが生成される", () => {
  const p = makePlayer("p1", "めの", 501);
  assert.deepEqual(Object.values(p.cricketMarks), [0, 0, 0, 0, 0, 0, 0]);
});

// ─────────────────────────────────────────────────────────────────────────
// sanitizeRestoredPlayer
// ─────────────────────────────────────────────────────────────────────────

test("sanitizeRestoredPlayer: 正常なデータはそのまま復元される", () => {
  const original = makePlayer("p1", "めの", 301, null, 0, 0);
  original.remainingScore = 120;
  original.history = [{ throws: [] }];
  const restored = sanitizeRestoredPlayer(original, "p1", "PLAYER 1");
  assert.equal(restored.name, "めの");
  assert.equal(restored.remainingScore, 120);
  assert.equal(restored.history.length, 1);
});

test("sanitizeRestoredPlayer: nullやオブジェクトでない値はデフォルトプレイヤーになる", () => {
  const restored1 = sanitizeRestoredPlayer(null, "p1", "FALLBACK");
  assert.equal(restored1.name, "FALLBACK");
  assert.equal(restored1.initialScore, 501);

  const restored2 = sanitizeRestoredPlayer("broken", "p2", "FALLBACK2");
  assert.equal(restored2.name, "FALLBACK2");
});

test("sanitizeRestoredPlayer: 欠損フィールドはデフォルト値で補完される", () => {
  const partial = { name: "めの" }; // initialScore等が全部欠けている
  const restored = sanitizeRestoredPlayer(partial, "p1", "FALLBACK");
  assert.equal(restored.name, "めの");
  assert.equal(restored.initialScore, 501, "initialScoreの欠損は501");
  assert.equal(restored.remainingScore, 501, "remainingScoreの欠損はinitialScoreと同じ値");
  assert.equal(restored.accumulatedScore, 0);
  assert.equal(restored.cricketScore, 0);
  assert.equal(restored.cricketHandicap, 0);
  assert.equal(restored.history.length, 0);
  assert.deepEqual(Object.values(restored.cricketMarks), [0, 0, 0, 0, 0, 0, 0]);
});

test("sanitizeRestoredPlayer: 不正値(文字列・NaN等)は安全なデフォルトに置き換わる", () => {
  const broken = {
    id: 123, // 数値(不正、本来は文字列)
    name: 456, // 数値(不正、本来は文字列)
    initialScore: "not a number",
    remainingScore: NaN,
    accumulatedScore: Infinity, // Number.isFiniteはfalseを返す
    history: "not an array",
  };
  const restored = sanitizeRestoredPlayer(broken, "p1", "FALLBACK");
  assert.equal(restored.id, "p1", "不正なidはフォールバック");
  assert.equal(restored.name, "FALLBACK", "不正なnameはフォールバック");
  assert.equal(restored.initialScore, 501);
  assert.equal(restored.remainingScore, 501);
  assert.equal(restored.accumulatedScore, 0);
  assert.equal(restored.history.length, 0);
});

test("sanitizeRestoredPlayer: cricketMarksが部分的にある場合、欠けている番号だけ0で補完される", () => {
  const partial = {
    initialScore: 0,
    cricketMarks: { 20: 3, 19: 2 }, // 18/17/16/15/25が欠けている
  };
  const restored = sanitizeRestoredPlayer(partial, "p1", "FALLBACK");
  assert.equal(restored.cricketMarks[20], 3);
  assert.equal(restored.cricketMarks[19], 2);
  assert.equal(restored.cricketMarks[18], 0);
  assert.equal(restored.cricketMarks[25], 0);
});

test("sanitizeRestoredPlayer: cricketMarksが不正な型の場合は空のマークにフォールバックする", () => {
  const broken = { initialScore: 0, cricketMarks: "invalid" };
  const restored = sanitizeRestoredPlayer(broken, "p1", "FALLBACK");
  assert.deepEqual(Object.values(restored.cricketMarks), [0, 0, 0, 0, 0, 0, 0]);
});

// ─────────────────────────────────────────────────────────────────────────
// migrateSaveData
// ─────────────────────────────────────────────────────────────────────────

test("migrateSaveData: 現行バージョンはそのまま通す", () => {
  const save = { version: CURRENT_SAVE_VERSION, players: [] };
  const result = migrateSaveData(save);
  assert.equal(result, save);
});

test("migrateSaveData: versionが無い(旧形式)場合はv0として扱われ、そのまま通る", () => {
  const save = { players: [] }; // versionフィールド無し
  const result = migrateSaveData(save);
  assert.ok(result);
  assert.deepEqual(result.players, []);
});

test("migrateSaveData: v7→v8のリネーム(o1MaxRounds→maxRounds)が適用される", () => {
  const save = { version: 7, o1MaxRounds: 20 };
  const result = migrateSaveData(save);
  assert.equal(result.maxRounds, 20);
});

test("migrateSaveData: 既にmaxRoundsがある場合はo1MaxRoundsで上書きしない", () => {
  const save = { version: 7, o1MaxRounds: 20, maxRounds: 15 };
  const result = migrateSaveData(save);
  assert.equal(result.maxRounds, 15, "既存のmaxRoundsを優先");
});

test("migrateSaveData: アプリより新しい未来バージョンは復元を拒否してnullを返す", () => {
  const save = { version: CURRENT_SAVE_VERSION + 1, players: [] };
  const result = migrateSaveData(save);
  assert.equal(result, null);
});

test("migrateSaveData: v9(現行)にはハンデ関連フィールドが無くても通る(handleRestoreSave側でフォールバックする設計のため)", () => {
  const save = { version: 9, players: [] }; // autoHandicap01等が無い
  const result = migrateSaveData(save);
  assert.ok(result);
});
