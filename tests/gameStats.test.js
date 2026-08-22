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

// ─────────────────────────────────────────────────────────────────────────
// summarizePlayerStats
// ─────────────────────────────────────────────────────────────────────────
const { summarizePlayerStats } = loadGameLogic();

test("summarizePlayerStats: 空配列を渡すと空配列を返す", () => {
  const r = summarizePlayerStats([]);
  assert.equal(r.length, 0);
});

test("summarizePlayerStats: 同じplayerKeyの複数試合が正しく集計される", () => {
  const records = [
    {
      playerKey: "めの",
      playerName: "めの",
      gameMode: "01",
      win: true,
      isDraw: false,
      ppd: 30,
      checkoutSuccess: true,
      mpr: null,
    },
    {
      playerKey: "めの",
      playerName: "めの",
      gameMode: "01",
      win: false,
      isDraw: false,
      ppd: 20,
      checkoutSuccess: false,
      mpr: null,
    },
  ];
  const [s] = summarizePlayerStats(records);
  assert.equal(s.gamesPlayed, 2);
  assert.equal(s.wins, 1);
  assert.equal(s.losses, 1);
  assert.equal(s.winRate, 0.5);
  assert.equal(s.o1AvgPpd, 25);
  assert.equal(s.o1BestPpd, 30);
  assert.equal(s.o1CheckoutRate, 0.5);
});

test("summarizePlayerStats: playerKeyが異なれば別集計になる(表記ゆれの取り違えを防ぐ)", () => {
  const records = [
    { playerKey: "a", playerName: "A", gameMode: "01", win: true, isDraw: false, ppd: 30, checkoutSuccess: true },
    { playerKey: "b", playerName: "B", gameMode: "01", win: false, isDraw: false, ppd: 10, checkoutSuccess: false },
  ];
  const s = summarizePlayerStats(records);
  assert.equal(s.length, 2);
});

test("summarizePlayerStats: playerCount=1(solo, win=null)の試合はwins/losses/drawsに数えない", () => {
  const records = [
    { playerKey: "めの", playerName: "めの", gameMode: "countup", win: null, isDraw: false, ppd: 15 },
  ];
  const [s] = summarizePlayerStats(records);
  assert.equal(s.gamesPlayed, 1);
  assert.equal(s.wins, 0);
  assert.equal(s.losses, 0);
  assert.equal(s.winRate, null, "勝敗が一度も確定していない(soloのみ)場合はnull");
  assert.equal(s.countupAvgPpd, 15);
});

test("summarizePlayerStats: クリケットのMPRはppdと独立して集計される", () => {
  const records = [
    { playerKey: "めの", playerName: "めの", gameMode: "cricket", win: true, isDraw: false, mpr: 1.5 },
    { playerKey: "めの", playerName: "めの", gameMode: "cricket", win: false, isDraw: false, mpr: 2.5 },
  ];
  const [s] = summarizePlayerStats(records);
  assert.equal(s.cricketAvgMpr, 2);
  assert.equal(s.cricketBestMpr, 2.5);
  assert.equal(s.o1AvgPpd, null, "クリケットのみのプレイヤーはo1AvgPpdがnull");
});

test("buildGameStatsRecords: checkoutSuccessはラウンド上限勝ちでは true にならない(0に到達していないため)", () => {
  // README記載の「上がり率」定義: 0まで到達して終えたゲームだけがcheckoutSuccess=true。
  // ラウンド上限による残り点数比較の勝利は、0に到達していない限りfalseのまま。
  const roundLimitWinner = makePlayer({
    name: "A",
    initialScore: 501,
    remainingScore: 40, // 0には到達していないが、相手より少ないので勝者
    history: [{ throws: [{}, {}, {}] }],
  });
  const winner = { name: "A", isDraw: false, o1RoundResult: true };
  const [rec] = buildGameStatsRecords([roundLimitWinner], 1, winner, "01", "double");
  assert.equal(rec.checkoutSuccess, false, "0に到達していないのでcheckoutSuccessはfalse");
});

