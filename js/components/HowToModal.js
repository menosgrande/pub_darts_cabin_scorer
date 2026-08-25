// ═══════════════════════════════════════════════════════════════════════
// js/components/HowToModal.js — 使い方(クイックヘルプ)モーダル
//   依存: React（vendor script）、ui-components.jsのIcons。Source of Truth
//   （players/activePlayerIndex等）には一切依存しない、純粋な表示コンポーネント。
//   読み込み順: hooks/useSound.js の後、app-main.js の直前（index.html参照）
//
//   app-main.jsからの抽出方針（STATE_MANAGEMENT.md「app-main.js分割」参照）:
//   再設計はせず、元のJSXをそのまま移し、外部props(helpLang/setHelpLang/
//   playSound/onClose)だけを最小限に絞った。
// ═══════════════════════════════════════════════════════════════════════

const HowToModal = ({ helpLang, setHelpLang, playSound, onClose }) => {
  const isJa = helpLang !== "en"; // デフォルト日本語
  const helpItems = isJa
    ? [
        ["1. 入力", "盤面を直接タップするか、テンキーを使います。S/D/T でシングル・ダブル・トリプルを選んでから数字をタップ。"],
        ["2. 編集", "3つのダーツスロットをタップすると上書き編集できます。UNDOで1投取り消し、CLEARでターン全消去。"],
        ["3. アレンジ (01)", "上部バーに標準チェックアウトルートが表示されます。"],
        ["4. Count-Up", "各プレイヤーが3投×Nラウンド投げて合計点を競います。"],
        ["5. CPU対戦", "設定で🤖CPUをONにすると、AIが自動で投げます。難易度は EASY〜PRO から選べます。"],
        ["6. PREV TURN", "PREV（戻る）ボタンで前のターンに戻れます。throwing中は2回押し確認、next中は1回で即戻り。"],
      ]
    : [
        ["1. Input", "Tap the board directly or use the keypad. Choose S/D/T (Single/Double/Triple) then tap the number."],
        ["2. Edit", "Tap a dart slot to overwrite. UNDO removes the last dart, CLEAR wipes the whole turn."],
        ["3. Assist (01)", "The top bar shows the standard checkout route for your remaining score."],
        ["4. Count-Up", "Players throw 3 darts × N rounds and accumulate points. Highest total wins."],
        ["5. CPU Match", "Enable 🤖 CPU in the setup to play against AI. Choose difficulty from EASY to PRO."],
        ["6. PREV TURN", "PREV button undoes the previous turn. Press twice during throwing, once after OK."],
      ];

  return React.createElement(
    "div",
    {
      className:
        "fixed inset-0 z-50 bg-black/90 backdrop-blur-md p-4 flex items-center justify-center",
    },
    React.createElement(
      "div",
      {
        className:
          "setup-card max-w-sm w-full p-5 rounded-2xl space-y-4 no-scrollbar overflow-y-auto max-h-[85vh]",
      },
      React.createElement(
        "div",
        { className: "flex justify-between items-center" },
        React.createElement(
          "h3",
          {
            className:
              "text-[10px] font-black tracking-widest text-amber-400 uppercase",
          },
          isJa ? "クイックヘルプ" : "QUICK HELP",
        ),
        React.createElement(
          "div",
          { className: "flex items-center gap-2" },
          React.createElement(
            "button",
            {
              onClick: () => {
                playSound("click");
                setHelpLang((l) => (l === "ja" ? "en" : "ja"));
              },
              className:
                "px-2 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-[9px] font-black text-zinc-400 hover:text-amber-400 cursor-pointer transition",
            },
            isJa ? "EN" : "JP",
          ),
          React.createElement(
            "button",
            {
              onClick: () => {
                playSound("revert");
                onClose();
              },
              className:
                "w-7 h-7 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white cursor-pointer",
            },
            React.createElement(Icons.X, null),
          ),
        ),
      ),
      React.createElement(
        "div",
        { className: "space-y-3" },
        helpItems.map(([title, body]) =>
          React.createElement(
            "div",
            {
              key: title,
              className:
                "bg-zinc-900/60 rounded-xl p-3 border border-zinc-800/60",
            },
            React.createElement(
              "p",
              { className: "text-[10px] font-black text-amber-300 mb-1" },
              title,
            ),
            React.createElement(
              "p",
              { className: "text-[11px] text-zinc-300 leading-relaxed" },
              body,
            ),
          ),
        ),
      ),
      React.createElement(
        "button",
        {
          onClick: () => {
            playSound("revert");
            onClose();
          },
          className:
            "w-full py-2 bg-zinc-900 border border-zinc-800 text-zinc-500 font-bold text-[10px] rounded-xl cursor-pointer hover:text-zinc-300 transition",
        },
        isJa ? "閉じる" : "CLOSE",
      ),
    ),
  );
};
