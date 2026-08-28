"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadGameLogic } = require("./load-game-logic.js");

const { computeRoundResult, makePlayer, getThrowFromCoords } = loadGameLogic();

const S = (score) => ({ score, multiplier: 1, label: `S${score}`, isBull: false });
const D = (score) => ({ score, multiplier: 2, label: `D${score}`, isBull: false });
const T = (score) => ({ score, multiplier: 3, label: `T${score}`, isBull: false });
const MISS = { score: 0, multiplier: 0, label: "Miss", isBull: false };

const opts = (extra = {}) => ({
  outMode: "double",
  playerCount: 2,
  maxRounds: null,
  cuRounds: 8,
  isLastPlayer: true,
  opponentsMarks: undefined,
  ...extra,
});

// ─────────────────────────────────────────────────────────────────────────
// 01
// ─────────────────────────────────────────────────────────────────────────

test("01: 通常得点(バーストなし)は継続扱いになる", () => {
  const players = [makePlayer("p1", "A", 501), makePlayer("p2", "B", 501)];
  const r = computeRoundResult(players, 0, "01", [S(20), S(20), S(20)], opts());
  assert.equal(r.isGameOver, false);
  assert.equal(r.winner, null);
  assert.equal(r.players[0].remainingScore, 441);
  assert.equal(r.node.roundScore, 60);
  assert.equal(r.resultType, "01-continue");
});

test("01: バーストすると残り点数が巻き戻る", () => {
  const players = [makePlayer("p1", "A", 20), makePlayer("p2", "B", 501)];
  const r = computeRoundResult(players, 0, "01", [T(20)], opts()); // 60 > 20 でバースト
  assert.equal(r.isGameOver, false);
  assert.equal(r.players[0].remainingScore, 20, "バースト時は元の残り点数のまま");
  assert.equal(r.node.isBust, true);
});

test("01: ちょうど0(Double Out成功)で即座に勝者確定", () => {
  const players = [makePlayer("p1", "A", 40), makePlayer("p2", "B", 501)];
  const r = computeRoundResult(players, 0, "01", [D(20)], opts());
  assert.equal(r.isGameOver, true);
  assert.equal(r.resultType, "01-checkout");
  assert.equal(r.winner.remainingScore, 0);
  assert.equal(r.players[0].remainingScore, 0);
});

test("01: fat(50/50)Bull + Double Outで、外側ブルを踏んで残り50→0はBUSTにならずfinishする(回帰ケース)", () => {
  // このケースは過去に「getThrowFromCoordsは正しくBull(50)を返すが、getRoundState側の
  // Double Out判定がmultiplier===2しか見ておらずBUSTしていた」という実害バグの回帰テスト。
  // computeRoundResultへの抽出後も、この整合性が維持されているかを直接確認する。
  const fatOuterBull = getThrowFromCoords(15, 0, "fat"); // r=15 → 外側ブル、50点、multiplier:1
  assert.equal(fatOuterBull.score, 50);
  assert.equal(fatOuterBull.multiplier, 1);

  const players = [makePlayer("p1", "A", 50), makePlayer("p2", "B", 501)];
  const r = computeRoundResult(players, 0, "01", [fatOuterBull], opts());
  assert.equal(r.isGameOver, true, "fat外側ブルはDouble Outでも有効なフィニッシュのはず");
  assert.equal(r.resultType, "01-checkout");
});

test("01: Master Outでチェックアウトできる(Triple/Double/Bullいずれも有効)", () => {
  const players = [makePlayer("p1", "A", 60), makePlayer("p2", "B", 501)];
  const r = computeRoundResult(players, 0, "01", [T(20)], opts({ outMode: "master" }));
  assert.equal(r.isGameOver, true);
});

