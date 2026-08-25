// ═══════════════════════════════════════════════════════════════════════
// js/components/StatsModal.js — 通算成績モーダル
//   依存: React（vendor script）、constants.jsのSTATS_STORAGE_KEY、
//   scoring.jsのsummarizePlayerStats（どちらも共有レキシカルスコープ経由で参照）。
//   Source of Truth（players/activePlayerIndex等）には依存しない。
//   読み込み順: hooks/useSound.js の後、app-main.js の直前（index.html参照）
//
//   app-main.jsからの抽出方針（STATE_MANAGEMENT.md「app-main.js分割」参照）:
//   このPhaseでは「データ取得ロジックをさらに別Hookへ分離する」ところまではやらない。
//   localStorage読み込み・summarizePlayerStats呼び出しは元のままこのコンポーネント内に
//   残し、「app-main.jsからJSXを外に出す」という責務分離だけを行っている。
// ═══════════════════════════════════════════════════════════════════════

const StatsModal = ({
  playSound,
  showStatsResetConfirm,
  onClose,
  onRequestReset,
  onCancelReset,
  onConfirmReset,
}) => {
  let records = [];
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) records = parsed;
  } catch (e) {
    // 壊れたデータは無視して空扱いにする(統計表示の失敗でアプリ全体を壊さない)
  }
  const summary = summarizePlayerStats(records);
  const recentGames = [...records].sort((a, b) => b.ts - a.ts).slice(0, 15);
  const fmtPct = (v) => (v === null ? "―" : `${Math.round(v * 100)}%`);
  const fmtNum = (v, digits = 1) => (v === null ? "―" : v.toFixed(digits));
  const gameModeLabel = { "01": "01", cricket: "クリケット", countup: "カウントアップ" };

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
          "📊 通算成績",
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

      records.length === 0
        ? React.createElement(
            "p",
            { className: "text-[11px] text-zinc-500 text-center py-6" },
            "まだ記録がありません。ゲームを1試合終えると、ここに成績が表示されます。",
          )
        : React.createElement(
            React.Fragment,
            null,
            // ── プレイヤーごとの集計 ──
            React.createElement(
              "div",
              { className: "space-y-2" },
              summary.map((s) =>
                React.createElement(
                  "div",
                  {
                    key: s.playerKey,
                    className:
                      "bg-zinc-900/60 rounded-xl p-3 border border-zinc-800/60 space-y-1.5",
                  },
                  React.createElement(
                    "div",
                    { className: "flex items-baseline justify-between" },
                    React.createElement(
                      "p",
                      { className: "text-[12px] font-black text-white" },
                      s.playerName,
                    ),
                    React.createElement(
                      "p",
                      { className: "text-[9px] text-zinc-500 font-mono" },
                      `${s.gamesPlayed}試合 (${s.wins}勝${s.losses}敗${s.draws > 0 ? `${s.draws}分` : ""})`,
                    ),
                  ),
                  React.createElement(
                    "div",
                    {
                      className:
                        "grid grid-cols-3 gap-2 text-center pt-1 border-t border-zinc-800/60",
                    },
                    React.createElement(
                      "div",
                      null,
                      React.createElement(
                        "p",
                        { className: "text-[13px] font-black text-amber-300" },
                        fmtPct(s.winRate),
                      ),
                      React.createElement(
                        "p",
                        { className: "text-[8px] text-zinc-600 tracking-wide" },
                        "勝率",
                      ),
                    ),
                    s.o1Games > 0 &&
                      React.createElement(
                        "div",
                        null,
                        React.createElement(
                          "p",
                          { className: "text-[13px] font-black text-emerald-300" },
                          fmtNum(s.o1AvgPpd, 1),
                        ),
                        React.createElement(
                          "p",
                          { className: "text-[8px] text-zinc-600 tracking-wide" },
                          "平均PPD(01)",
                        ),
                      ),
                    s.o1Games > 0 &&
                      React.createElement(
                        "div",
                        null,
                        React.createElement(
                          "p",
                          { className: "text-[13px] font-black text-sky-300" },
                          fmtPct(s.o1CheckoutRate),
                        ),
                        React.createElement(
                          "p",
                          { className: "text-[8px] text-zinc-600 tracking-wide" },
                          "上がり率",
                        ),
                      ),
                    s.cricketGames > 0 &&
                      React.createElement(
                        "div",
                        null,
                        React.createElement(
                          "p",
                          { className: "text-[13px] font-black text-fuchsia-300" },
                          fmtNum(s.cricketAvgMpr, 2),
                        ),
                        React.createElement(
                          "p",
                          { className: "text-[8px] text-zinc-600 tracking-wide" },
                          "平均MPR",
                        ),
                      ),
                    s.countupGames > 0 &&
                      React.createElement(
                        "div",
                        null,
                        React.createElement(
                          "p",
                          { className: "text-[13px] font-black text-emerald-300" },
                          fmtNum(s.countupAvgPpd, 1),
                        ),
                        React.createElement(
                          "p",
                          { className: "text-[8px] text-zinc-600 tracking-wide" },
                          "平均PPD(CU)",
                        ),
                      ),
                  ),
                ),
              ),
            ),

            // ── 最近のゲーム ──
            React.createElement(
              "div",
              { className: "space-y-1.5" },
              React.createElement(
                "p",
                { className: "setup-section-label" },
                "最近のゲーム",
              ),
              React.createElement(
                "div",
                { className: "space-y-1 max-h-40 overflow-y-auto no-scrollbar" },
                recentGames.map((r, i) =>
                  React.createElement(
                    "div",
                    {
                      key: `${r.ts}-${i}`,
                      className:
                        "flex items-center justify-between text-[10px] bg-zinc-900/40 rounded-lg px-2.5 py-1.5",
                    },
                    React.createElement(
                      "span",
                      { className: "text-zinc-300 font-bold" },
                      r.playerName,
                    ),
                    React.createElement(
                      "span",
                      { className: "text-zinc-600" },
                      gameModeLabel[r.gameMode] || r.gameMode,
                    ),
                    React.createElement(
                      "span",
                      {
                        className:
                          r.win === true
                            ? "text-emerald-400 font-black"
                            : r.isDraw
                              ? "text-zinc-400 font-black"
                              : r.win === false
                                ? "text-rose-400 font-black"
                                : "text-zinc-500",
                      },
                      r.win === true
                        ? "WIN"
                        : r.isDraw
                          ? "DRAW"
                          : r.win === false
                            ? "LOSE"
                            : "―",
                    ),
                  ),
                ),
              ),
            ),

            // ── リセット ──
            React.createElement(
              "div",
              { className: "pt-1" },
              showStatsResetConfirm
                ? React.createElement(
                    "div",
                    { className: "flex gap-2" },
                    React.createElement(
                      "button",
                      {
                        onClick: () => {
                          playSound("click");
                          onCancelReset();
                        },
                        className:
                          "flex-1 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-black cursor-pointer",
                      },
                      "キャンセル",
                    ),
                    React.createElement(
                      "button",
                      {
                        onClick: () => {
                          playSound("click");
                          onConfirmReset();
                        },
                        className:
                          "flex-1 py-2 rounded-xl bg-rose-600 border border-rose-500 text-white text-[10px] font-black cursor-pointer",
                      },
                      "全部消去する",
                    ),
                  )
                : React.createElement(
                    "button",
                    {
                      onClick: () => {
                        playSound("click");
                        onRequestReset();
                      },
                      className:
                        "w-full py-2 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-zinc-600 text-[9px] font-bold cursor-pointer hover:text-rose-400 transition",
                    },
                    "統計をリセット",
                  ),
            ),
          ),
    ),
  );
};
