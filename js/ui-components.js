// ═══════════════════════════════════════════════════════════════════════
// ui-components.js — App()から使われる共有UIコンポーネント（Icons/Fliqlo時計/スコアボード）
// 依存: React（vendor script）
// ═══════════════════════════════════════════════════════════════════════
  const Icons = {
  // ═══════════════════════════════════════════════════════════════════════
  // ◆ SECTION: React Component — Shared UI Pieces
  // App()本体から使われる共有コンポーネント・アイコン群。Icons(SVGアイコン定義) / FliqloDigit・FliqloScoreboard(フリップ時計) /
  // PlayerCockpit(プレイヤースコアボード)。ロジックには依存しない純粋な表示コンポーネント。
  // ═══════════════════════════════════════════════════════════════════════
    Volume2: () =>
      React.createElement(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          width: "13",
          height: "13",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "2.5",
          strokeLinecap: "round",
          strokeLinejoin: "round",
        },
        React.createElement("polygon", {
          points: "11 5 6 9 2 9 2 15 6 15 11 19 11 5",
        }),
        React.createElement("path", { d: "M15.54 8.46a5 5 0 0 1 0 7.07" }),
        React.createElement("path", { d: "M19.07 4.93a10 10 0 0 1 0 14.14" }),
      ),
    VolumeX: () =>
      React.createElement(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          width: "13",
          height: "13",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "2.5",
          strokeLinecap: "round",
          strokeLinejoin: "round",
        },
        React.createElement("polygon", {
          points: "11 5 6 9 2 9 2 15 6 15 11 19 11 5",
        }),
        React.createElement("line", { x1: "22", y1: "9", x2: "16", y2: "15" }),
        React.createElement("line", { x1: "16", y1: "9", x2: "22", y2: "15" }),
      ),
    HelpCircle: () =>
      React.createElement(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          width: "12",
          height: "12",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "2.5",
          strokeLinecap: "round",
          strokeLinejoin: "round",
        },
        React.createElement("circle", { cx: "12", cy: "12", r: "10" }),
        React.createElement("path", {
          d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3",
        }),
        React.createElement("line", {
          x1: "12",
          y1: "17",
          x2: "12.01",
          y2: "17",
        }),
      ),
    Settings: () =>
      React.createElement(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          width: "12",
          height: "12",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "2.5",
          strokeLinecap: "round",
          strokeLinejoin: "round",
        },
        React.createElement("circle", { cx: "12", cy: "12", r: "3" }),
        React.createElement("path", {
          d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
        }),
      ),
    Undo2: () =>
      React.createElement(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "3",
          strokeLinecap: "round",
          strokeLinejoin: "round",
        },
        React.createElement("path", { d: "M3 7v6h6" }),
        React.createElement("path", {
          d: "M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13",
        }),
      ),
    Trash2: () =>
      React.createElement(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "3",
          strokeLinecap: "round",
          strokeLinejoin: "round",
        },
        React.createElement("polyline", { points: "3 6 5 6 21 6" }),
        React.createElement("path", {
          d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
        }),
        React.createElement("line", { x1: "10", y1: "11", x2: "10", y2: "17" }),
        React.createElement("line", { x1: "14", y1: "11", x2: "14", y2: "17" }),
      ),
    X: () =>
      React.createElement(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          width: "13",
          height: "13",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "2.5",
          strokeLinecap: "round",
          strokeLinejoin: "round",
        },
        React.createElement("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
        React.createElement("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
      ),
    RotateCcw: () =>
      React.createElement(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "3",
          strokeLinecap: "round",
          strokeLinejoin: "round",
        },
        React.createElement("path", {
          d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",
        }),
        React.createElement("polyline", { points: "3 3 3 8 8 8" }),
      ),
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Fliqlo Flip Clock
  // ─────────────────────────────────────────────────────────────────────────
  const FliqloDigit = ({ value, isActive, isBust }) => {
    const [currentVal, setCurrentVal] = useState(value);
    const [nextVal, setNextVal] = useState(value);
    const [isFlipping, setIsFlipping] = useState(false);
    const timerRef = useRef(null);
    useEffect(() => {
      if (value === currentVal) return;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        setIsFlipping(false);
      }
      setNextVal(value);
      setIsFlipping(true);
      timerRef.current = setTimeout(() => {
        setCurrentVal(value);
        setIsFlipping(false);
        timerRef.current = null;
      }, 320);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }, [value]);
    const dc = currentVal === "\xA0" ? "" : currentVal;
    const dn = nextVal === "\xA0" ? "" : nextVal;
    const activeClass = isActive
      ? "ring-2 ring-amber-500/50 shadow-[0_0_25px_rgba(245,158,11,0.2)]"
      : "opacity-75";
    const textClass = `font-fliqlo font-black fliqlo-text leading-none tracking-tighter ${isBust ? "text-rose-500" : "text-neutral-100"}`;
    return React.createElement(
      "div",
      {
        className: `relative fliqlo-tile flip-container select-none rounded-xl transition-all duration-300 ${activeClass}`,
      },
      React.createElement("div", { className: "hinge-left" }),
      React.createElement("div", { className: "hinge-right" }),
      React.createElement(
        "div",
        { className: "card-half card-top-bg fliqlo-card" },
        React.createElement(
          "div",
          { className: `card-half-inner card-top-inner ${textClass}` },
          dn,
        ),
      ),
      React.createElement(
        "div",
        { className: "card-half card-bottom-bg fliqlo-card" },
        React.createElement(
          "div",
          { className: `card-half-inner card-bottom-inner ${textClass}` },
          dc,
        ),
      ),
      isFlipping
        ? React.createElement(
            React.Fragment,
            null,
            React.createElement(
              "div",
              { className: "card-half card-top-flip fliqlo-card" },
              React.createElement(
                "div",
                { className: `card-half-inner card-top-inner ${textClass}` },
                dc,
              ),
            ),
            React.createElement(
              "div",
              { className: "card-half card-bottom-flip fliqlo-card" },
              React.createElement(
                "div",
                { className: `card-half-inner card-bottom-inner ${textClass}` },
                dn,
              ),
            ),
          )
        : React.createElement(
            React.Fragment,
            null,
            React.createElement(
              "div",
              {
                className: "card-half card-top-bg fliqlo-card",
                style: { zIndex: 20 },
              },
              React.createElement(
                "div",
                { className: `card-half-inner card-top-inner ${textClass}` },
                dc,
              ),
            ),
            React.createElement(
              "div",
              {
                className: "card-half card-bottom-bg fliqlo-card",
                style: { zIndex: 20 },
              },
              React.createElement(
                "div",
                { className: `card-half-inner card-bottom-inner ${textClass}` },
                dc,
              ),
            ),
          ),
    );
  };

  const FliqloScoreboard = ({ score, isActive, isBust }) => {
    const s = String(score)
      .padStart(3, " ")
      .split("")
      .map((d) => (d === " " ? "\xA0" : d));
    return React.createElement(
      "div",
      { className: "flex space-x-1.5 justify-center items-center" },
      s.map((d, i) =>
        React.createElement(FliqloDigit, {
          key: i,
          value: d,
          isActive,
          isBust,
        }),
      ),
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PlayerCockpit: スコアボード + 履歴パネル
  // ─────────────────────────────────────────────────────────────────────────
  const PlayerCockpit = ({
    player,
    displayScore,
    isActive,
    isBust,
    alignment,
    label,
    gameMode,
    isCpuPending,
  }) =>
    React.createElement(
      "div",
      {
        className:
          // アクティブプレイヤーは scale-105 + amber リングで視線誘導を強める
          `flex flex-col justify-between h-full gap-2 bg-black/10 p-1.5 rounded-2xl border transition-all duration-200 ${
            isActive
              ? "border-amber-500/40 scale-105 ring-2 ring-amber-400/70 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
              : "border-zinc-900/40"
          }`,
      },
      React.createElement(
        "div",
        null,
        React.createElement(
          "div",
          { className: "mb-1.5 px-0.5" },
          isCpuPending
            ? React.createElement(
                "div",
                { className: "active-player-banner", style: { borderColor: "rgba(99,102,241,0.5)", background: "rgba(99,102,241,0.08)" } },
                React.createElement("span", { className: "dot", style: { background: "#818cf8" } }),
                React.createElement("span", { className: "truncate text-indigo-300" }, player.name),
                React.createElement("span", { className: "text-indigo-400/70 text-[7px] font-bold shrink-0 animate-pulse" }, "THINKING..."),
              )
            : isActive
            ? React.createElement(
                "div",
                { className: "active-player-banner" },
                React.createElement("span", { className: "dot" }),
                React.createElement("span", { className: "truncate" }, player.name),
                React.createElement("span", { className: "text-amber-500/60 text-[7px] font-bold shrink-0" }, "YOUR TURN"),
              )
            : React.createElement(
                "div",
                { className: "px-1 py-1 rounded-lg text-center" },
                React.createElement(
                  "span",
                  { className: "text-[9px] font-black text-zinc-600 tracking-widest truncate uppercase block" },
                  player.name,
                ),
              ),
        ),
        // BUSTオーバーレイはスコア部分(FliqloScoreboard)だけを覆う。relativeをここに
        // 持たせることで、banner(名前/YOUR TURN表示)はBUSTの赤いオーバーレイの影響を受けない
        // （以前はbannerも同じrelativeコンテナに入っていたため、BUST時にbannerまで覆われ、
        // プレイヤー名が読めなくなっていた）。
        React.createElement(
          "div",
          { className: "relative" },
          React.createElement(FliqloScoreboard, {
            score: displayScore,
            isActive,
            isBust,
          }),
          isBust && React.createElement(
            "div",
            {
              className: "absolute inset-0 flex items-center justify-center bg-rose-600/90 backdrop-blur-sm rounded-2xl z-10 pointer-events-none"
            },
            React.createElement(
              "span",
              {
                className: "text-4xl font-black text-white tracking-[0.1em] animate-pulse drop-shadow-2xl"
              },
              "BUST"
            )
          ),
        ),
      ),
      React.createElement(
        "div",
        {
          className:
            "soft-metal panel-glow border border-zinc-800/90 rounded-xl overflow-hidden",
        },
        React.createElement(
          "span",
          {
            className:
              "text-[7px] font-mono text-zinc-600 block text-center border-b border-zinc-900 py-0.5 font-bold tracking-widest uppercase",
          },
          label,
        ),
        React.createElement(
          "div",
          { className: "overflow-y-auto h-20 md:h-24 no-scrollbar" },
          player.history.length === 0
            ? React.createElement(
                "div",
                {
                  className: "text-zinc-700 italic text-center py-3 text-[7px]",
                },
                "— no rounds —",
              )
            : player.history.map((h, idx) =>
                gameMode !== "01"
                  ? React.createElement(
                      "div",
                      {
                        key: idx,
                        className:
                          "flex items-center justify-between px-2 py-1 border-b border-zinc-800/40 last:border-0",
                      },
                      React.createElement(
                        "span",
                        {
                          className:
                            "text-[7px] font-bold text-zinc-600 w-5 shrink-0",
                        },
                        "R",
                        h.roundNum,
                      ),
                      React.createElement(
                        "span",
                        {
                          className:
                            // スマホでの折り返し防止: " · " 区切り → スペース区切りでコンパクトに (T20 T20 D20)
                            "text-[8px] font-mono flex-1 text-center truncate px-1 text-zinc-300 font-bold",
                        },
                        h.throws.map((t) => t.label).join(" "),
                      ),
                      React.createElement(
                        "span",
                        {
                          className:
                            "text-[8px] font-black w-10 text-right shrink-0 text-amber-400",
                        },
                        "+",
                        h.roundScore,
                      ),
                    )
                  : React.createElement(
                      "div",
                      {
                        key: idx,
                        className:
                          "flex items-center justify-between px-2 py-1 border-b border-zinc-800/40 last:border-0",
                      },
                      React.createElement(
                        "span",
                        {
                          className:
                            "text-[7px] font-bold text-zinc-600 w-5 shrink-0",
                        },
                        "R",
                        h.roundNum,
                      ),
                      React.createElement(
                        "span",
                        {
                          className: `text-[8px] font-mono flex-1 text-center truncate px-1 ${h.isBust ? "text-rose-500 line-through" : "text-zinc-300 font-bold"}`,
                        },
                        h.throws.map((t) => t.label).join(" "),
                      ),
                      React.createElement(
                        "span",
                        {
                          className: `text-[8px] font-black w-10 text-right shrink-0 ${h.isBust ? "text-rose-500" : "text-amber-400"}`,
                        },
                        h.isBust ? "BUST" : h.roundScore,
                      ),
                    ),
              ),
        ),
      ),
    );

