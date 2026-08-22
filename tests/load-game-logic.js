// ═══════════════════════════════════════════════════════════════════════
// load-game-logic.js — テストから実ゲームロジックを読み込むローダー
//
// このプロジェクトは非モジュールscript（constants.js → checkout.js → scoring.js
// → cpu.js → ui-components.js → app-main.js の順でグローバルスコープにconstが
// 積み上がっていく設計）。ブラウザではscriptタグを並べるだけで動くが、Node上の
// テストでも「実際に配布されるファイルをそのまま」動かして検証したいので、
// vm.Script + 共有Contextで同じ積み上げを再現する。
//
// ロジックをテスト用に書き写す/コピーすることは絶対にしない
// （書き写した瞬間、テストは「実装と一致しているか」ではなく「書き写しが正しいか」
//   しか検証しなくなり、リグレッション検知の意味が薄れるため）。
// ═══════════════════════════════════════════════════════════════════════
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const JS_DIR = path.join(__dirname, "..", "js");

// テスト対象は「純粋なゲームロジック」のみ。cpu.js/ui-components.js/app-main.js は
// React・DOM・requestAnimationFrame等ブラウザ環境に依存するため対象外
// （UIロジックはこのローダーの対象外。将来DOM依存を切り離せたら追加できる）。
const LOGIC_FILES = ["constants.js", "checkout.js", "scoring.js"];

function loadGameLogic() {
  const sandbox = {
    console,
    window: { structuredClone: globalThis.structuredClone },
    structuredClone: globalThis.structuredClone,
    Math,
  };
  const context = vm.createContext(sandbox);

  for (const file of LOGIC_FILES) {
    const filePath = path.join(JS_DIR, file);
    const code = fs.readFileSync(filePath, "utf8");
    const script = new vm.Script(code, { filename: filePath });
    script.runInContext(context);
  }

  // 個々の const 宣言はcontextのグローバルレキシカル環境に積まれるだけで
  // sandboxオブジェクトのプロパティにはならないため、最後に一括で取り出す。
  const exportNames = [
    "WEDGES",
    "getThrowFromCoords",
    "getRoundState",
    "normalizeOutMode",
    "getSubtotal",
    "getCricketTarget",
    "applyCricketDart",
    "getCricketRoundState",
    "getHitSoundType",
    "findCheckoutRoute",
    "findHighScorePlan",
    "scoreLeaveQuality",
    "getSteelDartsArrangement",
    "CRICKET_TARGETS",
  ];
  const grabber = exportNames
    .map((n) => `__exports__.${n} = typeof ${n} !== "undefined" ? ${n} : undefined;`)
    .join("\n");
  sandbox.__exports__ = {};
  new vm.Script(grabber).runInContext(context);
  return sandbox.__exports__;
}

module.exports = { loadGameLogic };