test("01: ラウンド上限に達したら残り点数が少ない方が勝者(isLastPlayer=trueの時のみ)", () => {
  const p1 = makePlayer("p1", "A", 501);
  p1.remainingScore = 100;
  p1.history = Array(9).fill({}); // 9ラウンド目まで消化済み → このラウンドで10ラウンド目
  const p2 = makePlayer("p2", "B", 501);
  p2.remainingScore = 200;
  p2.history = Array(10).fill({});
  const r = computeRoundResult([p1, p2], 0, "01", [S(20)], opts({ maxRounds: 10, isLastPlayer: true }));
  assert.equal(r.isGameOver, true);
  assert.equal(r.resultType, "01-round-limit");
  assert.equal(r.winner.o1RoundResult, true);
  assert.equal(r.winner.remainingScore, 80, "p1(残り80)がp2(残り200)より少ないので勝ち");
});

test("01: isLastPlayer=falseならラウンド上限に達していてもまだゲームを終わらせない", () => {
  const p1 = makePlayer("p1", "A", 501);
  p1.remainingScore = 100;
  p1.history = Array(9).fill({});
  const p2 = makePlayer("p2", "B", 501);
  const r = computeRoundResult([p1, p2], 0, "01", [S(20)], opts({ maxRounds: 10, isLastPlayer: false }));
  assert.equal(r.isGameOver, false, "まだ最後のプレイヤーの番ではないので終わらない");
});

test("01: ラウンド上限での同点はDraw扱いになる", () => {
  const p1 = makePlayer("p1", "A", 501);
  p1.remainingScore = 170; // このラウンドでS20(-20)が適用され150になる
  p1.history = Array(9).fill({});
  const p2 = makePlayer("p2", "B", 501);
  p2.remainingScore = 150;
  p2.history = Array(10).fill({});
  const r = computeRoundResult([p1, p2], 0, "01", [S(20)], opts({ maxRounds: 10, isLastPlayer: true }));
  assert.equal(r.isGameOver, true);
  assert.equal(r.winner.isDraw, true);
});

// ─────────────────────────────────────────────────────────────────────────
// Cricket
// ─────────────────────────────────────────────────────────────────────────

test("Cricket: マーク更新のみで継続", () => {
  const players = [makePlayer("p1", "A", 0), makePlayer("p2", "B", 0)];
  const r = computeRoundResult(
    players,
    0,
    "cricket",
    [T(20)],
    opts({ opponentsMarks: [players[1].cricketMarks] }),
  );
  assert.equal(r.isGameOver, false);
  assert.equal(r.players[0].cricketMarks[20], 3);
});

test("Cricket: オーバーフローで得点が入る(相手が未クローズの場合)", () => {
  const p1 = makePlayer("p1", "A", 0);
  p1.cricketMarks[20] = 3;
  const players = [p1, makePlayer("p2", "B", 0)];
  const r = computeRoundResult(
    players,
    0,
    "cricket",
    [S(20)],
    opts({ opponentsMarks: [players[1].cricketMarks] }),
  );
  assert.equal(r.players[0].cricketScore, 20);
});

test("Cricket: 全ナンバーClose+得点上回りで勝者確定", () => {
  const p1 = makePlayer("p1", "A", 0);
  p1.cricketMarks = { 20: 3, 19: 3, 18: 3, 17: 3, 16: 3, 15: 0, 25: 3 };
  p1.cricketScore = 50;
  const p2 = makePlayer("p2", "B", 0);
  p2.cricketScore = 10;
  const players = [p1, p2];
  const r = computeRoundResult(
    players,
    0,
    "cricket",
    [T(15)],
    opts({ opponentsMarks: [p2.cricketMarks] }),
  );
  assert.equal(r.isGameOver, true);
  assert.equal(r.resultType, "cricket-closed");
});

test("Cricket: ラウンド上限で得点が高い方が勝者", () => {
  const p1 = makePlayer("p1", "A", 0);
  p1.cricketScore = 30;
  p1.history = Array(14).fill({});
  const p2 = makePlayer("p2", "B", 0);
  p2.cricketScore = 10;
  p2.history = Array(15).fill({});
  const players = [p1, p2];
  const r = computeRoundResult(
    players,
    0,
    "cricket",
    [MISS],
    opts({ maxRounds: 15, isLastPlayer: true, opponentsMarks: [p2.cricketMarks] }),
  );
  assert.equal(r.isGameOver, true);
  assert.equal(r.resultType, "cricket-round-limit");
  assert.equal(r.winner.cricketScore, 30);
});

