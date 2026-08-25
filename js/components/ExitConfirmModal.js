// ═══════════════════════════════════════════════════════════════════════
// js/components/ExitConfirmModal.js — ゲーム終了確認モーダル
//   依存: React（vendor script）。Source of Truthには依存しない、純粋な表示コンポーネント。
//   読み込み順: hooks/useSound.js の後、app-main.js の直前（index.html参照）
// ═══════════════════════════════════════════════════════════════════════

const ExitConfirmModal = ({ playSound, onCancel, onConfirm }) =>
  React.createElement(
    "div",
    {
      className:
        "fixed inset-0 z-50 bg-black/95 backdrop-blur-lg flex items-center justify-center p-4",
    },
    React.createElement(
      "div",
      {
        className: "setup-card max-w-sm w-full p-6 rounded-2xl space-y-4",
      },
      React.createElement(
        "div",
        { className: "text-center space-y-2" },
        React.createElement("span", { className: "text-3xl block" }, "🚨"),
        React.createElement(
          "h3",
          {
            className:
              "text-xs font-black tracking-widest text-rose-500 uppercase",
          },
          "ゲームを終了",
        ),
        React.createElement(
          "p",
          { className: "text-[11px] text-zinc-400 leading-relaxed" },
          "現在のゲームを終了してメニューに戻りますか？",
          React.createElement("br", null),
          React.createElement(
            "span",
            { className: "text-rose-500/80 font-bold" },
            "ターン履歴は消去されます。",
          ),
        ),
      ),
      React.createElement(
        "div",
        { className: "grid grid-cols-2 gap-3" },
        React.createElement(
          "button",
          {
            onClick: () => {
              playSound("revert");
              onCancel();
            },
            className:
              "py-3 bg-zinc-900 border border-zinc-700/60 text-zinc-400 text-xs font-bold rounded-xl cursor-pointer",
          },
          "キャンセル",
        ),
        React.createElement(
          "button",
          {
            onClick: onConfirm,
            className:
              "py-3 bg-rose-600 border border-rose-500 text-white text-xs font-black rounded-xl cursor-pointer",
          },
          "終了する",
        ),
      ),
    ),
  );
