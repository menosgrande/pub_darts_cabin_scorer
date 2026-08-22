"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadGameLogic } = require("./load-game-logic.js");

const { getCricketTarget, applyCricketDart } = loadGameLogic();

const S = (score) => ({ score, multiplier: 1, isBull: false });
const D = (score) => ({ score, multiplier: 2, isBull: false });
const T = (score) => ({ score, multiplier: 3, isBull: false });
const MISS = { score: 0, multiplier: 0, isBull: false };
const S_BULL = { score: 25, multiplier: 1, isBull: true };
const D_BULL = { score: 50, multiplier: 1, isBull: true };

test("getCricketTarget: 対象外ナンバー(15-20/Bull以外)はnull", () => {
  assert.equal(getCricketTarget(S(1)), null);
  assert.equal(getCricketTarget(D(10)), null);
});

test("getCricketTarget: MissはNull", () => {
  assert.equal(getCricketTarget(MISS), null);
});

// vm(別レルム)で生成されたオブジェクトはプロトタイプがメインレルムと異なるため、
// assert.deepEqual(=deepStrictEqual)のreference-equalチェックに引っかかる。
// 値だけを見たいのでJSON化して比較する。
const asPlain = (v) => JSON.parse(JSON.stringify(v));

test("getCricketTarget: Tripleは3マーク", () => {
  const t = getCricketTarget(T(20));
  assert.deepEqual(asPlain(t), { key: 20, marksHit: 3, value: 20 });
});

test("getCricketTarget: S-Bullは1マーク、D-Bullは2マーク、どちらもkey=25", () => {
  assert.deepEqual(asPlain(getCricketTarget(S_BULL)), { key: 25, marksHit: 1, value: 25 });
  assert.deepEqual(asPlain(getCricketTarget(D_BULL)), { key: 25, marksHit: 2, value: 25 });
});

test("applyCricketDart: 0マーク→Tripleで一気に3マーク(クローズ)、相手未クローズなら得点なし", () => {
  const r = applyCricketDart({}, 0, T(20), [{}]);
  assert.equal(r.marks[20], 3);
  assert.equal(r.pointsScored, 0, "オーバーフローがないので得点なし");
});

test("applyCricketDart: 自分3マーク済み(オープン)でヒットするとオーバーフロー分だけ得点", () => {
  const r = applyCricketDart({ 20: 3 }, 0, S(20), [{ 20: 1 }]); // 相手はまだ20を閉じていない
  assert.equal(r.marks[20], 3, "マークは3で頭打ち");
  assert.equal(r.pointsScored, 20, "オーバーフロー1本×20点");
});

test("applyCricketDart: 相手も3マーク済み(dead)ならオーバーフローしても得点0", () => {
  const r = applyCricketDart({ 20: 3 }, 0, S(20), [{ 20: 3 }]);
  assert.equal(r.pointsScored, 0);
});

test("applyCricketDart: Tripleで2マーク目から入れると1マークでクローズ+2オーバーフロー", () => {
  const r = applyCricketDart({ 20: 2 }, 0, T(20), [{ 20: 0 }]);
  assert.equal(r.marks[20], 3);
  assert.equal(r.pointsScored, 40, "3を超えた2本分 x 20点");
});

test("applyCricketDart: ソロ(相手なし)は常にscorable扱い", () => {
  const r = applyCricketDart({ 20: 3 }, 0, S(20), []);
  assert.equal(r.pointsScored, 20);
});

test("applyCricketDart: 対象外ナンバーはmarks/scoreに影響しない", () => {
  const r = applyCricketDart({ 20: 1 }, 10, S(1), [{}]);
  assert.deepEqual(asPlain(r.marks), { 20: 1 });
  assert.equal(r.score, 10);
  assert.equal(r.key, null);
});
