"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadGameLogic } = require("./load-game-logic.js");

const { normalizePlayerName, buildGameStatsRecords } = loadGameLogic();

test("normalizePlayerName: 前後の空白はトリムされる", () => {
  assert.equal(normalizePlayerName("  めの  "), "めの");
});

test("normalizePlayerName: 全角スペースは半角化された上で圧縮される", () => {
  assert.equal(normalizePlayerName("めの　　太郎"), "めの 太郎");
});

test("normalizePlayerName: 連続する半角スペースは1つに圧縮される", () => {
  assert.equal(normalizePlayerName("めの   太郎"), "めの 太郎");
});

test("normalizePlayerName: 全角英数字はNFKCで半角化される(表記ゆれ吸収)", () => {
  assert.equal(normalizePlayerName("Ｐ１"), "P1");
});

test("normalizePlayerName: 読み違いの異表記(ローマ字/かな/カナ)は同一視しない", () => {
  // 意図的に「同じにしない」ことを確認するテスト。誤名寄せの方が統計システムでは
  // 分離漏れより厄介なため、normalizePlayerNameはここまでは踏み込まない。
  assert.notEqual(normalizePlayerName("めの"), normalizePlayerName("メノ"));
  assert.notEqual(normalizePlayerName("めの"), normalizePlayerName("meno"));
});

test("normalizePlayerName: 文字列以外はundefinedではなく空文字を返す(呼び出し側の防御)", () => {
  assert.equal(normalizePlayerName(undefined), "");
  assert.equal(normalizePlayerName(null), "");
});

const makePlayer = (overrides) => ({
  id: "p1",
  name: "めの",
  initialScore: 501,
  remainingScore: 0,
  accumulatedScore: 0,
  cricketMarks: {},
  cricketScore: 0,
  history: [],
  ...overrides,
});

test("buildGameStatsRecords: winnerがnullなら空配列", () => {
  const players = [makePlayer({})];
  const result = buildGameStatsRecords(players, 1, null, "01", "double");
  assert.equal(result.length, 0);
});

test("buildGameStatsRecords: 01ソロプレイ(playerCount=1)はwinがnull(勝敗の概念なし)", () => {
  const players = [
    makePlayer({
      name: "めの",
      initialScore: 501,
      remainingScore: 0,
      history: [{ roundNum: 1, throws: [{}, {}, {}], roundScore: 501 }],
    }),
  ];
  const winner = { name: "めの" };
  const records = buildGameStatsRecords(players, 1, winner, "01", "double");
  assert.equal(records.length, 1);
  assert.equal(records[0].win, null);
  assert.equal(records[0].playerKey, "めの");
  assert.equal(records[0].darts, 3);
  assert.equal(records[0].checkoutSuccess, true);
  assert.equal(records[0].ppd, 501 / 3);
});

test("buildGameStatsRecords: 01の2人対戦で勝者/敗者が正しく判定される", () => {
  const winnerPlayer = makePlayer({
    name: "A",
    initialScore: 501,
    remainingScore: 0,
    history: [
      { roundNum: 1, throws: [{}, {}, {}] },
      { roundNum: 2, throws: [{}, {}, {}] },
    ],
  });
  const loserPlayer = makePlayer({
    name: "B",
    initialScore: 501,
    remainingScore: 120,
    history: [
      { roundNum: 1, throws: [{}, {}, {}] },
      { roundNum: 2, throws: [{}, {}, {}] },
    ],
  });
  const winner = { name: "A", isDraw: false };
  const records = buildGameStatsRecords(
    [winnerPlayer, loserPlayer],
    2,
    winner,
    "01",
    "double",
  );
  const recA = records.find((r) => r.playerName === "A");
  const recB = records.find((r) => r.playerName === "B");
  assert.equal(recA.win, true);
  assert.equal(recA.checkoutSuccess, true);
  assert.equal(recB.win, false);
  assert.equal(recB.checkoutSuccess, false);
  assert.equal(recB.finalScore, 120);
});

test("buildGameStatsRecords: isDrawの場合は両者win=false", () => {
  const p1 = makePlayer({ name: "A", history: [{ throws: [{}, {}, {}] }] });
  const p2 = makePlayer({ name: "B", history: [{ throws: [{}, {}, {}] }] });
  const winner = { name: "A", isDraw: true };
  const records = buildGameStatsRecords([p1, p2], 2, winner, "01", "double");
  assert.equal(
    records.every((r) => r.win === false && r.isDraw === true),
    true,
  );
});

test("buildGameStatsRecords: クリケットはMPRを計算し、PPD/checkoutSuccessはnull", () => {
  const p = makePlayer({
    name: "めの",
    cricketMarks: { 20: 3, 19: 2, 25: 1 },
    cricketScore: 15,
    history: [{ throws: [{}, {}, {}] }, { throws: [{}, {}, {}] }],
  });
  const winner = { name: "めの", isDraw: false };
  const records = buildGameStatsRecords([p], 1, winner, "cricket", null);
  assert.equal(records[0].mpr, (3 + 2 + 1) / 2);
  assert.equal(records[0].ppd, null);
  assert.equal(records[0].checkoutSuccess, null);
  assert.equal(records[0].finalScore, 15);
});

test("buildGameStatsRecords: Count-UpはaccumulatedScoreベースでPPDを計算", () => {
  const p = makePlayer({
    name: "めの",
    accumulatedScore: 320,
    history: [
      { throws: [{}, {}, {}] },
      { throws: [{}, {}, {}] },
      { throws: [{}, {}, {}] },
    ],
  });
  const winner = { name: "めの", isDraw: false };
  const records = buildGameStatsRecords([p], 1, winner, "countup", null);
  assert.equal(records[0].ppd, 320 / 9);
  assert.equal(records[0].finalScore, 320);
});

test("buildGameStatsRecords: 生のthrows配列自体はレコードに含まれない(集計値のみ保存する設計)", () => {
  const p = makePlayer({
    name: "めの",
    history: [{ throws: [{ score: 20 }, { score: 20 }, { score: 20 }] }],
  });
  const winner = { name: "めの" };
  const records = buildGameStatsRecords([p], 1, winner, "01", "double");
  assert.equal("throws" in records[0], false);
  assert.equal("history" in records[0], false);
});