test("Cricket: ラウンド上限での同点はDraw扱い", () => {
  const p1 = makePlayer("p1", "A", 0);
  p1.cricketScore = 20;
  p1.history = Array(14).fill({});
  const p2 = makePlayer("p2", "B", 0);
  p2.cricketScore = 20;
  p2.history = Array(15).fill({});
  const players = [p1, p2];
  const r = computeRoundResult(
    players,
    0,
    "cricket",
    [MISS],
    opts({ maxRounds: 15, isLastPlayer: true, opponentsMarks: [p2.cricketMarks] }),
  );
  assert.equal(r.winner.isDraw, true);
});

// ─────────────────────────────────────────────────────────────────────────
// Count-Up
// ─────────────────────────────────────────────────────────────────────────

test("Count-Up: 通常加算のみで継続", () => {
  const players = [makePlayer("p1", "A", 0), makePlayer("p2", "B", 0)];
  const r = computeRoundResult(players, 0, "countup", [S(20), S(20), S(20)], opts({ cuRounds: 8 }));
  assert.equal(r.isGameOver, false);
  assert.equal(r.players[0].accumulatedScore, 60);
});

test("Count-Up: 最終ラウンドで両者到達したら得点が高い方が勝者", () => {
  const p1 = makePlayer("p1", "A", 0);
  p1.accumulatedScore = 100;
  p1.history = Array(7).fill({});
  const p2 = makePlayer("p2", "B", 0);
  p2.accumulatedScore = 200;
  p2.history = Array(8).fill({});
  const players = [p1, p2];
  // activePlayerIndex=0なので、この投擲(S20)で加算されるのはp1側(100→120)。
  // p2は既に8ラウンド消化済みでスコア200のまま変わらない。
  const r = computeRoundResult(players, 0, "countup", [S(20)], opts({ cuRounds: 8 }));
  assert.equal(r.isGameOver, true);
  assert.equal(r.resultType, "countup-finished");
  assert.equal(r.winner.accumulatedScore, 200, "p2(200)がp1(120)より高いので勝者");
});

test("Count-Up: 同点はDraw扱い", () => {
  const p1 = makePlayer("p1", "A", 0);
  p1.accumulatedScore = 130; // このラウンドでS20(+20)が加算され150になる
  p1.history = Array(7).fill({});
  const p2 = makePlayer("p2", "B", 0);
  p2.accumulatedScore = 150;
  p2.history = Array(8).fill({});
  const players = [p1, p2];
  const r = computeRoundResult(players, 0, "countup", [S(20)], opts({ cuRounds: 8 }));
  assert.equal(r.isGameOver, true);
  assert.equal(r.winner.isDraw, true, "p1(130+20=150) === p2(150)");
});

test("Count-Up: プレイヤー数1(ソロ)は自分の履歴だけでラウンド完了判定する", () => {
  const p1 = makePlayer("p1", "A", 0);
  p1.accumulatedScore = 100;
  p1.history = Array(7).fill({});
  const players = [p1];
  const r = computeRoundResult(players, 0, "countup", [S(20)], opts({ playerCount: 1, cuRounds: 8 }));
  assert.equal(r.isGameOver, true);
  assert.equal(r.winner.isDraw, false);
});

test("Count-Up: 最終ラウンドに到達していなければ継続", () => {
  const p1 = makePlayer("p1", "A", 0);
  p1.history = Array(3).fill({});
  const p2 = makePlayer("p2", "B", 0);
  p2.history = Array(3).fill({});
  const players = [p1, p2];
  const r = computeRoundResult(players, 0, "countup", [S(20)], opts({ cuRounds: 8 }));
  assert.equal(r.isGameOver, false);
});
