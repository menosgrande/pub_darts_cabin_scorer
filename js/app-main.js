// ═══════════════════════════════════════════════════════════════════════
// app-main.js — アプリ本体（React, ゲームロジック, UI）
// 依存: constants.js, checkout.js, scoring.js, cpu.js, ui-components.js（すべてこの前に読み込まれている前提）
// ═══════════════════════════════════════════════════════════════════════
const { useState, useEffect, useRef, useMemo } = React;

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN APP
  // ─────────────────────────────────────────────────────────────────────────
  function App() {
  // ═══════════════════════════════════════════════════════════════════════
  // ◆ SECTION: React Component — Main App
  // アプリ本体。State定義 → Ref同期 → CPU/Save等のuseEffect → イベントハンドラ群（Save/Restoreを含む） → JSX。
  // 内部の「Save / Restore Helpers」見出しは migrateSaveData 付近に別途記載。
  // ═══════════════════════════════════════════════════════════════════════
    // ── ゲーム設定 ──
    // ★ 新しいstateを追加するときの4点チェックリスト ★
    // 1. useState宣言（ここ）
    // 2. CPU useEffect内で参照する場合 → useRef宣言(~L1285) + Ref同期(~L1299)
    // 3. localStorage保存リスト(~L1519) に追加
    // 4. handleRestoreSave(~L2030) で復元
    const [gameMode, setGameMode] = useState("01");       // "01" | "countup" | "cricket"
    const [playerCount, setPlayerCount] = useState(2);    // 1 | 2
    const [cpuMode, setCpuMode] = useState(false);        // CPU対戦ON/OFF
    const [cpuDifficulty, setCpuDifficulty] = useState("medium"); // easy|medium|hard|pro
    const [helpLang, setHelpLang] = useState("ja"); // "ja" | "en" — デフォルト日本語
    const [p1StartScore, setP1StartScore] = useState(501);
    const [p2StartScore, setP2StartScore] = useState(501);
    const [outMode, setOutMode] = useState("single");
    const [checkoutPref, setCheckoutPref] = useState("double");
    const [bullType, setBullType] = useState("separate");
    const [cuRounds, setCuRounds] = useState(COUNT_UP_ROUNDS);
    const [maxRounds, setMaxRounds] = useState(30); // 上限は30（無制限は現実的でないため廃止）
    // 手動クリケットハンデ: P1/P2それぞれ独立に20-15+Bullのマーク数(0-3)とボーナス得点を持つ
    // （以前は「1人だけ選んで付ける」方式だったが、コンパクトな表形式レイアウトの要望に合わせ、
    // 両者を同時に見渡せる独立指定方式に戻した）。
    const [manualCricketMarksP1, setManualCricketMarksP1] = useState({ 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, 25: 0 });
    const [manualCricketMarksP2, setManualCricketMarksP2] = useState({ 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, 25: 0 });
    const [manualCricketBonusP1, setManualCricketBonusP1] = useState(0);
    const [manualCricketBonusP2, setManualCricketBonusP2] = useState(0);
    const [autoHandicap01, setAutoHandicap01] = useState("dl2"); // "off" | "dl2"（DARTSLIVE2準拠オートハンデ。デフォルトはAUTOを先に見せる）
    const [autoHandicapCricket, setAutoHandicapCricket] = useState("dl2"); // "off" | "dl2"（デフォルトはAUTOを先に見せる）
    // p1Rating/p2Ratingは01・クリケットのオートハンデで共用（実際のDARTSLIVEは種目別レーティングだが、
    // このアプリでは入力欄を増やしすぎないための簡略化）。
    const [p1Rating, setP1Rating] = useState(6); // オートハンデ用レーティング(1刻み, 0〜17。デフォルト6前後)
    const [p2Rating, setP2Rating] = useState(6);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [showHowTo, setShowHowTo] = useState(false);
    const [showSettingsSetup, setShowSettingsSetup] = useState(true);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [showQuitConfirm, setShowQuitConfirm] = useState(false);
    const [hasRestorableSave, setHasRestorableSave] = useState(false);

    const audioCtxRef = useRef(null);

    // ── プレイヤー状態 ──
    // 01ゲーム: remainingScore を使用
    // Count-Up: accumulatedScore を使用
    // Cricket: cricketMarks(ナンバーごとのマーク数) / cricketScore を使用
    const makePlayer = (id, name, startScore, handicapMarks, handicapCount, initialCricketScore) => ({
      id,
      name,
      initialScore: startScore,
      remainingScore: startScore,
      accumulatedScore: 0,
      cricketMarks: handicapMarks || makeEmptyCricketMarks(),
      cricketScore: initialCricketScore || 0, // DL2オートハンデのボーナス得点（手動ハンデ時は常に0）
      cricketHandicap: handicapCount || 0, // セットアップ画面復元用（原則7: 派生値ではなく設定値そのものを保持）
      history: [],
    });

    // 壊れた/古い形式のセーブデータからプレイヤーを復元する際、欠損フィールドを安全なデフォルトで
    // 埋める。localStorageの手動編集や旧バージョンのデータでフィールドが欠けていても、
    // 後段のgetCricketRoundState等が undefined参照でクラッシュしないようにするための防御。
    const sanitizeRestoredPlayer = (p, id, fallbackName) => {
      if (!p || typeof p !== "object") return makePlayer(id, fallbackName, 501);
      const initialScore = Number.isFinite(p.initialScore) ? p.initialScore : 501;
      return {
        id: typeof p.id === "string" ? p.id : id,
        name: typeof p.name === "string" ? p.name : fallbackName,
        initialScore,
        remainingScore: Number.isFinite(p.remainingScore) ? p.remainingScore : initialScore,
        accumulatedScore: Number.isFinite(p.accumulatedScore) ? p.accumulatedScore : 0,
        cricketMarks:
          p.cricketMarks && typeof p.cricketMarks === "object"
            ? { ...makeEmptyCricketMarks(), ...p.cricketMarks }
            : makeEmptyCricketMarks(),
        cricketScore: Number.isFinite(p.cricketScore) ? p.cricketScore : 0,
        cricketHandicap: Number.isFinite(p.cricketHandicap) ? p.cricketHandicap : 0,
        history: Array.isArray(p.history) ? p.history : [],
      };
    };

    const [players, setPlayers] = useState([
      makePlayer("p1", "PLAYER 1", 501),
      makePlayer("p2", "PLAYER 2", 501),
    ]);
    const [activePlayerIndex, setActivePlayerIndex] = useState(0);
    const [currentThrows, setCurrentThrows] = useState([]);
    const [editingThrowIndex, setEditingThrowIndex] = useState(null);
    const [padMultiplier, setPadMultiplier] = useState(1);
    const [turnHistoryState, setTurnHistoryState] = useState([]);
    const [winner, setWinner] = useState(null);
    const [confirmStage, setConfirmStage] = useState("throwing");
    const [undoConfirmStage, setUndoConfirmStage] = useState("idle");
    const boardRef = useRef(null);
    const isMultiTouchRef = useRef(false);
    const touchStartPosRef = useRef(null); // {x,y}。スワイプ/ドラッグをタップと誤認しないための判定用
    const currentThrowsRef = useRef([]);
    const winnerRef = useRef(null);
    const showSettingsSetupRef = useRef(true); // beforeunload判定用(セットアップ画面中は警告不要)
    // 最新stateをrefで追跡 → useEffect内のクロージャが古い値を掴む問題を防ぐ
    const playersRef = useRef(players);
    const activePlayerIndexRef = useRef(0);
    const gameModeRef = useRef("01");
    const outModeRef = useRef("single");
    const bullTypeRef = useRef("separate");
    const cuRoundsRef = useRef(COUNT_UP_ROUNDS);
    const cpuDifficultyRef = useRef("medium");
    const playerCountRef = useRef(2);
    const maxRoundsRef = useRef(null);

    const activePlayer = players[activePlayerIndex];

    // 常に最新値をrefに同期
    playersRef.current = players;
    activePlayerIndexRef.current = activePlayerIndex;
    gameModeRef.current = gameMode;
    outModeRef.current = outMode;
    bullTypeRef.current = bullType;
    cuRoundsRef.current = cuRounds;
    cpuDifficultyRef.current = cpuDifficulty;
    playerCountRef.current = playerCount;
    maxRoundsRef.current = maxRounds;
    winnerRef.current = winner; // winner の最新値をrefに同期
    showSettingsSetupRef.current = showSettingsSetup;

    const setCurrentThrowsImmediate = (nextThrows) => {
      currentThrowsRef.current = nextThrows;
      setCurrentThrows(nextThrows);
    };

    const clearSavedGame = () => {
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch (e) {}
      setHasRestorableSave(false);
    };

    const refreshRestorableSave = () => {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!raw) {
          setHasRestorableSave(false);
          return false;
        }
        const parsed = JSON.parse(raw);
        const d = migrateSaveData(parsed);
        if (!d) {
          // 未来バージョン等、現行アプリでは復元不能なセーブ → ボタン自体を出さない
          setHasRestorableSave(false);
          return false;
        }
        const ok = Date.now() - (d.savedAt || 0) < 86400000;
        if (!ok) {
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          setHasRestorableSave(false);
          return false;
        }
        setHasRestorableSave(true);
        return true;
      } catch (e) {
        setHasRestorableSave(false);
        return false;
      }
    };

    // ── 01ゲーム用: ラウンド状態（useMemoを廃止し毎レンダーで即時計算）
    // winner確定後はroundState計算を止める（BUST等の誤表示防止）
    const roundState =
      (gameMode === "01" && !winner && confirmStage !== "gameover")
        ? getRoundState(
            activePlayer.remainingScore,
            currentThrows,
            normalizeOutMode(outMode),
          )
        : {
            isBust: false,
            isFinished: false,
            remainingScore: activePlayer.remainingScore,
            subtotal: getSubtotal(currentThrows),
          };

    // 01: 現在の残り点数(バースト中はハイライトしない)で「あと1投で上がれる」セグメント一覧
    const finishTargets01 =
      gameMode === "01" && !roundState.isBust
        ? getFinishTargets(roundState.remainingScore, outMode, bullType)
        : [];

    // ── Cricketゲーム用: ライブのマーク/得点状態（打つたびに即時反映）
    const opponentsCricketMarksForActive =
      playerCount === 1
        ? []
        : players.filter((_, i) => i !== activePlayerIndex).map((p) => p.cricketMarks);
    const cricketLiveState =
      (gameMode === "cricket" && !winner && confirmStage !== "gameover")
        ? getCricketRoundState(
            activePlayer.cricketMarks,
            activePlayer.cricketScore,
            currentThrows,
            opponentsCricketMarksForActive,
          )
        : { marks: activePlayer.cricketMarks, score: activePlayer.cricketScore, pointsThisTurn: 0 };

    const committedRoundNode =
      (gameMode === "01" || gameMode === "cricket") &&
      confirmStage === "next" &&
      activePlayer.history.length > 0
        ? activePlayer.history[0]
        : null;
    const isRoundBurst =
      gameMode === "01" && !winner &&
      (confirmStage === "next"
        ? !!(committedRoundNode && committedRoundNode.isBust)
        : roundState.isBust);
    const currentRoundSubtotal =
      committedRoundNode && confirmStage === "next"
        ? committedRoundNode.roundScore
        : gameMode === "cricket"
          ? cricketLiveState.pointsThisTurn
          : getSubtotal(currentThrows);
    // CPUが操作するのは P2(index=1) かつ throwing 中のみ（設定画面表示中は動かさない）
    // !editingThrowIndex: 編集モード中にCPUが割り込まないようにする
    const isCpuTurn = cpuMode && activePlayerIndex === 1
      && confirmStage === "throwing" && !winner && !showSettingsSetup
      && editingThrowIndex === null;

    // Count-Up用表示スコア
    const cuDisplayScore = (pi) => {
      const p = players[pi];
      const isActive = pi === activePlayerIndex;
      const added =
        isActive && confirmStage === "throwing" ? currentRoundSubtotal : 0;
      return Math.min(p.accumulatedScore + added, 9999);
    };

    // Cricket用表示スコア（自分の手番中はライブのcricketLiveStateを反映）
    const cricketDisplayScore = (pi) => {
      const p = players[pi];
      const isActive = pi === activePlayerIndex;
      const val = isActive && confirmStage === "throwing" ? cricketLiveState.score : p.cricketScore;
      return Math.min(val, 9999);
    };
    // Cricketスコアボード表示用: 自分の手番中はライブのマーク状況を反映
    const p1CricketMarks =
      activePlayerIndex === 0 && confirmStage === "throwing" && gameMode === "cricket"
        ? cricketLiveState.marks
        : players[0].cricketMarks;
    const p2CricketMarks =
      activePlayerIndex === 1 && confirmStage === "throwing" && gameMode === "cricket"
        ? cricketLiveState.marks
        : players[1].cricketMarks;

    // 01ゲーム用表示スコア
    const currentActiveRemaining =
      gameMode === "01"
        ? confirmStage === "next"
          ? activePlayer.remainingScore   // SOLOは常にactivePlayer使用
          : roundState.remainingScore
        : 0;
    const p1DisplayScore =
      gameMode === "countup"
        ? cuDisplayScore(0)
        : gameMode === "cricket"
          ? cricketDisplayScore(0)
          : activePlayerIndex === 0
            ? currentActiveRemaining
            : players[0].remainingScore;
    const p2DisplayScore =
      gameMode === "countup"
        ? cuDisplayScore(1)
        : gameMode === "cricket"
          ? cricketDisplayScore(1)
          : activePlayerIndex === 1
            ? currentActiveRemaining
            : players[1].remainingScore;

    // ── アシストバー（インライン計算 - useMemo廃止で常に最新値）──
    const assistInfo = (() => {
      // winner確定後 / gameover中はアシスト計算を止める
      if (winner || confirmStage === "gameover") return { text: "", sub: "", color: "text-zinc-700", pulse: false };
      if (isCpuTurn) return { text: "CPU THINKING...", sub: "", color: "text-indigo-400", pulse: true };
      try {
        if (gameMode === "countup") {
          return buildCountUpAssist(activePlayer, currentThrows, cuRounds);
        }
        if (gameMode === "cricket") {
          if (confirmStage === "next") {
            return buildCricketAssist(activePlayer, opponentsCricketMarksForActive, []);
          }
          return buildCricketAssist(activePlayer, opponentsCricketMarksForActive, currentThrows);
        }
        if (confirmStage === "next") {
          if (committedRoundNode && committedRoundNode.isBust) {
            return { text: "BUST", sub: "", color: "text-rose-500", pulse: false };
          }
          return buildAssistLine(
            activePlayer.remainingScore,
            [],
            bullType,
            normalizeOutMode(outMode),
            checkoutPref,
          );
        }
        return buildAssistLine(
          activePlayer.remainingScore,
          currentThrows,
          bullType,
          normalizeOutMode(outMode),
          checkoutPref,
        );
      } catch (e) {
        return { text: "—", sub: "", color: "text-zinc-600", pulse: false };
      }
    })();

    // ── Count-Up: 全ラウンド終了チェック ──
    const isCountUpFinished =
      gameMode === "countup" &&
      players.every((p) => p.history.length >= cuRounds);

    // ── CPU自動投擲 ──
    // 設計: タイマー1本、全stateをRefで読む、cancelledフラグで確実クリーンアップ
    const cpuCommitRef = useRef(null);
    useEffect(() => {
      if (!isCpuTurn) return;
      let cancelled = false;
      const totalDelay = 900 + Math.random() * 700;
      const tid = setTimeout(() => {
        if (cancelled) return;
        const p = playersRef.current;
        const idx = activePlayerIndexRef.current;
        const pl = p[idx];
        const gm = gameModeRef.current;
        const om = normalizeOutMode(outModeRef.current);
        const bt = bullTypeRef.current;
        const diff = cpuDifficultyRef.current;
        const cu = cuRoundsRef.current;
        const pc = playerCountRef.current;
        const remaining = gm === "countup" ? 9999 : pl.remainingScore;
        const opponentsMarks = pc === 1 ? [] : p.filter((_, i) => i !== idx).map((pp) => pp.cricketMarks);
        const cpuThrows = gm === "cricket"
          ? cpuPlayCricketTurn(pl.cricketMarks, opponentsMarks, diff)
          : cpuPlayTurn(remaining, gm, om, diff, bt);
        // キャンセル・ゲーム終了チェック（state更新前に必ず確認）
        if (cancelled) return;
        // winnerRef で最新のwinner状態を確認（stateクロージャ問題を回避）
        if (winnerRef.current) return;
        // 投擲ゼロ（全ドロップ）= スキップ扱いでP1ターンに戻す（無限ループ防止）
        if (cpuThrows.length === 0) {
          setCurrentThrowsImmediate([]);
          setActivePlayerIndex(0);
          setConfirmStage("throwing");
          return;
        }
        const snap = { players: cloneDeep(p), activePlayerIndex: idx };
        setCurrentThrowsImmediate(cpuThrows);
        if (cancelled) { setCurrentThrowsImmediate([]); return; }
        setTurnHistoryState(prev => [...prev, snap].slice(-20));
        if (gm === "countup") {
          const pts = getSubtotal(cpuThrows);
          const node = { roundNum: pl.history.length + 1, throws: cpuThrows, roundScore: pts };
          const mp = p.map((pp, i) => i === idx
            ? { ...pp, accumulatedScore: pp.accumulatedScore + pts, history: [node, ...pp.history] } : pp);
          setPlayers(mp);
          const rel = pc === 1 ? [mp[0]] : mp;
          if (rel.every(pp => pp.history.length >= cu)) {
            const isDraw = pc === 1 ? false : mp[0].accumulatedScore === mp[1].accumulatedScore;
            const w = pc === 1 ? mp[0] : (isDraw || mp[0].accumulatedScore > mp[1].accumulatedScore) ? mp[0] : mp[1];
            setConfirmStage("gameover"); setCurrentThrowsImmediate([]);
            playSound("victory");
            setWinner({ ...w, countUpResult: true, isDraw, scores: rel.map(pp => ({ name: pp.name, score: pp.accumulatedScore })) });
          } else {
            playSound("click"); setCurrentThrowsImmediate([]); setActivePlayerIndex(0); setConfirmStage("throwing");
          }
        } else if (gm === "cricket") {
          const oppMarksList = pc === 1 ? [] : p.filter((_, i) => i !== idx).map((pp) => pp.cricketMarks);
          const result = getCricketRoundState(pl.cricketMarks, pl.cricketScore, cpuThrows, oppMarksList);
          const node = { roundNum: pl.history.length + 1, throws: cpuThrows, roundScore: result.pointsThisTurn, cricketMarks: result.marks, cricketScore: result.score };
          const mp = p.map((pp, i) => i === idx ? { ...pp, cricketMarks: result.marks, cricketScore: result.score, history: [node, ...pp.history] } : pp);
          setPlayers(mp);
          const others = pc === 1 ? [] : mp.filter((_, i) => i !== idx);
          if (checkCricketWinner(mp[idx], others)) {
            setConfirmStage("gameover"); playSound("victory");
            setWinner({ ...mp[idx], cricketResult: true, isDraw: false, scores: (pc === 1 ? [mp[idx]] : mp).map(pp => ({ name: pp.name, score: pp.cricketScore })) });
          } else {
            // CPUターン終了後のラウンド上限チェック（winnerRefで二重ゲームオーバー防止。CPU(idx=1)は常にラストプレイヤー）
            if (winnerRef.current) return;
            const crMax = maxRoundsRef.current;
            const nextRoundNum = mp[idx].history.length;
            if (crMax !== null && nextRoundNum >= crMax) {
              const relevant = pc === 1 ? [mp[0]] : mp.slice(0, 2);
              const maxScore = Math.max(...relevant.map(pp => pp.cricketScore));
              const winners = relevant.filter(pp => pp.cricketScore === maxScore);
              const isDraw = winners.length > 1;
              const w = isDraw ? { ...winners[0], id: null } : winners[0];
              setConfirmStage("gameover"); playSound("victory");
              setWinner({ ...w, cricketResult: true, isDraw, scores: relevant.map(pp => ({ name: pp.name, score: pp.cricketScore })) });
            } else {
              playSound("click"); setCurrentThrowsImmediate([]); setActivePlayerIndex(0); setConfirmStage("throwing");
            }
          }
        } else {
          const freshState = getRoundState(pl.remainingScore, cpuThrows, om);
          const nextRem = freshState.remainingScore;
          const node = { roundNum: pl.history.length + 1, throws: cpuThrows, roundScore: freshState.subtotal, remainingScore: nextRem, isBust: freshState.isBust };
          const mp = p.map((pp, i) => i === idx ? { ...pp, remainingScore: nextRem, history: [node, ...pp.history] } : pp);
          setPlayers(mp);
          if (nextRem === 0) {
            setConfirmStage("gameover"); playSound("victory"); setWinner(mp[idx]);
          } else {
            // CPUターン終了後のラウンド上限チェック（winnerRefで二重ゲームオーバー防止）
            if (winnerRef.current) return;
            const o1MaxR = maxRoundsRef.current;
            const nextRoundNum = mp[idx].history.length;
            // CPU(idx=1)は常にラストプレイヤー
            if (o1MaxR !== null && nextRoundNum >= o1MaxR) {
              const relevant = pc === 1 ? [mp[0]] : mp.slice(0, 2);
              const minRem = Math.min(...relevant.map(pp => pp.remainingScore));
              const winners = relevant.filter(pp => pp.remainingScore === minRem);
              const isDraw = winners.length > 1;
              const w = isDraw ? { ...winners[0], id: null } : winners[0];
              setConfirmStage("gameover"); playSound("victory");
              setWinner({ ...w, o1RoundResult: true, isDraw, scores: relevant.map(pp => ({ name: pp.name, score: pp.remainingScore })) });
            } else {
              playSound("click"); setCurrentThrowsImmediate([]); setActivePlayerIndex(0); setConfirmStage("throwing");
            }
          }
        }
      }, totalDelay);
      cpuCommitRef.current = () => { cancelled = true; clearTimeout(tid); };
      return () => {
        cancelled = true;
        clearTimeout(tid);
        cpuCommitRef.current = null;
      };
    }, [isCpuTurn]);

    // ── LocalStorage 自動保存 ──
    useEffect(() => {
      if (
        !showSettingsSetup &&
        (players[0].history.length > 0 ||
          players[1].history.length > 0 ||
          currentThrows.length > 0)
      ) {
        try {
          localStorage.setItem(
            LOCAL_STORAGE_KEY,
            JSON.stringify({
              gameMode,
              players,
              activePlayerIndex,
              currentThrows,
              outMode,
              bullType,
              turnHistoryState,
              confirmStage,
              editingThrowIndex,
              padMultiplier,
              winner,
              checkoutPref,
              cuRounds,
              maxRounds,
              playerCount,
              cpuMode,
              cpuDifficulty,
              helpLang,
              // 01/クリケットのハンデ設定。復元しないとRESUME後にPLAY AGAIN/MENU→LEAVEした際、
              // 既定値（AUTO・レーティング同値など）で再計算されて元のハンデ条件が消えてしまう
              // （players[].initialScore/cricketMarksはlive状態としては復元されるが、
              // 次戦を組み立てるsetup state自体は別管理のため、両方を保存する必要がある）。
              autoHandicap01,
              p1Rating,
              p2Rating,
              autoHandicapCricket,
              manualCricketMarksP1,
              manualCricketMarksP2,
              manualCricketBonusP1,
              manualCricketBonusP2,
              savedAt: Date.now(),
              version: CURRENT_SAVE_VERSION,
            }),
          );
          setHasRestorableSave(true);
        } catch (e) {}
      }
    }, [
      gameMode,
      players,
      activePlayerIndex,
      currentThrows,
      outMode,
      bullType,
      turnHistoryState,
      confirmStage,
      editingThrowIndex,
      padMultiplier,
      winner,
      checkoutPref,
      cuRounds,
      maxRounds,
      playerCount,
      cpuMode,
      cpuDifficulty,
      helpLang,
      autoHandicap01,
      p1Rating,
      p2Rating,
      autoHandicapCricket,
      manualCricketMarksP1,
      manualCricketMarksP2,
      manualCricketBonusP1,
      manualCricketBonusP2,
      showSettingsSetup,
    ]);

    useEffect(() => {
      refreshRestorableSave();
    }, []);

    // ── 通算成績(ゲームをまたいだ成長記録)の保存 ──
    // winner確定(ゲーム終了)を検知して、gameStats専用キー(STATS_STORAGE_KEY)に
    // 集計済みレコードを追記する。LOCAL_STORAGE_KEY(進行中の1ゲーム復元用)とは無関係。
    //
    // 二重記録防止: winnerオブジェクトに_statsRecordedフラグを立てて記録済みを示す。
    // これによって(a)このeffect自体が同じwinnerに対して2回走らない(フラグ付きに更新後は
    // 早期returnする)のと、(b)ゲーム終了直後にブラウザを閉じてRESUMEした場合でも、
    // 保存されたwinnerオブジェクトにフラグが残っているため再記録されない。
    useEffect(() => {
      if (!winner || winner._statsRecorded) return;
      try {
        const records = buildGameStatsRecords(
          players,
          playerCount,
          winner,
          gameMode,
          outMode,
        );
        if (records.length > 0) {
          const raw = localStorage.getItem(STATS_STORAGE_KEY);
          const existing = raw ? JSON.parse(raw) : [];
          const updated = Array.isArray(existing)
            ? existing.concat(records)
            : records;
          localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(updated));
        }
      } catch (e) {
        // 統計保存の失敗はゲーム進行そのものに影響させない
      }
      setWinner((w) => (w ? { ...w, _statsRecorded: true } : w));
    }, [winner, players, playerCount, gameMode, outMode]);

    useEffect(() => {
      const h = (e) => {
        if (e.key === "Escape" && editingThrowIndex !== null)
          setEditingThrowIndex(null);
      };
      window.addEventListener("keydown", h);
      return () => window.removeEventListener("keydown", h);
    }, [editingThrowIndex]);

    // ── ブラウザを閉じる/リロードする際の離脱確認 ──
    // window.addEventListenerのハンドラはReactのレンダリングサイクル外から呼ばれるため、
    // stateを直接参照すると古いクロージャを掴む(STATE_MANAGEMENT.md「Ref同期ルール」参照)。
    // 進行中のゲームがある場合(セットアップ画面ではない・勝敗未確定・スコアやスローが1つでもある)
    // のみ、ブラウザ標準の確認ダイアログを出す。ローカル保存(24時間)はあるが、
    // 誤ってタブを閉じてしまう事故そのものを防ぐための一段目のガード。
    useEffect(() => {
      const handleBeforeUnload = (e) => {
        const p = playersRef.current;
        const pc = playerCountRef.current;
        const hasInProgressGame =
          !showSettingsSetupRef.current &&
          !winnerRef.current &&
          (p[0].history.length > 0 ||
            (pc >= 2 && p[1].history.length > 0) ||
            currentThrowsRef.current.length > 0);
        if (hasInProgressGame) {
          // 確認メッセージの文言はブラウザ側が独自のもの(日本語含む)を表示するため
          // e.returnValueに渡す文字列自体は現代のブラウザではほぼ無視される。
          // 空文字ではなくpreventDefault()すること自体がトリガーとして必要。
          e.preventDefault();
          e.returnValue = "";
        }
      };
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, []);

    useEffect(() => {
      currentThrowsRef.current = currentThrows;
    }, [currentThrows]);

    const canAddMoreThrows =
      editingThrowIndex !== null ||
      (!roundState.isBust &&
        !roundState.isFinished &&
        currentThrows.length < MAX_THROWS_PER_TURN);
    useEffect(() => {
      setUndoConfirmStage("idle");
    }, [currentThrows]);

    // ── Audio ──
    const initAudio = () => {
      if (!audioCtxRef.current)
        audioCtxRef.current = new (
          window.AudioContext || window.webkitAudioContext
        )();
    };
    // ダーツ入力の確定を触覚でも伝える。暗所・飲酒時のプレイでも「入力できた」が
    // 指先だけで確信できるようにする（Vibration API非対応のブラウザ、特にiOS Safariでは
    // navigator.vibrateが存在しないので何もしない＝安全に無視される）。
    const triggerHaptic = (duration = 10) => {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try { navigator.vibrate(duration); } catch (e) {}
      }
    };
    const playSound = (type) => {
      if (!soundEnabled) return;
      try {
        initAudio();
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        if (ctx.state === "suspended") ctx.resume();
        const now = ctx.currentTime;
        const mk = (type, freq, gain, dur, extra) => {
          const o = ctx.createOscillator(),
            g = ctx.createGain();
          o.type = type;
          o.frequency.setValueAtTime(freq, now);
          if (extra) extra(o, g, now);
          g.gain.setValueAtTime(gain, now);
          g.gain.linearRampToValueAtTime(0, now + dur);
          o.connect(g);
          g.connect(ctx.destination);
          o.start(now);
          o.stop(now + dur + 0.02);
        };
        switch (type) {
          case "click":
            mk("triangle", 650, 0.06, 0.06, (o) => {
              o.frequency.exponentialRampToValueAtTime(100, now + 0.05);
            });
            break;
          case "revert":
            mk("sine", 220, 0.08, 0.1, (o) => {
              o.frequency.linearRampToValueAtTime(320, now + 0.1);
            });
            break;
          case "hit-single":
            mk("triangle", 160, 0.25, 0.1, (o) => {
              o.frequency.exponentialRampToValueAtTime(60, now + 0.1);
            });
            break;
          case "hit-double":
            [440, 523].forEach((f, i) => {
              const o = ctx.createOscillator(),
                g = ctx.createGain();
              o.type = "sine";
              o.frequency.setValueAtTime(f, now + i * 0.03);
              g.gain.setValueAtTime(0.12, now + i * 0.03);
              g.gain.exponentialRampToValueAtTime(1e-3, now + 0.3);
              o.connect(g);
              g.connect(ctx.destination);
              o.start(now + i * 0.03);
              o.stop(now + 0.35);
            });
            break;
          case "hit-triple":
            [587, 698, 880].forEach((f, i) => {
              const o = ctx.createOscillator(),
                g = ctx.createGain();
              o.type = "sine";
              o.frequency.setValueAtTime(f, now + i * 0.04);
              g.gain.setValueAtTime(0.1, now + i * 0.04);
              g.gain.exponentialRampToValueAtTime(1e-3, now + 0.4);
              o.connect(g);
              g.connect(ctx.destination);
              o.start(now + i * 0.04);
              o.stop(now + 0.45);
            });
            break;
          case "hit-bull":
            {
              const o1 = ctx.createOscillator(),
                o2 = ctx.createOscillator(),
                g = ctx.createGain();
              o1.type = "sine";
              o2.type = "sine";
              o1.frequency.setValueAtTime(880, now);
              o2.frequency.setValueAtTime(1109, now);
              g.gain.setValueAtTime(0.15, now);
              g.gain.exponentialRampToValueAtTime(1e-3, now + 0.6);
              o1.connect(g);
              o2.connect(g);
              g.connect(ctx.destination);
              o1.start();
              o2.start();
              o1.stop(now + 0.65);
              o2.stop(now + 0.65);
            }
            break;
          case "burst":
            mk("sawtooth", 140, 0.1, 0.4, (o) => {
              o.frequency.exponentialRampToValueAtTime(45, now + 0.4);
            });
            break;
          case "victory":
            [261, 329, 392, 523, 659, 783].forEach((f, i) => {
              const o = ctx.createOscillator(),
                g = ctx.createGain();
              o.type = "triangle";
              o.frequency.setValueAtTime(f, now + i * 0.08);
              g.gain.setValueAtTime(0.08, now + i * 0.08);
              g.gain.exponentialRampToValueAtTime(1e-3, now + 1.2);
              o.connect(g);
              g.connect(ctx.destination);
              o.start(now + i * 0.08);
              o.stop(now + 1.3);
            });
            break;
        }
      } catch (e) {}
    };

    // ── クイックスタート ──
    // 「とりあえず501 Double Out」「とりあえずクリケット」で即開始するワンタップ導線。
    // 1P/2P/CPUの選択（playerCount/cpuMode/cpuDifficulty）はセットアップ画面で選んだ値を
    // そのまま尊重し、上書きしない（クイックスタートが決めるのはゲーム内容だけ）。
    // handleStartGameはgameMode/p1StartScore等を現在のstateから読むため、
    // 同一ハンドラ内でsetGameMode→handleStartGameのように呼ぶとstateが古いまま参照されてしまう。
    // そのため値を直接埋め込んだ専用関数として独立させている（意図的な重複。責務の境界を優先）。
    const handleQuickStart = (mode) => {
      cancelCpuTimer();
      playSound("revert");
      clearSavedGame();
      setGameMode(mode);
      setBullType("separate");
      setMaxRounds(30);
      let p1StartVal = 501, p2StartVal = 501, p1Marks, p2Marks;
      if (mode === "01") {
        setOutMode("single");
        setCheckoutPref("double");
        setP1StartScore(501);
        setP2StartScore(501);
      } else if (mode === "cricket") {
        // ハンデなしのまっさらな状態で開始（手動ハンデ・DL2オートハンデどちらもオフ）
        setAutoHandicapCricket("off");
        setManualCricketMarksP1({ 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, 25: 0 });
        setManualCricketMarksP2({ 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, 25: 0 });
        setManualCricketBonusP1(0);
        setManualCricketBonusP2(0);
        p1Marks = makeEmptyCricketMarks();
        p2Marks = makeEmptyCricketMarks();
      } else if (mode === "countup") {
        setCuRounds(COUNT_UP_ROUNDS);
      }
      // p2Name算出はhandleStartGameと同じロジック（1P/2P/CPUの現在値をそのまま使う）
      const p2Name = resolveP2Name(cpuMode, cpuDifficulty, players);
      setPlayers([
        makePlayer("p1", players[0].name.trim() || "PLAYER 1", p1StartVal, p1Marks, 0, 0),
        makePlayer("p2", p2Name, p2StartVal, p2Marks, 0, 0),
      ]);
      winnerRef.current = null;
      setActivePlayerIndex(0);
      setCurrentThrowsImmediate([]);
      setEditingThrowIndex(null);
      setPadMultiplier(1);
      setTurnHistoryState([]);
      setWinner(null);
      setShowQuitConfirm(false);
      setShowExitConfirm(false);
      setShowSettingsSetup(false);
      setConfirmStage("throwing");
      setUndoConfirmStage("idle");
    };

    // 01ゲームの実際の開始点数を算出。オートハンデOFF時はp1StartScore/p2StartScoreそのまま、
    // ON時はレーティングが低い方だけDARTSLIVE2表に基づいて減点し、高い方はベース点数のまま。
    const computeAuto01Scores = () => {
      // 1Pソロ時は比較相手がいないのでハンデは常に無視（2P時に設定した値が残っていても適用しない）
      if (autoHandicap01 !== "dl2" || gameMode !== "01" || playerCount === 1) {
        return { p1: p1StartScore, p2: p2StartScore };
      }
      const diff = Math.abs(p1Rating - p2Rating);
      const baseScore = p1StartScore; // オートハンデ中はPRESETで両者同じベース点数を選ぶ想定
      if (p1Rating === p2Rating) return { p1: baseScore, p2: baseScore };
      return p1Rating < p2Rating
        ? { p1: getDartslive2_01Handicap(diff, baseScore), p2: baseScore }
        : { p1: baseScore, p2: getDartslive2_01Handicap(diff, baseScore) };
    };

    // クリケットの開始時マーク/ボーナス得点を算出。手動モードはP1/P2それぞれ独立に
    // manualCricketMarksP1/P2・manualCricketBonusP1/P2をそのまま適用し、
    // DL2モードはレーティング差からDARTSLIVE2表を引く。
    const computeCricketSetup = () => {
      const empty = { marks: undefined, bonus: 0, handicapCount: 0 };
      // 1Pソロ時は比較相手がいないのでハンデは常に無視
      if (gameMode !== "cricket" || playerCount === 1) {
        return { p1: empty, p2: empty };
      }
      if (autoHandicapCricket === "dl2") {
        if (p1Rating === p2Rating) return { p1: empty, p2: empty };
        const diff = Math.abs(p1Rating - p2Rating);
        const hc = getDartslive2CricketHandicap(diff);
        const handicapped = { marks: hc.marks, bonus: hc.bonus, handicapCount: 0 };
        return p1Rating < p2Rating
          ? { p1: handicapped, p2: empty }
          : { p1: empty, p2: handicapped };
      }
      const toSetup = (marks, bonus) =>
        (Object.values(marks).some((v) => v > 0) || bonus > 0)
          ? { marks: { ...makeEmptyCricketMarks(), ...marks }, bonus, handicapCount: bonus }
          : empty;
      return {
        p1: toSetup(manualCricketMarksP1, manualCricketBonusP1),
        p2: toSetup(manualCricketMarksP2, manualCricketBonusP2),
      };
    };

    // ── ゲーム開始 ──
    const handleStartGame = (showSetup = false) => {
      cancelCpuTimer();
      playSound("revert");
      clearSavedGame();
      const p2IsHuman = !cpuMode && playerCount >= 2;
      const p2Name = resolveP2Name(cpuMode, cpuDifficulty, players);
      const auto01 = computeAuto01Scores();
      const crSetup = computeCricketSetup();
      setPlayers([
        makePlayer("p1", players[0].name.trim() || "PLAYER 1", auto01.p1, crSetup.p1.marks, crSetup.p1.handicapCount, crSetup.p1.bonus),
        makePlayer("p2", p2Name, auto01.p2, crSetup.p2.marks, crSetup.p2.handicapCount, crSetup.p2.bonus),
      ]);
      winnerRef.current = null; // winnerRefを即時リセット（CPUuseEffect誤発火防止）
      setActivePlayerIndex(0);
      setCurrentThrowsImmediate([]);
      setEditingThrowIndex(null);
      setPadMultiplier(1);
      setTurnHistoryState([]);
      setWinner(null);
      setShowQuitConfirm(false);
      setShowExitConfirm(false);
      setShowSettingsSetup(showSetup);
      setConfirmStage("throwing");
      setUndoConfirmStage("idle");
    };

    // ── キーパッドタップ ──
    // ダーツ1本を確定させる共通処理。盤面タップ・テンキー入力どちらも最終的にここへ集約する。
    // 「score/multiplier/x/y/label/isBull」を持つオブジェクトを渡すだけでよいので、
    // 将来カメラ等の別入力源（画像認識で検出したダーツ）を追加する場合も、
    // 検出結果をこの形に変換してcommitThrow()を呼ぶだけで済む設計にしてある。
    // P2の名前を決定する共通ヘルパー。CPU対戦中は"CPU (難易度)"、そうでなければ人間の入力名。
    // 以前は各呼び出し側が個別に `cpuMode ? cpuLabel : players[1].name` を計算していたため、
    // 「CPU対戦後にCPUをOFFにして新規開始すると、players[1].nameに残った"CPU (PRO)"が
    // そのまま人間プレイヤー2の名前として使われてしまう」バグが複数箇所で再発していた。
    // ここで一元化し、CPUラベルらしき名前は必ず空扱いにする。
    const resolveP2Name = (cpuModeNow, cpuDifficultyNow, playersNow) => {
      if (cpuModeNow) return `CPU (${cpuDifficultyNow.toUpperCase()})`;
      const raw = (playersNow[1] && playersNow[1].name || "").trim();
      const looksLikeCpuLabel = /^CPU\s*\(/i.test(raw);
      return (!looksLikeCpuLabel && raw) || "PLAYER 2";
    };

    const commitThrow = (t) => {
      const nThrows =
        editingThrowIndex !== null
          ? currentThrows.map((th, i) => (i === editingThrowIndex ? t : th))
          : [...currentThrows, t];
      setCurrentThrowsImmediate(nThrows);
      if (editingThrowIndex !== null) setEditingThrowIndex(null);
      playSound(getHitSoundType(t));
      if (
        gameMode === "01" &&
        getRoundState(
          activePlayer.remainingScore,
          nThrows,
          normalizeOutMode(outMode),
        ).isBust
      )
        playSound("burst");
    };

    const handleKeypadTap = (score, specifiedMult, isBullType) => {
      if (winner || confirmStage === "next" || confirmStage === "gameover" || isCpuTurn)
        return;
      if (editingThrowIndex === null && !canAddMoreThrows) return;
      initAudio();
      triggerHaptic(10);
      const activeMult =
        specifiedMult !== undefined ? specifiedMult : padMultiplier;
      let finalMult = activeMult,
        label = "",
        isBull = false;
      if (score === 25) {
        isBull = true;
        if (isBullType === "inner" || activeMult === 2) {
          score = 50;
          finalMult = 1;
          label = "D-Bull";
        } else if (bullType === "fat") {
          score = 50;
          finalMult = 1;
          label = "Bull(50)";
        } else {
          score = 25;
          finalMult = 1;
          label = "S-Bull(25)";
        }
      } else if (score === 0) {
        finalMult = 0;
        label = "MISS";
      } else {
        label = `${finalMult === 3 ? "T" : finalMult === 2 ? "D" : "S"}${score}`;
      }
      let rx = 0,
        ry = 0;
      if (score === 0) {
        const d = 186 + Math.random() * 8,
          a = ((-110 + Math.random() * 220) * Math.PI) / 180;
        rx = Math.round(d * Math.cos(a));
        ry = Math.round(d * Math.sin(a));
      } else if (isBull) {
        const d = label === "D-Bull" || isBullType === "inner" ? 4 : 14,
          a = Math.random() * Math.PI * 2;
        rx = Math.round(d * Math.cos(a));
        ry = Math.round(d * Math.sin(a));
      } else if (score > 0) {
        const d = finalMult === 3 ? 101 : finalMult === 2 ? 165 : 133,
          i = WEDGES.indexOf(score),
          a = ((i * 18 - 90) * Math.PI) / 180;
        rx = Math.round(d * Math.cos(a));
        ry = Math.round(d * Math.sin(a));
      }
      const nT = { score, multiplier: finalMult, x: rx, y: ry, label, isBull };
      commitThrow(nT);
    };

    // ── ボードクリック ──
    const handleBoardClick = (e) => {
      if (winner || confirmStage === "next" || confirmStage === "gameover" || isCpuTurn)
        return;
      if (editingThrowIndex === null && !canAddMoreThrows) return;
      if (!boardRef.current) return;
      initAudio();
      triggerHaptic(10);
      const rect = boardRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2,
        cy = rect.top + rect.height / 2,
        scale = rect.width / 420;
      // e.clientX/Yが0の場合(画面のちょうど左端/上端)も有効な座標なので、
      // ||でフォールバックすると誤って0扱いされてしまう。typeof判定にする。
      const clientX =
        typeof e.clientX === "number"
          ? e.clientX
          : e.changedTouches && e.changedTouches[0]
            ? e.changedTouches[0].clientX
            : 0;
      const clientY =
        typeof e.clientY === "number"
          ? e.clientY
          : e.changedTouches && e.changedTouches[0]
            ? e.changedTouches[0].clientY
            : 0;
      const ct = getThrowFromCoords(
        (clientX - cx) / scale,
        (clientY - cy) / scale,
        bullType,
      );
      commitThrow(ct);
    };

    const cancelCpuTimer = () => {
      if (cpuCommitRef.current) { cpuCommitRef.current(); cpuCommitRef.current = null; }
    };

    const handleUndoSingleDart = () => {
      if (confirmStage === "next" || confirmStage === "gameover" || isCpuTurn) return;
      if (currentThrows.length === 0) return;
      playSound("revert");
      setCurrentThrowsImmediate(currentThrows.slice(0, -1));
      setEditingThrowIndex(null);
    };

    const handleFlushRound = () => {
      if (confirmStage === "gameover") return;
      cancelCpuTimer();
      playSound("revert");
      // ── CLEAR の責務: 入力バッファのクリアのみ ──
      // turnHistoryState（確定ターン履歴）には一切触れない。
      // confirmStage === "next" 中でも同じ。players/activePlayerIndex も変えない。
      // → PREV のみが確定ターン履歴を巻き戻す唯一の操作。
      //
      // next中にCLEARを押すと throwing に戻るが、スコアは「OK時点で確定した値」のまま。
      // ユーザーがターンごとスコアを取り消したい場合は PREV を使う。
      setCurrentThrowsImmediate([]);
      setEditingThrowIndex(null);
      setConfirmStage("throwing");
      setUndoConfirmStage("idle");
    };

    const handleUndoCommittedTurn = () => {
      if (turnHistoryState.length === 0) return;
      // gameover中（winner表示中）はPREV不可
      if (confirmStage === "gameover") return;
      // confirmStage==='next'(OK押し後)なら確認なしで即復元
      // confirmStage==='throwing' なら2段階確認（誤タップ防止）
      if (confirmStage !== "next" && undoConfirmStage === "idle") {
        // ここではまだ「確認待ち」に入るだけで実際には何も戻さない。
        // 以前はここで無条件に cancelCpuTimer() していたため、
        // CPU思考中にPREVを1回タップしただけ（confirmを押さず放置）でも
        // CPUのタイマーが握り潰され、CPUのターンが二度と進まなくなるバグがあった
        // （isCpuTurnがtrue→trueのまま変化しないため、useEffectが再発火せず復帰不能）。
        // 実際に巻き戻す（=CPUのターンを本当に無効化する）ことが確定してから
        // cancelCpuTimer() を呼ぶようにする。
        playSound("click");
        setUndoConfirmStage("confirm");
        return;
      }
      cancelCpuTimer();
      playSound("revert");
      const prev = turnHistoryState[turnHistoryState.length - 1];
      setPlayers(prev.players);
      setActivePlayerIndex(prev.activePlayerIndex);
      setCurrentThrowsImmediate([]);
      setEditingThrowIndex(null);
      // PRVはゲーム履歴（players/activePlayerIndex）の巻き戻しのみ担当。
      // winner はUI状態であり履歴対象外 → 常にnullリセット。
      // （gameover中はPREV不可なので、winner=nullで問題ない）
      setWinner(null);
      setConfirmStage("throwing");
      setUndoConfirmStage("idle");
      setTurnHistoryState(turnHistoryState.slice(0, -1));
    };

    // ── ラウンド確定 ──
    // "gameover" = ゲーム終了後の不活性状態（winner表示中）
    const handleCommitRound = () => {
      // winner確定済み・gameover状態は即リターン（OKボタン連打対策）
      if (winner || confirmStage === "gameover") return;

      if (confirmStage === "throwing") {
        const liveThrows = currentThrowsRef.current;
        if (liveThrows.length === 0) return;
        initAudio();
        const snap = { players: cloneDeep(players), activePlayerIndex };
        setTurnHistoryState((p) => [...p, snap].slice(-20));
        // maxRounds上限判定は「全員が同ラウンド数を打ち終えた後」にのみ行うため、
        // ラストプレイヤーのターンかどうかを01/クリケット共通で先に確定しておく。
        const isLastPlayer = playerCount === 1 || activePlayerIndex === (playerCount - 1);

        if (gameMode === "countup") {
          // Count-Up: 累積加算（このブロックは必ず1回だけ実行）
          const pts = getSubtotal(liveThrows);
          const node = {
            roundNum: activePlayer.history.length + 1,
            throws: liveThrows,
            roundScore: pts,
          };
          const mp = players.map((p, i) =>
            i === activePlayerIndex
              ? {
                  ...p,
                  accumulatedScore: p.accumulatedScore + pts,
                  history: [node, ...p.history],
                }
              : p,
          );
          setPlayers(mp);

          // setPlayers後のmpで終了判定（Reactのstate更新は非同期なのでmpを直接使う）
          // 1P時はP1(index=0)だけが全ラウンド終了で終了
          const relevantPlayers = (playerCount === 1) ? [mp[0]] : mp;
          const bothDone = relevantPlayers.every((p) => p.history.length >= cuRounds);
          if (bothDone) {
            // ゲーム終了: confirmStage="gameover"で以降の入力を完全遮断
            // SOLO時はrelevantPlayers([mp[0]])だけで判定・表示する（P2の初期値0が紛れ込まないように）
            const isDraw =
              playerCount === 1
                ? false
                : mp[0].accumulatedScore === mp[1].accumulatedScore;
            const w =
              playerCount === 1
                ? mp[0]
                : isDraw || mp[0].accumulatedScore > mp[1].accumulatedScore
                  ? mp[0]
                  : mp[1];
            setConfirmStage("gameover");
            setCurrentThrowsImmediate([]);
            setEditingThrowIndex(null);
            playSound("victory");
            setWinner({
              ...w,
              countUpResult: true,
              isDraw,
              scores: relevantPlayers.map((p) => ({
                name: p.name,
                score: p.accumulatedScore,
              })),
            });
          } else {
            playSound("click");
            setConfirmStage("next");
          }
        } else if (gameMode === "cricket") {
          // Cricket: 現在のダーツをマーク/得点に反映
          const opponentsMarks = playerCount === 1
            ? []
            : players.filter((_, i) => i !== activePlayerIndex).map((p) => p.cricketMarks);
          const result = getCricketRoundState(
            activePlayer.cricketMarks,
            activePlayer.cricketScore,
            liveThrows,
            opponentsMarks,
          );
          const node = {
            roundNum: activePlayer.history.length + 1,
            throws: liveThrows,
            roundScore: result.pointsThisTurn,
            cricketMarks: result.marks,
            cricketScore: result.score,
          };
          const mp = players.map((p, i) =>
            i === activePlayerIndex
              ? { ...p, cricketMarks: result.marks, cricketScore: result.score, history: [node, ...p.history] }
              : p,
          );
          setPlayers(mp);
          const others = playerCount === 1 ? [] : mp.filter((_, i) => i !== activePlayerIndex);
          if (checkCricketWinner(mp[activePlayerIndex], others)) {
            setConfirmStage("gameover");
            setCurrentThrowsImmediate([]);
            setEditingThrowIndex(null);
            playSound("victory");
            setWinner({
              ...mp[activePlayerIndex],
              cricketResult: true,
              isDraw: false,
              scores: (playerCount === 1 ? [mp[activePlayerIndex]] : mp).map((p) => ({
                name: p.name,
                score: p.cricketScore,
              })),
            });
          } else {
            // ラウンド上限チェック（maxRounds が設定されている場合。01と同じ上限設定を共有）
            const nextRoundNum = mp[activePlayerIndex].history.length;
            if (maxRounds !== null && isLastPlayer && nextRoundNum >= maxRounds) {
              // 全プレイヤーが規定ラウンドを終えた → クリケット得点が高い方が勝ち
              const relevant = playerCount === 1 ? [mp[0]] : mp.slice(0, 2);
              const maxScore = Math.max(...relevant.map((p) => p.cricketScore));
              const winners = relevant.filter((p) => p.cricketScore === maxScore);
              const isDraw = winners.length > 1;
              const w = isDraw ? { ...winners[0], id: null } : winners[0];
              setConfirmStage("gameover");
              setCurrentThrowsImmediate([]);
              setEditingThrowIndex(null);
              playSound("victory");
              setWinner({
                ...w,
                cricketResult: true,
                isDraw,
                scores: relevant.map((p) => ({ name: p.name, score: p.cricketScore })),
              });
            } else {
              playSound("click");
              setConfirmStage("next");
            }
          }
        } else {
          // 01ゲーム: useMemoのroundStateに依存せず、currentThrowsから直接計算
          // → 編集モード後のコミットでバースト判定がズレる問題を根本解決
          const normOut = normalizeOutMode(outMode);
          const freshState = getRoundState(
            activePlayer.remainingScore,
            liveThrows,
            normOut,
          );
          const nextRem = freshState.remainingScore;
          const node = {
            roundNum: activePlayer.history.length + 1,
            throws: liveThrows,
            roundScore: freshState.subtotal,
            remainingScore: nextRem,
            isBust: freshState.isBust,
          };
          const mp = players.map((p, i) =>
            i === activePlayerIndex
              ? { ...p, remainingScore: nextRem, history: [node, ...p.history] }
              : p,
          );
          setPlayers(mp);
          if (nextRem === 0) {
            setConfirmStage("gameover");
            playSound("victory");
            setWinner(mp[activePlayerIndex]);
          } else {
            // ラウンド上限チェック（maxRounds が設定されている場合）
            const nextRoundNum = mp[activePlayerIndex].history.length; // 今追加したラウンド数
            if (maxRounds !== null && isLastPlayer && nextRoundNum >= maxRounds) {
              // 全プレイヤーが規定ラウンドを終えた → 残り点数が少ない方が勝ち
              const relevant = playerCount === 1 ? [mp[0]] : mp.slice(0, 2);
              const minRem = Math.min(...relevant.map(p => p.remainingScore));
              const winners = relevant.filter(p => p.remainingScore === minRem);
              const isDraw = winners.length > 1;
              const w = isDraw ? { ...winners[0], id: null } : winners[0];
              setConfirmStage("gameover");
              playSound("victory");
              setWinner({ ...w, o1RoundResult: true, isDraw, scores: relevant.map(p => ({ name: p.name, score: p.remainingScore })) });
            } else {
              playSound("click");
              setConfirmStage("next");
            }
          }
        }
      } else if (confirmStage === "next") {
        // winner確定後のNEXT押下は無視（二重チェック）
        if (winner) return;
        playSound("click");
        if (playerCount !== 1) {
          setActivePlayerIndex(activePlayerIndex === 0 ? 1 : 0);
        }
        setCurrentThrowsImmediate([]);
        setEditingThrowIndex(null);
        setConfirmStage("throwing");
      }
    };

    // ═══════════════════════════════════════════════════════════════════
    // ◆ SECTION: Save / Restore Helpers (App内部)
    // セーブデータの読み書き・バージョン移行・バリデーション。React state setterを直接呼ぶため
    // App()の外には出していない（migrateSaveData自体は純粋関数）。
    // ═══════════════════════════════════════════════════════════════════
    // ── セーブデータ migration 枠 ──
    // version が上がるたびに、ここに旧バージョンからの変換処理を追加する。
    // 現状は変換不要のため中身は空だが、枠を用意しておくことで
    // 将来のフィールド追加・構造変更時に対応しやすくする。
    //
    // 戻り値が null の場合、呼び出し側（handleRestoreSave）は復元を拒否する。
    const migrateSaveData = (save) => {
      const v = save.version ?? 0;

      // 未来バージョン（このアプリより新しい形式）は復元しない。
      // 例: v7で保存したデータを、まだv6のままのアプリで開いた場合。
      // 中身を無理に読むと構造不一致でクラッシュする可能性があるため拒否する。
      if (v > CURRENT_SAVE_VERSION) {
        console.warn(`セーブデータのバージョン(${v})がアプリの対応バージョン(${CURRENT_SAVE_VERSION})より新しいため復元をスキップしました。`);
        return null;
      }

      switch (v) {
        case 0:
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
        case 6:
          // 旧バージョン: 現状は構造変更なしなのでそのまま通す。
          // v7でgameMode="cricket"とplayer.cricketMarks/cricketScoreを追加したが、
          // どちらも「無ければ未使用として扱われるだけ」の追加フィールドなので変換不要。
          // falls through
        case 7:
          // v7→v8: o1MaxRounds を maxRounds にリネーム。
          // クリケットにも同じラウンド上限設定を適用できるよう、01専用の名前を汎用化した。
          if (save.o1MaxRounds !== undefined && save.maxRounds === undefined) {
            save.maxRounds = save.o1MaxRounds;
          }
          // falls through
        case 8:
          // v8→v9: autoHandicap01/p1Rating/p2Rating/autoHandicapCricket/
          // manualCricketMarksP1/P2/manualCricketBonusP1/P2 を新規追加。
          // 旧セーブには存在しないが、handleRestoreSave側で未定義時のフォールバック
          // （off・レーティング6・マーク全0・ボーナス0）を用意しているため変換不要。
          break;
        default:
          break;
      }
      return save;
    };

    const handleRestoreSave = () => {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!raw) { setHasRestorableSave(false); return false; }
        const parsed = JSON.parse(raw);
        const d = migrateSaveData(parsed);
        if (!d) {
          // 未来バージョン等で復元拒否されたケース。データ自体は消さずに残す
          // （ユーザーがアプリを更新すれば読めるようになる可能性があるため）が、
          // 現行アプリでは復元できないのでボタンは引っ込める（押しても無反応のまま残るのを防ぐ）。
          setHasRestorableSave(false);
          playSound("burst");
          return false;
        }
        if (Date.now() - (d.savedAt || 0) > 86400000) {
          clearSavedGame();
          return false;
        }
        const restoredMode = ["01", "countup", "cricket"].includes(d.gameMode) ? d.gameMode : "01";
        const restoredPlayers =
          Array.isArray(d.players) && d.players.length === 2
            ? [
                sanitizeRestoredPlayer(d.players[0], "p1", "PLAYER 1"),
                sanitizeRestoredPlayer(d.players[1], "p2", "PLAYER 2"),
              ]
            : players;
        const restoredIndex = d.activePlayerIndex === 1 ? 1 : 0;
        const restoredThrows = Array.isArray(d.currentThrows)
          ? d.currentThrows.slice(0, MAX_THROWS_PER_TURN)
          : [];
        const restoredOutMode = normalizeOutMode(d.outMode ?? "single");
        let safeStage = ["throwing", "next", "gameover"].includes(
          d.confirmStage,
        )
          ? d.confirmStage
          : "throwing";
        if (safeStage === "gameover" && !d.winner) safeStage = "throwing";
        if (safeStage === "next" && restoredThrows.length === 0 && !d.winner)
          safeStage = "throwing";
        setGameMode(restoredMode);
        setPlayers(restoredPlayers);
        setActivePlayerIndex(restoredIndex);
        setCurrentThrowsImmediate(restoredThrows);
        setOutMode(restoredOutMode);
        setBullType(["separate", "fat"].includes(d.bullType) ? d.bullType : "separate");
        setTurnHistoryState(
          Array.isArray(d.turnHistoryState) ? d.turnHistoryState : [],
        );
        // editingThrowIndex / undoConfirmStage は復帰時に必ずリセット
        setConfirmStage(d.winner ? "gameover" : safeStage);
        setEditingThrowIndex(null);
        setUndoConfirmStage("idle");
        setPadMultiplier([1, 2, 3].includes(d.padMultiplier) ? d.padMultiplier : 1);
        setWinner(d.winner ?? null);
        setCheckoutPref(["double", "triple", "single"].includes(d.checkoutPref) ? d.checkoutPref : "double");
        setCuRounds(d.cuRounds ?? COUNT_UP_ROUNDS);
        setMaxRounds(d.maxRounds ?? null);
        setPlayerCount(d.playerCount ?? 2);
        setCpuMode(!!d.cpuMode);
        const safeDiff = ["easy","medium","hard","pro"].includes(d.cpuDifficulty) ? d.cpuDifficulty : "medium";
        setCpuDifficulty(safeDiff);
        const safeLang = ["ja","en"].includes(d.helpLang) ? d.helpLang : "ja"; // 旧セーブはjaをデフォルト
        setHelpLang(safeLang);
        setUndoConfirmStage("idle");
        if (d.players && d.players[0] && d.players[1]) {
          setP1StartScore(d.players[0].initialScore);
          setP2StartScore(d.players[1].initialScore);
        }
        // 01/クリケットのハンデ設定を復元。以前はここを復元していなかったため、
        // RESUME後にPLAY AGAIN/MENU→LEAVEすると既定値(AUTO・レーティング同値など)で
        // 再計算され、元のハンデ条件（手動501 vs 301、クリケットの手動マークなど）が
        // 消えてしまうバグがあった。旧セーブ(v8以前)にはこれらのフィールドが無いので、
        // 型・範囲を検証した上で安全なデフォルト値にフォールバックする。
        setAutoHandicap01(d.autoHandicap01 === "dl2" ? "dl2" : "off");
        setP1Rating(Number.isFinite(d.p1Rating) ? Math.min(17, Math.max(0, d.p1Rating)) : 6);
        setP2Rating(Number.isFinite(d.p2Rating) ? Math.min(17, Math.max(0, d.p2Rating)) : 6);
        setAutoHandicapCricket(d.autoHandicapCricket === "dl2" ? "dl2" : "off");
        const sanitizeCricketMarks = (m) => {
          const out = { 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, 25: 0 };
          if (m && typeof m === "object") {
            for (const k of Object.keys(out)) {
              if (Number.isFinite(m[k])) out[k] = Math.min(3, Math.max(0, m[k]));
            }
          }
          return out;
        };
        setManualCricketMarksP1(sanitizeCricketMarks(d.manualCricketMarksP1));
        setManualCricketMarksP2(sanitizeCricketMarks(d.manualCricketMarksP2));
        setManualCricketBonusP1(Number.isFinite(d.manualCricketBonusP1) ? Math.max(0, d.manualCricketBonusP1) : 0);
        setManualCricketBonusP2(Number.isFinite(d.manualCricketBonusP2) ? Math.max(0, d.manualCricketBonusP2) : 0);
        setHasRestorableSave(true);
        setShowSettingsSetup(false);
        return true;
      } catch (e) {
        // 壊れたJSON・想定外の構造などで例外発生 → セーブデータを削除し、
        // ボタンが「表示されるが押しても直らない」まま残らないようにする。
        clearSavedGame();
        playSound("burst");
        return false;
      }
    };

    const handleBackToMenuRequest = () => {
      if (
        players[0].history.length > 0 ||
        (playerCount >= 2 && players[1].history.length > 0) ||
        currentThrows.length > 0
      ) {
        playSound("click");
        setShowExitConfirm(true);
      } else {
        playSound("revert");
        setShowSettingsSetup(true);
      }
    };

    const handleLeaveToMenu = () => {
      cancelCpuTimer();
      playSound("revert");
      clearSavedGame();
      const p2Name = resolveP2Name(cpuMode, cpuDifficulty, players);
      const auto01b = computeAuto01Scores();
      const crSetupB = computeCricketSetup();
      setPlayers([
        makePlayer("p1", players[0].name.trim() || "PLAYER 1", auto01b.p1, crSetupB.p1.marks, crSetupB.p1.handicapCount, crSetupB.p1.bonus),
        makePlayer("p2", p2Name, auto01b.p2, crSetupB.p2.marks, crSetupB.p2.handicapCount, crSetupB.p2.bonus),
      ]);
      winnerRef.current = null;
      setActivePlayerIndex(0);
      setCurrentThrowsImmediate([]);
      setEditingThrowIndex(null);
      setPadMultiplier(1);
      setTurnHistoryState([]);
      setWinner(null);
      setConfirmStage("throwing");
      setUndoConfirmStage("idle");
      setShowExitConfirm(false);
      setShowQuitConfirm(false);
      setShowSettingsSetup(true);
    };

    // ─────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────
    return React.createElement(
      "div",
      {
        className:
          "min-h-[100dvh] w-full bg-[#050508] text-amber-100 flex flex-col justify-between select-none antialiased overflow-y-auto font-sans relative pb-8",
      },
      React.createElement("div", {
        className:
          "fixed inset-0 bg-gradient-to-b from-zinc-950 via-[#0a0a0f] to-[#040406] z-0 pointer-events-none",
      }),

      /* ── Header ──
         PWAとしてホーム画面から起動すると、standalone表示ではブラウザのUIが消えて
         ノッチ/Dynamic Island付近までコンテンツが伸びる。style="{paddingTop: ...}"で
         env(safe-area-inset-top)ぶんだけ余白を足し、ヘッダーが隠れないようにする
         （index.htmlのviewport-fit=coverと対で必要）。 */
      React.createElement(
        "header",
        {
          className:
            "relative z-30 border-b border-zinc-900/80 bg-[#09090c]/90 backdrop-blur-md px-3.5 py-2.5 flex items-center justify-between shrink-0 shadow-[0_8px_24px_rgba(0,0,0,0.3)]",
          style: { paddingTop: "calc(0.625rem + env(safe-area-inset-top))" },
        },
        React.createElement(
          "div",
          { className: "flex items-center space-x-2" },
          React.createElement(
            "div",
            {
              className:
                "w-6 h-6 rounded-full border border-amber-500/30 bg-neutral-950 flex items-center justify-center shadow-[0_0_14px_rgba(245,158,11,0.12)]",
            },
            React.createElement(
              "svg",
              {
                viewBox: "0 0 24 24",
                className: "w-3.5 h-3.5 text-amber-400",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "1.8",
                strokeLinecap: "round",
                strokeLinejoin: "round",
              },
              React.createElement("circle", {
                cx: "12",
                cy: "12",
                r: "7.5",
                opacity: "0.38",
              }),
              React.createElement("circle", {
                cx: "12",
                cy: "12",
                r: "3.5",
                opacity: "0.82",
              }),
              React.createElement("circle", {
                cx: "12",
                cy: "12",
                r: "1.3",
                fill: "currentColor",
                stroke: "none",
              }),
            ),
          ),
          React.createElement(
            "div",
            null,
            React.createElement(
              "h1",
              {
                className:
                  "text-[10px] font-black tracking-widest text-amber-400 leading-none uppercase",
              },
              "PUB DARTS CABIN",
            ),
            React.createElement(
              "p",
              {
                className:
                  "text-[7px] text-zinc-600 font-mono mt-0.5 tracking-wider uppercase",
              },
              gameMode === "countup"
                ? `COUNT-UP · ${cuRounds}R`
                : gameMode === "cricket"
                  ? "CRICKET · 15-20 & BULL"
                  : "Interactive Scorer",
            ),
          ),
        ),
        React.createElement(
          "div",
          { className: "flex items-center space-x-1" },
          React.createElement(
            "button",
            {
              onClick: () => setSoundEnabled(!soundEnabled),
              "aria-label": soundEnabled
                ? (helpLang === "ja" ? "ミュートにする" : "Mute sound")
                : (helpLang === "ja" ? "ミュートを解除する" : "Unmute sound"),
              className:
                "w-10 h-10 rounded-lg bg-[#141419] border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-amber-400 hover:border-amber-500/30 transition cursor-pointer",
            },
            soundEnabled
              ? React.createElement(
                  "span",
                  { className: "text-emerald-500" },
                  React.createElement(Icons.Volume2, null),
                )
              : React.createElement(
                  "span",
                  { className: "text-zinc-600" },
                  React.createElement(Icons.VolumeX, null),
                ),
          ),
          React.createElement(
            "button",
            {
              onClick: () => setShowHowTo(true),
              "aria-label": helpLang === "ja" ? "使い方を表示" : "Show how to play",
              className:
                "w-10 h-10 rounded-lg bg-[#141419] border border-zinc-800 flex items-center justify-center text-amber-500/80 hover:border-amber-500/30 transition cursor-pointer",
            },
            React.createElement(Icons.HelpCircle, null),
          ),
          React.createElement(
            "button",
            {
              onClick: handleBackToMenuRequest,
              className:
                "h-10 px-3 rounded-lg bg-[#141419] border border-zinc-800 flex items-center gap-1.5 text-[9px] font-bold text-zinc-400 hover:text-amber-400 hover:border-amber-500/30 transition cursor-pointer",
            },
            React.createElement(Icons.Settings, null),
            React.createElement("span", null, "MENU"),
          ),
        ),
      ),

      /* ── Main ── */
      React.createElement(
        "main",
        {
          className:
            "flex-grow flex flex-col lg:flex-row justify-center items-stretch relative z-10 p-2 md:p-4 gap-4 max-w-5xl mx-auto w-full",
          onClick: (e) => {
            if (editingThrowIndex === null) return;
            const t =
              e.target && typeof e.target.closest === "function"
                ? e.target
                : null;
            if (
              !(
                t &&
                t.closest('button,svg,input,label,[data-throw-slot="true"]')
              )
            )
              setEditingThrowIndex(null);
          },
        },

        React.createElement(
          "div",
          {
            className:
              "flex-grow flex flex-col justify-center items-center min-h-0 w-full lg:max-w-3xl relative",
          },

          /* ── アシストバー ── */
          React.createElement(
            "div",
            { className: "w-full px-2 py-1.5 mb-1 shrink-0 z-20" },
            editingThrowIndex !== null &&
              React.createElement(
                "div",
                { className: "flex items-center gap-1.5 px-3 pb-1" },
                React.createElement(
                  "span",
                  {
                    className:
                      "text-[9px] font-black text-sky-400 tracking-widest animate-pulse uppercase",
                  },
                  "✏ EDITING DART " +
                    (editingThrowIndex + 1) +
                    " — tap to overwrite",
                ),
              ),
            React.createElement(
              "div",
              {
                className: `flex items-center justify-center bg-zinc-950/70 border rounded-xl px-3 py-2.5 shadow-inner min-h-[42px] ${editingThrowIndex !== null ? "border-sky-500/60 shadow-[0_0_18px_rgba(56,189,248,0.12)]" : "border-zinc-800/80"}`,
              },
              React.createElement(
                "div",
                {
                  className: `assist-bar ${assistInfo.color}${assistInfo.pulse ? " assist-active" : ""} text-center tracking-[0.04em] overflow-hidden w-full`,
                },
                React.createElement(
                  "span",
                  {
                    className: "assist-line block text-center",
                    style: {
                      fontSize:
                        assistInfo.text && assistInfo.text.length > 28
                          ? "0.7rem"
                          : "",
                    },
                  },
                  assistInfo.text || "\u00A0",
                ),
              ),
            ),
          ),

          /* ── Board + Cockpits ── */
          React.createElement(
            "div",
            {
              className:
                "w-full flex flex-row items-center justify-center relative my-auto py-2 select-none gap-1 sm:gap-4",
            },
            React.createElement(
              "div",
              { className: "w-[28%] flex flex-col justify-center shrink-0" },
              React.createElement(PlayerCockpit, {
                player: players[0],
                displayScore: p1DisplayScore,
                isActive: activePlayerIndex === 0,
                isBust: !winner && isRoundBurst && activePlayerIndex === 0,
                alignment: "left",
                label: "P1 HIST",
                gameMode,
              }),
            ),

            /* Dart Board */
            React.createElement(
              "div",
              {
                className: `relative w-[42%] aspect-square flex items-center justify-center pointer-events-auto shrink-0 z-20 ${editingThrowIndex !== null ? "rounded-full ring-2 ring-sky-400/50 shadow-[0_0_28px_rgba(56,189,248,0.18)]" : ""}`,
              },
              React.createElement("div", {
                className:
                  "absolute inset-0 rounded-full bg-black/60 blur-md pointer-events-none transform translate-y-2 scale-[0.98]",
              }),
              React.createElement(
                "svg",
                {
                  ref: boardRef,
                  onClick: handleBoardClick,
                  onTouchStart: (e) => {
                    // 2本指以上（ピンチズームの開始）ならこのジェスチャー全体をタップ扱いしない。
                    // ズーム自体はブラウザのネイティブピンチズームに任せる（自前実装はしない）。
                    if (e.touches.length > 1) {
                      isMultiTouchRef.current = true;
                      touchStartPosRef.current = null;
                    } else if (e.touches.length === 1) {
                      // タップかスワイプ/ドラッグかを終了時に見分けるため、開始位置を記録する
                      touchStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                    }
                  },
                  onTouchMove: (e) => {
                    // タップ開始後に2本目の指が触れてもピンチ扱いにする（片手の指が後から追加されるケース）
                    if (e.touches.length > 1) {
                      isMultiTouchRef.current = true;
                      touchStartPosRef.current = null;
                    }
                  },
                  onTouchEnd: (e) => {
                    // タッチ操作の後、ブラウザは互換性のためclickイベントも合成して発火する。
                    // これを毎回ここで止めておかないと、tap/swipe/pinchのどのケースでも
                    // 直後にonClick(=handleBoardClick)が余分に呼ばれる可能性がある
                    // （スマホで「ダブルタップしたみたいになる」不具合の原因）。
                    e.preventDefault();
                    // まだ他の指が盤面に触れている、またはこのジェスチャーがピンチだった場合は
                    // 投擲として扱わない（ネイティブピンチズーム操作中に誤って点数が入るのを防ぐ）
                    if (e.touches.length > 0 || isMultiTouchRef.current) {
                      if (e.touches.length === 0) isMultiTouchRef.current = false;
                      touchStartPosRef.current = null;
                      return;
                    }
                    // ピンチではなく1本指の操作でも、指が一定距離動いていればタップではなく
                    // スワイプ/ドラッグ（盤面を眺めながら位置調整する動作等）とみなし、投擲扱いしない。
                    // ズームを禁止するのではなく、意図しない誤タップだけを弾く形にしている。
                    const start = touchStartPosRef.current;
                    touchStartPosRef.current = null;
                    if (start && e.changedTouches && e.changedTouches[0]) {
                      const dx = e.changedTouches[0].clientX - start.x;
                      const dy = e.changedTouches[0].clientY - start.y;
                      if (Math.hypot(dx, dy) > 12) return;
                    }
                    handleBoardClick(e);
                  },
                  viewBox: "-210 -210 420 420",
                  className:
                    "w-full h-full drop-shadow-[0_15px_30px_rgba(0,0,0,0.95)] overflow-visible cursor-crosshair",
                  // touch-action: "manipulation" は doubleタップズームだけを無効化し、
                  // ピンチズームとパンは許可する。誤ってダーツが刺さる問題は自前実装の
                  // ズーム機能で解決せず、タップ/スワイプ判定（上のonTouchEnd）側で対処している。
                  style: { touchAction: "manipulation" },
                },
                React.createElement(
                  "defs",
                  null,
                  React.createElement(
                    "filter",
                    {
                      id: "marker-glow",
                      x: "-50%",
                      y: "-50%",
                      width: "200%",
                      height: "200%",
                    },
                    React.createElement("feGaussianBlur", {
                      stdDeviation: "3",
                      result: "blur",
                    }),
                    React.createElement(
                      "feMerge",
                      null,
                      React.createElement("feMergeNode", { in: "blur" }),
                      React.createElement("feMergeNode", {
                        in: "SourceGraphic",
                      }),
                    ),
                  ),
                ),
                React.createElement("circle", {
                  r: "195",
                  fill: "#0c0c10",
                  stroke: "#1c1c24",
                  strokeWidth: "3",
                }),
                React.createElement("circle", {
                  r: "176",
                  fill: "none",
                  stroke: "#2c2c36",
                  strokeWidth: "0.8",
                }),
                React.createElement("circle", {
                  r: "154",
                  fill: "none",
                  stroke: "#2c2c36",
                  strokeWidth: "0.8",
                }),
                React.createElement("circle", {
                  r: "112",
                  fill: "none",
                  stroke: "#2c2c36",
                  strokeWidth: "0.8",
                }),
                React.createElement("circle", {
                  r: "90",
                  fill: "none",
                  stroke: "#2c2c36",
                  strokeWidth: "0.8",
                }),
                WEDGES.map((w, i) => {
                  const a = i * 18 - 90,
                    rs = ((a - 9) * Math.PI) / 180,
                    re = ((a + 9) * Math.PI) / 180,
                    ev = i % 2 === 0;
                  const ta = (a * Math.PI) / 180;
                  const bp = (r1, r2) => {
                    const x1 = r1 * Math.cos(rs), y1 = r1 * Math.sin(rs),
                      x2 = r2 * Math.cos(rs), y2 = r2 * Math.sin(rs),
                      x3 = r2 * Math.cos(re), y3 = r2 * Math.sin(re),
                      x4 = r1 * Math.cos(re), y4 = r1 * Math.sin(re);
                    return `M ${x1} ${y1} L ${x2} ${y2} A ${r2} ${r2} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${r1} ${r1} 0 0 0 ${x1} ${y1} Z`;
                  };
                  const tx = 185 * Math.cos(ta),
                    ty = 185 * Math.sin(ta);
                  // ── Cricket: 15-20/Bull以外は常に暗く沈める。対象ナンバーは
                  //    3マーク未満(オープン中)は白(シングル)/黄(ダブル・トリプル)、
                  //    自分（現在投げているプレイヤー）が3マーク到達したらプレイヤーカラーに
                  //    切り替え（シングル=薄い色、ダブル・トリプル=濃い色）てボーナス得点ゾーンを示す。
                  //    相手だけが先に3マーク到達している場合は相手の色に染める（急いで閉じないと
                  //    相手に加点され続けることを視覚的に警告する）。相手も含め全員が閉じたら暗く沈める。 ──
                  const isCricketNum = gameMode === "cricket" && CRICKET_TARGETS.includes(w);
                  // ── 01: 残りがあと1投で上がれる状態なら、該当セグメント（ダブル/トリプル）を
                  //    緑白く光らせる。アウト設定(outMode)によって有効なリングが変わる。 ──
                  const finish01 =
                    gameMode === "01" && !winner && confirmStage !== "gameover" && confirmStage !== "next"
                      ? finishTargets01.find((t) => t.num === w && (t.ring === "double" || t.ring === "triple" || t.ring === "single"))
                      : null;
                  const myMarksAll = activePlayerIndex === 0 ? p1CricketMarks : p2CricketMarks;
                  const oppMarksAll = activePlayerIndex === 0 ? p2CricketMarks : p1CricketMarks;
                  const myMarks = isCricketNum ? (myMarksAll[w] || 0) : 0;
                  const oppMarks = isCricketNum ? (oppMarksAll[w] || 0) : 0;
                  const deadForEveryone = isCricketNum && myMarks >= 3 && oppMarks >= 3;
                  const bonusOpen = isCricketNum && myMarks >= 3 && !deadForEveryone;
                  const opponentBonus = isCricketNum && !bonusOpen && oppMarks >= 3 && !deadForEveryone;
                  const stillOpen = isCricketNum && !bonusOpen && !opponentBonus && !deadForEveryone;
                  const dim = gameMode === "cricket" && (!isCricketNum || deadForEveryone);
                  const playerLight = activePlayerIndex === 0 ? "#bae6fd" : "#fecdd3";
                  const playerDark = activePlayerIndex === 0 ? "#0ea5e9" : "#e11d48";
                  const opponentLight = activePlayerIndex === 0 ? "#fecdd3" : "#bae6fd";
                  const opponentDark = activePlayerIndex === 0 ? "#e11d48" : "#0ea5e9";
                  const baseSingle = ev ? "#09090c" : "#eaeaea";
                  const baseBand = ev ? "#e11d48" : "#16a34a";
                  const singleFill = dim ? baseSingle : bonusOpen ? playerLight : opponentBonus ? opponentLight : stillOpen ? "#f5eede" : baseSingle;
                  const bandFill = dim ? baseBand : bonusOpen ? playerDark : opponentBonus ? opponentDark : stillOpen ? "#facc15" : baseBand;
                  return React.createElement(
                    "g",
                    { key: w },
                    React.createElement("path", {
                      d: bp(112, 154),
                      fill: singleFill,
                      stroke: "#222",
                      strokeWidth: "0.5",
                    }),
                    React.createElement("path", {
                      d: bp(22, 90),
                      fill: singleFill,
                      stroke: "#222",
                      strokeWidth: "0.5",
                    }),
                    React.createElement("path", {
                      d: bp(154, 176),
                      fill: bandFill,
                      stroke: "#222",
                      strokeWidth: "0.5",
                    }),
                    React.createElement("path", {
                      d: bp(90, 112),
                      fill: bandFill,
                      stroke: "#222",
                      strokeWidth: "0.5",
                    }),
                    // 01: あと1投で上がれるセグメントを緑白く光らせる（既存のfillは変えず上に重ねる）
                    finish01 && finish01.ring === "double" && React.createElement("path", {
                      d: bp(154, 176),
                      fill: "#ecfdf5",
                      opacity: 0.75,
                      stroke: "#4ade80",
                      strokeWidth: "1.2",
                      filter: "url(#marker-glow)",
                      className: "finish-target-glow",
                    }),
                    finish01 && finish01.ring === "triple" && React.createElement("path", {
                      d: bp(90, 112),
                      fill: "#ecfdf5",
                      opacity: 0.75,
                      stroke: "#4ade80",
                      strokeWidth: "1.2",
                      filter: "url(#marker-glow)",
                      className: "finish-target-glow",
                    }),
                    // シングルは盤面上に2箇所ある（ブルとトリプルの間の内側、トリプルとダブルの間の外側）。
                    // どちらに刺さってもシングルとして成立するので両方光らせる。
                    finish01 && finish01.ring === "single" && React.createElement("path", {
                      d: bp(112, 154),
                      fill: "#ecfdf5",
                      opacity: 0.75,
                      stroke: "#4ade80",
                      strokeWidth: "1.2",
                      filter: "url(#marker-glow)",
                      className: "finish-target-glow",
                    }),
                    finish01 && finish01.ring === "single" && React.createElement("path", {
                      d: bp(22, 90),
                      fill: "#ecfdf5",
                      opacity: 0.75,
                      stroke: "#4ade80",
                      strokeWidth: "1.2",
                      filter: "url(#marker-glow)",
                      className: "finish-target-glow",
                    }),
                    // 対象外 or 両者クローズ済み → 暗く沈める
                    dim && React.createElement("path", { d: bp(22, 176), fill: "#000", opacity: 0.6 }),
                    // マーク数を3つのドットで表示: P1のみ=青、P2のみ=赤、両方入っていれば紫
                    isCricketNum && (() => {
                      const p1mRaw = p1CricketMarks[w] || 0;
                      const p2mRaw = p2CricketMarks[w] || 0;
                      const dr = 165;
                      const dx = dr * Math.cos(ta), dy = dr * Math.sin(ta);
                      return React.createElement(
                        "g",
                        { transform: `translate(${dx},${dy}) rotate(${a + 90})` },
                        [0, 1, 2].map((di) => {
                          const p1has = p1mRaw > di;
                          const p2has = p2mRaw > di;
                          const fill = p1has && p2has ? "#a855f7" : p1has ? "#38bdf8" : p2has ? "#fb7185" : "rgba(0,0,0,0.3)";
                          return React.createElement("circle", {
                            key: di,
                            cx: (di - 1) * 10,
                            cy: 0,
                            r: 4.5,
                            fill,
                            stroke: "#111",
                            strokeWidth: 1,
                          });
                        }),
                      );
                    })(),
                    React.createElement(
                      "text",
                      {
                        x: tx,
                        y: ty,
                        textAnchor: "middle",
                        dominantBaseline: "central",
                        // 数字はボード外周(r=185)、実際の盤面(r<=176)の外側に浮いているので、
                        // 背景は常にページの暗色。以前はセグメント側の状態に合わせて暗い文字色
                        // (#292418)を使っていたため、暗い背景の上でほぼ見えなくなっていた。
                        // 常に明るい色＋薄いアウトラインにして、状態に関わらず視認性を確保する。
                        fill: dim ? "#71717a" : isCricketNum ? "#fafaf9" : "#f59e0b",
                        stroke: "#000",
                        strokeWidth: "2.5",
                        strokeOpacity: "0.5",
                        paintOrder: "stroke",
                        fontSize: "14",
                        fontWeight: "900",
                        transform: `rotate(${a + 90},${tx},${ty})`,
                      },
                      w,
                    ),
                  );
                }),
                (() => {
                  const myMarksAll = activePlayerIndex === 0 ? p1CricketMarks : p2CricketMarks;
                  const oppMarksAll = activePlayerIndex === 0 ? p2CricketMarks : p1CricketMarks;
                  const bullMyMarks = gameMode === "cricket" ? (myMarksAll[25] || 0) : 0;
                  const bullOppMarks = gameMode === "cricket" ? (oppMarksAll[25] || 0) : 0;
                  const bullDead = gameMode === "cricket" && bullMyMarks >= 3 && bullOppMarks >= 3;
                  const bullBonusOpen = gameMode === "cricket" && bullMyMarks >= 3 && !bullDead;
                  const bullOpponentBonus = gameMode === "cricket" && !bullBonusOpen && bullOppMarks >= 3 && !bullDead;
                  const bullStillOpen = gameMode === "cricket" && !bullBonusOpen && !bullOpponentBonus && !bullDead;
                  const playerLight = activePlayerIndex === 0 ? "#bae6fd" : "#fecdd3";
                  const playerDark = activePlayerIndex === 0 ? "#0ea5e9" : "#e11d48";
                  const opponentLight = activePlayerIndex === 0 ? "#fecdd3" : "#bae6fd";
                  const opponentDark = activePlayerIndex === 0 ? "#e11d48" : "#0ea5e9";
                  return React.createElement(
                    "g",
                    null,
                    React.createElement("circle", {
                      r: "22",
                      fill: bullBonusOpen ? playerLight : bullOpponentBonus ? opponentLight : bullStillOpen ? "#f5eede" : "#16a34a",
                      stroke: "#222",
                      strokeWidth: "0.5",
                    }),
                    React.createElement("circle", {
                      r: "8.5",
                      fill: bullBonusOpen ? playerDark : bullOpponentBonus ? opponentDark : bullStillOpen ? "#facc15" : "#e11d48",
                      stroke: "#222",
                      strokeWidth: "0.5",
                    }),
                    bullDead && React.createElement("circle", { r: 22, fill: "#000", opacity: 0.6 }),
                    // 01: Bullで上がれる場合の緑白ハイライト
                    finishTargets01.some((t) => t.ring === "bullOuter") && React.createElement("circle", {
                      r: 22, fill: "#ecfdf5", opacity: 0.75, stroke: "#4ade80", strokeWidth: "1.2",
                      filter: "url(#marker-glow)", className: "finish-target-glow",
                    }),
                    finishTargets01.some((t) => t.ring === "bullInner") && React.createElement("circle", {
                      r: 8.5, fill: "#ecfdf5", opacity: 0.75, stroke: "#4ade80", strokeWidth: "1.2",
                      filter: "url(#marker-glow)", className: "finish-target-glow",
                    }),
                    gameMode === "cricket" && (() => {
                      const p1mRaw = p1CricketMarks[25] || 0;
                      const p2mRaw = p2CricketMarks[25] || 0;
                      return React.createElement(
                        "g",
                        { transform: "translate(0,34)" },
                        [0, 1, 2].map((di) => {
                          const p1has = p1mRaw > di;
                          const p2has = p2mRaw > di;
                          const fill = p1has && p2has ? "#a855f7" : p1has ? "#38bdf8" : p2has ? "#fb7185" : "rgba(0,0,0,0.3)";
                          return React.createElement("circle", {
                            key: di,
                            cx: (di - 1) * 10,
                            cy: 0,
                            r: 4.5,
                            fill,
                            stroke: "#111",
                            strokeWidth: 1,
                          });
                        }),
                      );
                    })(),
                  );
                })(),
                /* ダーツマーカー: 何投目かが一目でわかるよう色分け（①青 ②緑 ③赤）+ 番号ラベル。
                   編集中(タップして上書き対象に選んだ状態)は色ではなく金色の縁取りで示す
                   （色を編集中の意味に使うと、投数の色分けと衝突するため役割を分けた）。 */
                currentThrows.map((t, idx) => {
                  const isFocused = idx === editingThrowIndex;
                  const isLast = idx === currentThrows.length - 1;
                  const THROW_COLORS = ["#3b82f6", "#22c55e", "#ef4444"]; // 1投目/2投目/3投目
                  const THROW_LABELS = ["①", "②", "③"];
                  const fill = THROW_COLORS[idx] || "#f59e0b";
                  const r = isFocused ? 9 : isLast ? 8 : 7;
                  const sw = isFocused ? 3 : 2;
                  return React.createElement(
                    "g",
                    { key: idx },
                    React.createElement("circle", {
                      cx: t.x,
                      cy: t.y,
                      r,
                      fill,
                      stroke: isFocused ? "#fde047" : "white",
                      strokeWidth: sw,
                      filter: "url(#marker-glow)",
                      className: "transition-all duration-150",
                    }),
                    React.createElement(
                      "text",
                      {
                        x: t.x,
                        y: t.y,
                        textAnchor: "middle",
                        dominantBaseline: "central",
                        fontSize: "8",
                        fontWeight: "900",
                        fill: "white",
                        style: { pointerEvents: "none" },
                      },
                      THROW_LABELS[idx] || String(idx + 1),
                    ),
                  );
                }),
              ),
              /* Corner buttons removed - using action bar below */
            ),

            (playerCount >= 2 || cpuMode) && React.createElement(
              "div",
              { className: "w-[28%] flex flex-col justify-center shrink-0" },
              React.createElement(PlayerCockpit, {
                player: players[1],
                displayScore: p2DisplayScore,
                isActive: activePlayerIndex === 1,
                isBust: !winner && isRoundBurst && activePlayerIndex === 1,
                alignment: "right",
                label: cpuMode ? "CPU" : "P2 HIST",
                gameMode,
                isCpuPending: cpuMode && isCpuTurn,
              }),
            ),
          ),

          /* ── アクションバー（ミス + 操作系）。PREVは「前ターンを丸ごと戻す」で
             MISS/UNDO/CLEARとは意味も影響範囲も大きく違うため、間にgapと縦の区切り線を入れて
             視覚的にも分離する（誤操作防止のレビュー指摘への対応）。 ── */
          React.createElement(
            "div",
            { className: "w-full max-w-sm mt-2 flex gap-2.5 relative z-20" },
            React.createElement(
              "div",
              { className: "flex-1 flex gap-1.5" },
              React.createElement(
                "button",
                {
                  className: "action-bar-btn ab-miss",
                  onClick: () => handleKeypadTap(0),
                  disabled: winner || isCpuTurn || confirmStage === "next" || confirmStage === "gameover" || (!canAddMoreThrows && editingThrowIndex === null),
                  title: "Miss",
                },
                React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" },
                  React.createElement("circle", { cx: "12", cy: "12", r: "9", opacity: "0.35" }),
                  React.createElement("line", { x1: "8", y1: "8", x2: "16", y2: "16" }),
                  React.createElement("line", { x1: "16", y1: "8", x2: "8", y2: "16" }),
                ),
                React.createElement("span", null, "MISS"),
              ),
              React.createElement(
                "button",
                {
                  className: "action-bar-btn ab-undo",
                  onClick: handleUndoSingleDart,
                  disabled: currentThrows.length === 0 || confirmStage === "next" || confirmStage === "gameover",
                  title: "Undo last dart",
                },
                React.createElement(Icons.Undo2, null),
                React.createElement("span", null, "UNDO"),
              ),
              React.createElement(
                "button",
                {
                  className: "action-bar-btn ab-clear",
                  onClick: handleFlushRound,
                  disabled: (currentThrows.length === 0 && confirmStage !== "next") || confirmStage === "gameover",
                  title: "Clear turn",
                },
                React.createElement(Icons.Trash2, null),
                React.createElement("span", null, "CLEAR"),
              ),
            ),
            React.createElement("div", { className: "w-px my-1 bg-zinc-700/50 shrink-0" }), // MISS/UNDO/CLEAR と PREV を区切る縦線
            React.createElement(
              "button",
              {
                className: `action-bar-btn ab-prev shrink-0 !flex-none w-24${undoConfirmStage === "confirm" ? " pulsing" : ""}`,
                onClick: handleUndoCommittedTurn,
                disabled: turnHistoryState.length === 0 || !!winner || confirmStage === "gameover",
                title: "Undo previous turn",
              },
              React.createElement(Icons.RotateCcw, null),
              React.createElement("span", null, undoConfirmStage === "confirm" ? "SURE?" : "PREV TURN"),
            ),
          ),

          /* ── Throw Slots + Round Sum ── */
          React.createElement(
            "div",
            {
              className:
                "w-full max-w-sm mt-1.5 soft-metal score-slot p-2 rounded-xl border border-zinc-800/90 flex justify-between items-center relative z-20 shadow-[0_8px_20px_rgba(0,0,0,0.25)]",
            },
            React.createElement(
              "div",
              { className: "flex gap-1.5" },
              [0, 1, 2].map((idx) => {
                const t = currentThrows[idx],
                  focused = editingThrowIndex === idx;
                return React.createElement(
                  "div",
                  {
                    key: idx,
                    "data-throw-slot": "true",
                    onClick: () => {
                      if (focused) {
                        setEditingThrowIndex(null);
                        playSound("click");
                      } else if (t) {
                        setEditingThrowIndex(idx);
                        playSound("click");
                      }
                    },
                    className: `w-14 h-10 rounded-lg flex flex-col justify-center items-center font-mono cursor-pointer transition-all ${focused ? "bg-sky-500/20 border-2 border-sky-300 text-sky-200 shadow-[0_0_14px_rgba(56,189,248,0.35)] scale-[1.03]" : t ? "bg-[#18181f] border border-amber-500/30 text-white" : "bg-black/40 border border-zinc-800 text-zinc-700"}`,
                  },
                  React.createElement(
                    "span",
                    {
                      className:
                        "text-[7px] block text-zinc-500 uppercase leading-none mb-0.5",
                    },
                    "Dart ",
                    idx + 1,
                  ),
                  React.createElement(
                    "span",
                    { className: "text-sm font-black" },
                    t ? t.label : "-",
                  ),
                );
              }),
            ),
            React.createElement(
              "div",
              { className: "text-right pr-1" },
              React.createElement(
                "span",
                {
                  className:
                    "text-[7px] text-zinc-500 block uppercase font-bold tracking-wider leading-none mb-0.5",
                },
                gameMode === "countup" || gameMode === "cricket" ? "Round Pts" : "Round Sum",
              ),
              React.createElement(
                "span",
                {
                  className: `text-lg font-black font-mono leading-none ${isRoundBurst ? "line-through text-rose-500" : "text-amber-400"}`,
                },
                isRoundBurst ? "BUST" : currentRoundSubtotal,
              ),
            ),
          ),
        ),

        /* ── Keypad Panel ── */
        React.createElement(
          "div",
          {
            className:
              "w-full lg:w-[410px] shrink-0 flex flex-col justify-center relative z-20",
          },
          React.createElement(
            "div",
            {
              className:
                "w-full mt-2 soft-metal panel-glow p-3 rounded-2xl border border-zinc-800/90 backdrop-blur-md",
            },
            React.createElement(
              "div",
              { className: "grid grid-cols-12 gap-2.5" },
              React.createElement(
                "div",
                { className: "col-span-9 flex flex-col gap-3" },
                React.createElement(
                  "div",
                  {
                    className:
                      "grid grid-cols-3 gap-1.5 p-1 bg-black/40 rounded-xl border border-zinc-800",
                  },
                  [
                    ["S", "Single", 1, "py-2 rounded-lg font-black uppercase cursor-pointer transition-all border"],
                    ["D", "Double", 2, "py-2 rounded-lg font-black uppercase cursor-pointer transition-all border"],
                    ["T", "Triple", 3, "py-2 rounded-lg font-black uppercase cursor-pointer transition-all border"],
                  ].map(([prefix, lbl, m, cls]) =>
                    React.createElement(
                      "button",
                      {
                        key: m,
                        onClick: () => {
                          playSound("click");
                          setPadMultiplier(m);
                        },
                        className: `${cls} ${padMultiplier === m ? (m === 1 ? "bg-amber-500 border-amber-400 text-black shadow-[0_3px_8px_rgba(245,158,11,0.2)] translate-y-[-1px]" : m === 2 ? "bg-rose-600 border-rose-500 text-white shadow-[0_3px_8px_rgba(225,29,72,0.25)] translate-y-[-1px]" : "bg-emerald-600 border-emerald-500 text-white shadow-[0_3px_8px_rgba(16,185,129,0.25)] translate-y-[-1px]") : "bg-transparent text-zinc-500 border-transparent active:translate-y-0.5"}`,
                      },
                      React.createElement("div", { className: "flex flex-col items-center leading-tight gap-0" },
                        React.createElement("span", { className: "text-[15px] font-black leading-none" }, prefix),
                        React.createElement("span", { className: "text-[7px] font-bold opacity-70 leading-tight" }, lbl),
                      ),
                    ),
                  ),
                ),
                React.createElement(
                  "div",
                  { className: "flex flex-col gap-2" },
                  React.createElement(
                    "div",
                    {
                      className:
                        "grid grid-cols-6 gap-1.5 bg-amber-500/5 p-1.5 rounded-xl border border-amber-500/10",
                    },
                    [20, 19, 18, 17, 16, 15].map((n) => {
                      // 01: 現在選択中の倍率(S/D/T)でこの数字を打てば上がれる場合はハイライトする
                      const ringForMult = padMultiplier === 2 ? "double" : padMultiplier === 3 ? "triple" : "single";
                      const isFinishKey =
                        gameMode === "01" && !winner && confirmStage !== "gameover" && confirmStage !== "next" &&
                        finishTargets01.some((t) => t.num === n && t.ring === ringForMult);
                      return React.createElement(
                        "button",
                        {
                          key: n,
                          onClick: () => handleKeypadTap(n),
                          className:
                            `w-11 h-11 md:w-[52px] md:h-[52px] rounded-xl flex items-center justify-center font-black font-mono text-sm md:text-base active:translate-y-0.5 transition-all cursor-pointer ${
                              isFinishKey
                                ? "bg-emerald-950/60 border-2 border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(74,222,128,0.5)]"
                                : "bg-zinc-950 border border-amber-500/25 text-amber-300 hover:border-amber-400 shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
                            }`,
                        },
                        n,
                      );
                    }),
                  ),
                  gameMode !== "cricket" && React.createElement(
                    "div",
                    {
                      className:
                        "grid grid-cols-5 gap-1.5 justify-items-center",
                    },
                    [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map(
                      (n) => {
                        const ringForMult = padMultiplier === 2 ? "double" : padMultiplier === 3 ? "triple" : "single";
                        const isFinishKey =
                          n !== 0 && gameMode === "01" && !winner && confirmStage !== "gameover" && confirmStage !== "next" &&
                          finishTargets01.some((t) => t.num === n && t.ring === ringForMult);
                        return React.createElement(
                          "button",
                          {
                            key: n,
                            onClick: () => handleKeypadTap(n),
                            className: `w-11 h-11 md:w-[52px] md:h-[52px] rounded-xl flex items-center justify-center font-black font-mono text-sm md:text-base active:translate-y-0.5 transition-all cursor-pointer shadow-[0_4px_10px_rgba(0,0,0,0.5)] border ${
                              isFinishKey
                                ? "bg-emerald-950/60 border-2 border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(74,222,128,0.5)]"
                                : n === 0 ? "bg-[#18181f] border-rose-900/60 text-rose-400 hover:bg-[#23232b]" : "bg-zinc-950 border-zinc-800 text-zinc-200 hover:border-zinc-500"
                            }`,
                          },
                          n,
                        );
                      },
                    ),
                  ),
                ),
              ),
              React.createElement(
                "div",
                {
                  className:
                    "col-span-3 flex flex-col justify-between gap-2 self-stretch",
                },
                React.createElement(
                  "button",
                  {
                    onClick: () => handleKeypadTap(25, 1, "outer"),
                    className:
                      `flex-1 rounded-xl font-mono font-black uppercase border-2 flex flex-col justify-center items-center gap-1 active:translate-y-0.5 transition-all cursor-pointer bg-zinc-950 text-[#16a34a] hover:bg-emerald-950/20 shadow-[0_4px_10px_rgba(0,0,0,0.4)] ${
                        gameMode === "01" && !winner && confirmStage !== "gameover" && confirmStage !== "next" &&
                        finishTargets01.some((t) => t.ring === "bullOuter")
                          ? "border-emerald-300 shadow-[0_0_10px_rgba(74,222,128,0.5)]"
                          : "border-[#16a34a]"
                      }`,
                    title:
                      bullType === "fat" ? "Outer Bull 50" : "Outer Bull 25",
                  },
                  React.createElement(
                    "span",
                    { className: "w-9 h-9 flex items-center justify-center" },
                    React.createElement(
                      "svg",
                      {
                        viewBox: "0 0 40 40",
                        className: "w-9 h-9",
                        fill: "none",
                      },
                      React.createElement("circle", {
                        cx: "20",
                        cy: "20",
                        r: "14.5",
                        fill: "currentColor",
                        stroke: "none",
                        opacity: "0.90",
                      }),
                      React.createElement("circle", {
                        cx: "20",
                        cy: "20",
                        r: "7.2",
                        fill: "#09090c",
                        stroke: "none",
                      }),
                    ),
                  ),
                  React.createElement(
                    "span",
                    {
                      className:
                        "leading-tight text-xs font-black tracking-tight",
                    },
                    "OUT",
                    React.createElement("br", null),
                    "BULL",
                  ),
                  React.createElement(
                    "span",
                    { className: "text-base font-black text-zinc-200" },
                    bullType === "fat" ? "50" : "25",
                  ),
                ),
                React.createElement(
                  "button",
                  {
                    onClick: () => handleKeypadTap(25, 2, "inner"),
                    className:
                      `flex-1 rounded-xl font-mono font-black uppercase border flex flex-col justify-center items-center gap-1 active:translate-y-0.5 transition-all cursor-pointer bg-zinc-950 text-rose-400 hover:bg-rose-950/20 shadow-[0_4px_10px_rgba(0,0,0,0.4)] ${
                        gameMode === "01" && !winner && confirmStage !== "gameover" && confirmStage !== "next" &&
                        finishTargets01.some((t) => t.ring === "bullInner")
                          ? "border-2 border-emerald-300 shadow-[0_0_10px_rgba(74,222,128,0.5)]"
                          : "border-rose-900/70"
                      }`,
                    title: "Inner Bull 50",
                  },
                  React.createElement(
                    "span",
                    { className: "w-9 h-9 flex items-center justify-center" },
                    React.createElement(
                      "svg",
                      {
                        viewBox: "0 0 40 40",
                        className: "w-9 h-9",
                        fill: "none",
                        stroke: "currentColor",
                        strokeWidth: "2.2",
                      },
                      React.createElement("circle", {
                        cx: "20",
                        cy: "20",
                        r: "14.5",
                        opacity: "0.28",
                      }),
                      React.createElement("circle", {
                        cx: "20",
                        cy: "20",
                        r: "6.8",
                        fill: "currentColor",
                        stroke: "none",
                        opacity: "0.96",
                      }),
                    ),
                  ),
                  React.createElement(
                    "span",
                    {
                      className:
                        "leading-tight text-xs font-black tracking-tight",
                    },
                    "INNER",
                    React.createElement("br", null),
                    "BULL",
                  ),
                  React.createElement(
                    "span",
                    { className: "text-base font-black text-zinc-200" },
                    "50",
                  ),
                ),
              ),
            ),
            React.createElement(
              "div",
              { className: "mt-4 pt-3 border-t border-zinc-800 space-y-2" },
              isRoundBurst &&
                React.createElement(
                  "div",
                  { className: "w-full py-2 rounded-xl bg-rose-950/60 border border-rose-500/60 text-center" },
                  React.createElement("span", { className: "text-rose-400 font-black text-xs tracking-wider" }, "💥 BUST"),
                ),
              React.createElement(
                "button",
                {
                  onClick: handleCommitRound,
                  disabled: currentThrows.length === 0 && confirmStage !== "next",
                  className: `w-full py-4 rounded-2xl font-fliqlo font-black text-sm tracking-[0.18em] uppercase transition-all duration-200 border cursor-pointer ${
                    currentThrows.length === 0 && confirmStage !== "next"
                      ? "bg-zinc-800 border-zinc-700 text-zinc-600 cursor-not-allowed opacity-50"
                      : confirmStage === "next"
                        ? "bg-emerald-600 border-emerald-500 text-white shadow-[0_8px_20px_rgba(16,185,129,0.25)]"
                        : "bg-gradient-to-r from-amber-400 to-amber-500 border-amber-300 text-black shadow-[0_8px_20px_rgba(245,158,11,0.18)]"
                  }`,
                },
                confirmStage === "next" ? "NEXT  →" : "OK",
              ),
              React.createElement(
                "p",
                { className: "text-center text-[9px] font-bold text-zinc-600 tracking-wide" },
                currentThrows.length === 0 && confirmStage !== "next"
                  ? "Enter a throw to continue"
                  : confirmStage === "next"
                    ? "Continue to the next turn"
                    : "Commit this turn's score",
              ),
            ),
          ),
        ),
      ),

      /* ── GAME SETUP Modal ── */
      showSettingsSetup &&
        React.createElement(
          "div",
          {
            className:
              "fixed inset-0 z-50 bg-black/92 backdrop-blur-xl flex items-end sm:items-center justify-center p-3 sm:p-5",
          },
          React.createElement(
            "div",
            {
              className:
                "setup-card w-full max-w-sm rounded-3xl sm:rounded-2xl overflow-hidden",
            },
            /* Header */
            React.createElement(
              "div",
              {
                className:
                  "flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/5",
              },
              React.createElement(
                "div",
                null,
                React.createElement(
                  "div",
                  { className: "flex items-center gap-2 mb-0.5" },
                  React.createElement(
                    "span",
                    { className: "text-amber-400 text-base" },
                    "🎯",
                  ),
                  React.createElement(
                    "h2",
                    {
                      className:
                        "text-xs font-black tracking-[0.15em] text-amber-400 uppercase",
                    },
                    "GAME SETUP",
                  ),
                ),
                React.createElement(
                  "p",
                  {
                    className:
                      "text-[9px] text-zinc-600 font-mono tracking-wider pl-6",
                  },
                  "Mode / Players / Rules",
                ),
              ),
              players[0].history.length > 0 &&
                React.createElement(
                  "button",
                  {
                    onClick: () => {
                      playSound("revert");
                      setShowSettingsSetup(false);
                    },
                    className:
                      "w-7 h-7 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white cursor-pointer transition",
                  },
                  React.createElement(Icons.X, null),
                ),
            ),

            React.createElement(
              "div",
              {
                className:
                  "p-5 space-y-5 overflow-y-auto max-h-[75vh] no-scrollbar",
              },

              /* ── ① プレイヤー数（1P/2P/CPU + 名前 + CPU難易度） ── */
              React.createElement("div", { className: "space-y-3" },
                React.createElement("p", { className: "setup-section-label" }, "PLAYERS"),

                React.createElement("div", { className: "grid grid-cols-3 gap-1.5" },
                  [[1,"👤 1P"],[2,"👥 2P"]].map(([n,lbl]) =>
                    React.createElement("button", {
                      key: n,
                      onClick: () => {
                        playSound("click");
                        setPlayerCount(n);
                        setCpuMode(false);
                        // CPU対戦後にplayers[1].nameへ"CPU (MEDIUM)"のようなラベルが
                        // 実データとして残っているケースがある（CPU対戦を一度開始すると
                        // makePlayerで保存されるため）。1P/2Pへの切り替え時にCPUラベルの
                        // 残骸をクリアしないと、名前入力欄にそのまま表示されてしまう
                        // （以前の"---"漏れバグと同じパターン）。
                        setPlayers(ps => {
                          if (ps[1] && /^CPU \(/.test(ps[1].name)) {
                            const u = [...ps];
                            u[1] = { ...u[1], name: "" };
                            return u;
                          }
                          return ps;
                        });
                      },
                      className: `setup-toggle-btn py-2.5 ${playerCount === n && !cpuMode ? "setup-toggle-active" : "setup-toggle-inactive"}`,
                    }, lbl)
                  ),
                  React.createElement("button", {
                    onClick: () => { playSound("click"); setCpuMode(c=>!c); if(!cpuMode) setPlayerCount(2); },
                    className: `setup-toggle-btn py-2.5 ${cpuMode ? "setup-toggle-active" : "setup-toggle-inactive"}`,
                  }, "🤖 CPU"),
                ),

                /* CPU難易度（CPU ONの時だけ） */
                cpuMode && React.createElement("div", { className: "space-y-1" },
                  React.createElement("div", { className: "grid grid-cols-4 gap-1.5" },
                    [["easy","EASY"],["medium","MED"],["hard","HARD"],["pro","PRO"]].map(([d,lbl]) =>
                      React.createElement("button", {
                        key: d,
                        onClick: () => { playSound("click"); setCpuDifficulty(d); },
                        className: `setup-toggle-btn py-2 ${cpuDifficulty===d?"setup-toggle-active":"setup-toggle-inactive"}`,
                      }, lbl)
                    ),
                  ),
                  React.createElement(
                    "p",
                    { className: "text-[8px] text-zinc-600 font-bold text-center" },
                    {
                      easy: "Casual — misses often, easy to beat",
                      medium: "Steady — solid but not sharp",
                      hard: "Accurate — punishes mistakes",
                      pro: "Tight finishes — rarely misses checkouts",
                    }[cpuDifficulty],
                  ),
                ),

                /* 名前入力（P2はCPUのとき非表示） */
                React.createElement("div", { className: `grid gap-2 ${(!cpuMode && playerCount>=2) ? "grid-cols-2" : "grid-cols-1"}` },
                  [0, 1].filter(i => i===0 || (!cpuMode && playerCount>=2)).map(i =>
                    React.createElement("input", {
                      key: i,
                      type: "text", maxLength: 10,
                      value: players[i].name,
                      onChange: e => { const u=[...players]; u[i]={...u[i],name:e.target.value.toUpperCase()}; setPlayers(u); },
                      className: "w-full bg-black/60 border border-zinc-700/60 rounded-lg px-2 py-2 text-sm text-amber-200 outline-none uppercase font-black text-center tracking-wider focus:border-amber-500/50 transition",
                      placeholder: `P${i+1} NAME`,
                    })
                  ),
                ),
              ),

              /* ── ② クイックスタート（1P/2P/CPUの選択はそのまま・進行中の対戦がない時だけ表示） ── */
              players[0].history.length === 0 &&
                !(playerCount >= 2 && players[1] && players[1].history.length > 0) &&
                React.createElement(
                  "div",
                  { className: "space-y-1.5" },
                  React.createElement("p", { className: "setup-section-label" }, "QUICK START"),
                  React.createElement(
                    "div",
                    { className: "grid grid-cols-3 gap-2" },
                    [
                      ["01", "501", "⚡", "Open Out"],
                      ["cricket", "CRICKET", "🎯", "No Handicap"],
                      ["countup", "COUNT-UP", "📈", `${COUNT_UP_ROUNDS} Rounds`],
                    ].map(([mode, label, icon, caption]) =>
                      React.createElement(
                        "button",
                        {
                          key: mode,
                          onClick: () => handleQuickStart(mode),
                          className:
                            "py-2.5 rounded-2xl bg-gradient-to-r from-zinc-900 to-zinc-900/60 border border-amber-500/30 flex flex-col items-center justify-center gap-0.5 cursor-pointer hover:border-amber-500/60 transition",
                        },
                        React.createElement(
                          "span",
                          { className: "flex items-center gap-1.5" },
                          React.createElement("span", { className: "text-xs" }, icon),
                          React.createElement(
                            "span",
                            { className: "text-[10px] font-black tracking-wider text-amber-300 uppercase" },
                            label,
                          ),
                        ),
                        React.createElement(
                          "span",
                          { className: "text-[8px] text-zinc-600 font-bold" },
                          caption,
                        ),
                      )
                    ),
                  ),
                ),

              /* ── ③ ゲーム選択 ── */
              React.createElement(
                "div",
                { className: "space-y-2" },
                React.createElement("p", { className: "setup-section-label" }, "GAME MODE"),
                React.createElement(
                  "div",
                  { className: "grid grid-cols-3 gap-2" },
                  [
                    ["01", "01 GAME", "🎯"],
                    ["cricket", "CRICKET", "🏏"],
                    ["countup", "COUNT-UP", "📈"],
                  ].map(([m, lbl, ico]) =>
                    React.createElement(
                      "button",
                      {
                        key: m,
                        onClick: () => { playSound("click"); setGameMode(m); },
                        className: `setup-toggle-btn flex items-center justify-center gap-1.5 py-3 ${gameMode === m ? "setup-toggle-active" : "setup-toggle-inactive"}`,
                      },
                      React.createElement("span", null, ico),
                      React.createElement("span", null, lbl),
                    ),
                  ),
                ),
              ),

              /* ── ④ ラウンド数・BULL・OUT設定（+ 01/クリケットの持ち点・ハンデ） ── */
              React.createElement(
                "div",
                { className: "space-y-3" },
                React.createElement("p", { className: "setup-section-label" }, "RULES"),

                /* 01: 持ち点PRESET（両者共通） */
                gameMode === "01" && React.createElement("div", { className: "space-y-1" },
                  React.createElement("p", { className: "text-[8px] text-zinc-600 font-bold tracking-widest" }, "SCORE"),
                  React.createElement("div", { className: "grid grid-cols-5 gap-1.5" },
                    [301, 501, 701, 901, 1101].map(s =>
                      React.createElement("button", {
                        key: s,
                        onClick: () => { playSound("click"); setP1StartScore(s); setP2StartScore(s); },
                        className: `setup-toggle-btn text-[11px] px-1 ${p1StartScore===s&&p2StartScore===s?"setup-toggle-active":"setup-toggle-inactive"}`,
                      }, s)
                    ),
                  ),
                ),

                /* 01: オートハンデ(DARTSLIVE2準拠)。対戦相手がいない1Pソロ時は意味がないため非表示 */
                gameMode === "01" && playerCount !== 1 && React.createElement("div", { className: "space-y-1.5" },
                  React.createElement("div", {
                    className: "slide-track",
                    onClick: () => { playSound("click"); setAutoHandicap01(m => m === "off" ? "dl2" : "off"); },
                  },
                    React.createElement("div", { className: `slide-thumb ${autoHandicap01==="dl2"?"left":"right"}` }),
                    React.createElement("button", { className: `slide-opt ${autoHandicap01==="dl2"?"active":"inactive"}` }, "AUTO (DL2)"),
                    React.createElement("button", { className: `slide-opt ${autoHandicap01==="off"?"active":"inactive"}` }, "MANUAL"),
                  ),
                  autoHandicap01 === "off" && React.createElement("div", { className: "grid grid-cols-2 gap-2 pt-1" },
                    [["P1", p1StartScore, setP1StartScore], [cpuMode ? "CPU" : "P2", p2StartScore, setP2StartScore]].map(([label, score, setScore]) =>
                      React.createElement("div", { key: label, className: "flex items-center justify-between gap-1" },
                        React.createElement("span", { className: "text-[8px] text-zinc-600 font-bold" }, label),
                        React.createElement("button", {
                          onClick: () => { playSound("click"); setScore(p=>Math.max(11,p-10)); },
                          className: "setup-score-btn flex-1 text-xs",
                        }, "－"),
                        React.createElement("span", { className: "text-sm font-black font-mono text-white tabular-nums w-12 text-center" }, score),
                        React.createElement("button", {
                          onClick: () => { playSound("click"); setScore(p=>Math.min(999,p+10)); },
                          className: "setup-score-btn flex-1 text-xs",
                        }, "＋"),
                      )
                    ),
                  ),
                  autoHandicap01 === "dl2" && (() => {
                    const diff = Math.abs(p1Rating - p2Rating);
                    const auto = computeAuto01Scores();
                    const baseOk = DARTSLIVE2_01_BASE_SCORES.includes(p1StartScore);
                    return React.createElement("div", { className: "space-y-2 pt-1" },
                      !baseOk && React.createElement(
                        "p",
                        { className: "text-[8px] text-rose-400 font-bold text-center" },
                        "Choose 301/501/701 above (DL2 table only supports these scores)",
                      ),
                      React.createElement("div", { className: "grid grid-cols-2 gap-2" },
                        [["P1", p1Rating, setP1Rating, auto.p1], ["P2", p2Rating, setP2Rating, auto.p2]].map(([label, rating, setRating, actual]) =>
                          React.createElement("div", { key: label, className: "space-y-1" },
                            React.createElement("div", { className: "flex items-center justify-between gap-1" },
                              React.createElement("span", { className: "text-[8px] text-zinc-600 font-bold" }, `${label} RT`),
                              React.createElement("button", {
                                onClick: () => { playSound("click"); setRating(r => Math.max(0, r - 1)); },
                                className: "setup-score-btn flex-1 text-xs",
                              }, "－"),
                              React.createElement("span", { className: "text-sm font-black font-mono text-white tabular-nums w-10 text-center" }, rating),
                              React.createElement("button", {
                                onClick: () => { playSound("click"); setRating(r => Math.min(17, r + 1)); },
                                className: "setup-score-btn flex-1 text-xs",
                              }, "＋"),
                            ),
                            React.createElement("p", { className: "text-[8px] text-amber-500/80 font-bold text-center" }, `→ ${actual}`),
                          )
                        ),
                      ),
                      React.createElement("p", { className: "text-[8px] text-zinc-600 text-center" }, `Rating diff ${diff}`),
                    );
                  })(),
                ),

                /* クリケット: ハンデ（手動 or DL2オート）。1Pソロ時は非表示 */
                gameMode === "cricket" && playerCount !== 1 && React.createElement("div", { className: "space-y-1.5" },
                  React.createElement("div", {
                    className: "slide-track",
                    onClick: () => { playSound("click"); setAutoHandicapCricket(m => m === "off" ? "dl2" : "off"); },
                  },
                    React.createElement("div", { className: `slide-thumb ${autoHandicapCricket==="dl2"?"left":"right"}` }),
                    React.createElement("button", { className: `slide-opt ${autoHandicapCricket==="dl2"?"active":"inactive"}` }, "AUTO (DL2)"),
                    React.createElement("button", { className: `slide-opt ${autoHandicapCricket==="off"?"active":"inactive"}` }, "MANUAL"),
                  ),
                  autoHandicapCricket === "off" && (() => {
                    const stepBtn = (onClick, variant) =>
                      React.createElement("button", {
                        onClick: () => { playSound("click"); onClick(); },
                        className:
                          variant === "plus"
                            ? "w-7 h-7 shrink-0 rounded-full bg-gradient-to-b from-amber-500/25 to-amber-600/10 border border-amber-500/50 text-amber-400 text-xs font-black flex items-center justify-center cursor-pointer shadow-[0_1px_4px_rgba(0,0,0,0.4)] hover:border-amber-400/80 hover:from-amber-500/35 active:scale-90 transition"
                            : "w-7 h-7 shrink-0 rounded-full bg-gradient-to-b from-zinc-800 to-zinc-900 border border-zinc-700/70 text-zinc-400 text-xs font-black flex items-center justify-center cursor-pointer shadow-[0_1px_4px_rgba(0,0,0,0.4)] hover:border-zinc-500 hover:text-zinc-200 active:scale-90 transition",
                      }, variant === "plus" ? "＋" : "－");
                    return React.createElement("div", { className: "space-y-2" },
                      /* 中央にナンバーの凡例を1つだけ置き、その左にP1、右にP2のステッパーを配置。
                         ◀▶は文字だけだと押しにくいとのフィードバックで、背景・枠付きの
                         きちんとしたボタン要素にしている。さらに「ダサい」との指摘を受け、
                         円形＋グラデーション＋プラス側はアンバーで強調する見た目に磨いた。 */
                      React.createElement("div", { className: "grid grid-cols-2 gap-x-2 px-9" },
                        React.createElement("p", { className: "text-[9px] text-amber-500/80 font-black text-center" }, "P1"),
                        React.createElement("p", { className: "text-[9px] text-amber-500/80 font-black text-center" }, "P2"),
                      ),
                      React.createElement("div", { className: "space-y-1" },
                        [20, 19, 18, 17, 16, 15, 25].map(n =>
                          React.createElement("div", { key: n, className: "flex items-center justify-center gap-1.5" },
                            stepBtn(() => setManualCricketMarksP1(m => ({ ...m, [n]: Math.max(0, m[n] - 1) })), "minus"),
                            React.createElement("span", { className: "text-xs font-black font-mono text-white w-3 text-center" }, manualCricketMarksP1[n]),
                            stepBtn(() => setManualCricketMarksP1(m => ({ ...m, [n]: Math.min(3, m[n] + 1) })), "plus"),
                            React.createElement("span", { className: "text-[10px] text-zinc-500 font-bold w-7 shrink-0 text-center" }, n === 25 ? "BULL" : n),
                            stepBtn(() => setManualCricketMarksP2(m => ({ ...m, [n]: Math.max(0, m[n] - 1) })), "minus"),
                            React.createElement("span", { className: "text-xs font-black font-mono text-white w-3 text-center" }, manualCricketMarksP2[n]),
                            stepBtn(() => setManualCricketMarksP2(m => ({ ...m, [n]: Math.min(3, m[n] + 1) })), "plus"),
                          )
                        ),
                      ),
                      /* 得点の直接加算も同じ「中央ラベル＋左右ステッパー」の見た目で統一 */
                      React.createElement("div", { className: "flex items-center justify-center gap-1.5" },
                        stepBtn(() => setManualCricketBonusP1(b => Math.max(0, b - 8)), "minus"),
                        React.createElement("span", { className: "text-xs font-black font-mono text-white w-8 text-center" }, manualCricketBonusP1),
                        stepBtn(() => setManualCricketBonusP1(b => Math.min(400, b + 8)), "plus"),
                        React.createElement("span", { className: "text-[10px] text-zinc-500 font-bold w-7 shrink-0 text-center" }, "PTS"),
                        stepBtn(() => setManualCricketBonusP2(b => Math.max(0, b - 8)), "minus"),
                        React.createElement("span", { className: "text-xs font-black font-mono text-white w-8 text-center" }, manualCricketBonusP2),
                        stepBtn(() => setManualCricketBonusP2(b => Math.min(400, b + 8)), "plus"),
                      ),
                    );
                  })(),
                  autoHandicapCricket === "dl2" && (() => {
                    const diff = Math.abs(p1Rating - p2Rating);
                    const preview = (() => {
                      if (p1Rating === p2Rating) return "No difference";
                      const hc = getDartslive2CricketHandicap(diff);
                      const marksStr = [18, 17, 16, 15]
                        .filter(n => hc.marks[n] > 0)
                        .map(n => `${n}×${hc.marks[n]}`)
                        .join(" ");
                      const who = p1Rating < p2Rating ? "P1" : "P2";
                      return `${who}: ${marksStr || "no marks"}${hc.bonus > 0 ? ` +${hc.bonus}pt` : ""}`;
                    })();
                    return React.createElement("div", { className: "space-y-2 pt-1" },
                      React.createElement("div", { className: "grid grid-cols-2 gap-2" },
                        [["P1", p1Rating, setP1Rating], ["P2", p2Rating, setP2Rating]].map(([label, rating, setRating]) =>
                          React.createElement("div", { key: label, className: "flex items-center justify-between gap-1" },
                            React.createElement("span", { className: "text-[8px] text-zinc-600 font-bold" }, `${label} RT`),
                            React.createElement("button", {
                              onClick: () => { playSound("click"); setRating(r => Math.max(0, r - 1)); },
                              className: "setup-score-btn flex-1 text-xs",
                            }, "－"),
                            React.createElement("span", { className: "text-sm font-black font-mono text-white tabular-nums w-10 text-center" }, rating),
                            React.createElement("button", {
                              onClick: () => { playSound("click"); setRating(r => Math.min(17, r + 1)); },
                              className: "setup-score-btn flex-1 text-xs",
                            }, "＋"),
                          )
                        ),
                      ),
                      React.createElement("p", { className: "text-[8px] text-amber-500/80 font-bold text-center truncate" }, preview),
                      React.createElement("p", { className: "text-[8px] text-zinc-600 text-center" }, `Rating diff ${diff}`),
                    );
                  })(),
                ),

                /* Count-Up: ラウンド数 */
                gameMode === "countup" && React.createElement("div", { className: "space-y-1" },
                  React.createElement("p", { className: "text-[8px] text-zinc-600 font-bold tracking-widest" }, "ROUNDS"),
                  React.createElement("div", { className: "grid grid-cols-4 gap-2" },
                    [5,8,10,15].map(r =>
                      React.createElement("button", {
                        key: r,
                        onClick: () => { playSound("click"); setCuRounds(r); },
                        className: `setup-toggle-btn ${cuRounds===r?"setup-toggle-active":"setup-toggle-inactive"}`,
                      }, r)
                    ),
                  ),
                ),

                /* 01・クリケット共通: ラウンド上限 */
                (gameMode === "01" || gameMode === "cricket") && React.createElement("div", { className: "space-y-1" },
                  React.createElement("p", { className: "text-[8px] text-zinc-600 font-bold tracking-widest" }, "MAX ROUNDS"),
                  React.createElement("div", { className: "grid grid-cols-4 gap-2" },
                    [[10,"10"],[15,"15"],[20,"20"],[30,"30"]].map(([r,lbl]) =>
                      React.createElement("button", {
                        key: String(r),
                        onClick: () => { playSound("click"); setMaxRounds(r); },
                        className: `setup-toggle-btn ${maxRounds===r?"setup-toggle-active":"setup-toggle-inactive"}`,
                      }, lbl)
                    ),
                  ),
                ),

                /* BULL */
                React.createElement("div", { className: "flex items-center gap-3" },
                  React.createElement("span", { className: "text-[9px] text-zinc-600 font-bold w-8 shrink-0" }, "BULL"),
                  React.createElement("div", {
                    className: "flex-1 slide-track",
                    onClick: () => { playSound("click"); setBullType(b=>b==="separate"?"fat":"separate"); },
                  },
                    React.createElement("div", { className: `slide-thumb ${bullType==="separate"?"left":"right"}` }),
                    React.createElement("button", { className: `slide-opt ${bullType==="separate"?"active":"inactive"}` }, "25/50"),
                    React.createElement("button", { className: `slide-opt ${bullType==="fat"?"active":"inactive"}` }, "50/50"),
                  ),
                ),

                /* OUT (01のみ) */
                gameMode === "01" && React.createElement("div", { className: "flex items-center gap-3" },
                  React.createElement("span", { className: "text-[9px] text-zinc-600 font-bold w-8 shrink-0" }, "OUT"),
                  React.createElement("div", { className: "flex-1 pill-seg" },
                    [["single","OPEN","active-s"],["double","DOUBLE","active-d"],["master","MASTER","active-m"]].map(([m,lbl,ac]) =>
                      React.createElement("button", {
                        key: m,
                        onClick: () => { playSound("click"); setOutMode(m); },
                        className: `pill-opt ${outMode===m?ac:"inactive"}`,
                      }, lbl)
                    ),
                  ),
                ),
              ),

              /* ── ⑤ OK / 前ゲーム ── */
              showQuitConfirm
                ? React.createElement(
                    "div",
                    { className: "space-y-2" },
                    React.createElement(
                      "p",
                      {
                        className:
                          "text-center text-[11px] font-bold text-rose-400 bg-rose-950/30 border border-rose-900/40 rounded-xl py-3 px-3",
                      },
                      "現在のゲームを終了して新しいゲームを始めますか？",
                    ),
                    React.createElement(
                      "div",
                      { className: "grid grid-cols-2 gap-2" },
                      React.createElement(
                        "button",
                        {
                          onClick: () => {
                            playSound("revert");
                            setShowQuitConfirm(false);
                          },
                          className:
                            "py-3 rounded-xl bg-zinc-900 border border-zinc-700/60 text-zinc-400 font-black text-xs cursor-pointer",
                        },
                        "キャンセル",
                      ),
                      React.createElement(
                        "button",
                        {
                          onClick: () => {
                            setShowQuitConfirm(false);
                            handleStartGame();
                          },
                          className:
                            "py-3 rounded-xl bg-rose-600 border border-rose-500 text-white font-black text-xs cursor-pointer",
                        },
                        "新しいゲーム",
                      ),
                    ),
                  )
                : React.createElement(
                    React.Fragment,
                    null,
                    React.createElement(
                      "button",
                      {
                        onClick: () => {
                          players[0].history.length > 0 ||
                          (playerCount >= 2 && players[1].history.length > 0)
                            ? setShowQuitConfirm(true)
                            : handleStartGame();
                        },
                        className:
                          "w-full py-4 bg-gradient-to-r from-amber-400 to-amber-500 border border-amber-300/60 text-black font-black text-sm rounded-2xl uppercase cursor-pointer shadow-[0_8px_24px_rgba(245,158,11,0.18)] tracking-[0.12em] transition hover:from-amber-300 hover:to-amber-400",
                      },
                      "OK",
                    ),
                    hasRestorableSave && React.createElement(
                      "button",
                      {
                        onClick: handleRestoreSave,
                        className:
                          "w-full py-2.5 bg-zinc-900/80 border border-amber-500/30 text-amber-500/80 font-black text-[10px] rounded-xl uppercase cursor-pointer tracking-widest hover:border-amber-400/50 transition",
                      },
                      "RESUME",
                    ),
                  ),
            ),
          ),
        ),

      /* ── Exit Confirm ── */
      showExitConfirm &&
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
              React.createElement(
                "span",
                { className: "text-3xl block" },
                "🚨",
              ),
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
                    setShowExitConfirm(false);
                  },
                  className:
                    "py-3 bg-zinc-900 border border-zinc-700/60 text-zinc-400 text-xs font-bold rounded-xl cursor-pointer",
                },
                "キャンセル",
              ),
              React.createElement(
                "button",
                {
                  onClick: handleLeaveToMenu,
                  className:
                    "py-3 bg-rose-600 border border-rose-500 text-white text-xs font-black rounded-xl cursor-pointer",
                },
                "終了する",
              ),
            ),
          ),
        ),

      /* ── How To ── */
      showHowTo && (() => {
        const isJa = helpLang !== "en"; // デフォルト日本語
        const helpItems = isJa ? [
          ["1. 入力", "盤面を直接タップするか、テンキーを使います。S/D/T でシングル・ダブル・トリプルを選んでから数字をタップ。"],
          ["2. 編集", "3つのダーツスロットをタップすると上書き編集できます。UNDOで1投取り消し、CLEARでターン全消去。"],
          ["3. アレンジ (01)", "上部バーに標準チェックアウトルートが表示されます。"],
          ["4. Count-Up", "各プレイヤーが3投×Nラウンド投げて合計点を競います。"],
          ["5. CPU対戦", "設定で🤖CPUをONにすると、AIが自動で投げます。難易度は EASY〜PRO から選べます。"],
          ["6. PREV TURN", "PREV（戻る）ボタンで前のターンに戻れます。throwing中は2回押し確認、next中は1回で即戻り。"],
        ] : [
          ["1. Input", "Tap the board directly or use the keypad. Choose S/D/T (Single/Double/Triple) then tap the number."],
          ["2. Edit", "Tap a dart slot to overwrite. UNDO removes the last dart, CLEAR wipes the whole turn."],
          ["3. Assist (01)", "The top bar shows the standard checkout route for your remaining score."],
          ["4. Count-Up", "Players throw 3 darts × N rounds and accumulate points. Highest total wins."],
          ["5. CPU Match", "Enable 🤖 CPU in the setup to play against AI. Choose difficulty from EASY to PRO."],
          ["6. PREV TURN", "PREV button undoes the previous turn. Press twice during throwing, once after OK."],
        ];
        return React.createElement("div", {
          className: "fixed inset-0 z-50 bg-black/90 backdrop-blur-md p-4 flex items-center justify-center",
        },
          React.createElement("div", {
            className: "setup-card max-w-sm w-full p-5 rounded-2xl space-y-4 no-scrollbar overflow-y-auto max-h-[85vh]",
          },
            React.createElement("div", { className: "flex justify-between items-center" },
              React.createElement("h3", { className: "text-[10px] font-black tracking-widest text-amber-400 uppercase" },
                isJa ? "クイックヘルプ" : "QUICK HELP"),
              React.createElement("div", { className: "flex items-center gap-2" },
                React.createElement("button", {
                  onClick: () => { playSound("click"); setHelpLang(l=>l==="ja"?"en":"ja"); },
                  className: "px-2 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-[9px] font-black text-zinc-400 hover:text-amber-400 cursor-pointer transition",
                }, isJa ? "EN" : "JP"),
                React.createElement("button", {
                  onClick: () => { playSound("revert"); setShowHowTo(false); },
                  className: "w-7 h-7 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white cursor-pointer",
                }, React.createElement(Icons.X, null)),
              ),
            ),
            React.createElement("div", { className: "space-y-3" },
              helpItems.map(([title, body]) =>
                React.createElement("div", { key: title, className: "bg-zinc-900/60 rounded-xl p-3 border border-zinc-800/60" },
                  React.createElement("p", { className: "text-[10px] font-black text-amber-300 mb-1" }, title),
                  React.createElement("p", { className: "text-[11px] text-zinc-300 leading-relaxed" }, body),
                )
              ),
            ),
            React.createElement("button", {
              onClick: () => { playSound("revert"); setShowHowTo(false); },
              className: "w-full py-2 bg-zinc-900 border border-zinc-800 text-zinc-500 font-bold text-[10px] rounded-xl cursor-pointer hover:text-zinc-300 transition",
            }, isJa ? "閉じる" : "CLOSE"),
          ),
        );
      })(),

      /* ── Winner / Count-Up Result ── */
      winner &&
        React.createElement(
          "div",
          {
            className:
              "fixed inset-0 z-[100] bg-[#050508] flex flex-col justify-center items-center p-4",
          },
          React.createElement(
            "div",
            { className: "text-center space-y-5 max-w-xs w-full" },
            React.createElement(
              "span",
              { className: "text-5xl block animate-bounce" },
              winner.isDraw ? "🤝" : (winner.countUpResult || winner.cricketResult) ? "🏆" : "👑",
            ),
            React.createElement(
              "h2",
              {
                className:
                  "text-xl font-black tracking-wider text-amber-400 uppercase",
              },
              winner.isDraw ? "DRAW!" : winner.name + " WINS!",
            ),
            (winner.countUpResult || winner.cricketResult)
              ? (() => {
                  // 得点だけでソートすると、同点だが実際は勝者が別にいるケース（クリケットの
                  // 同点クローズ勝ちなど）で、勝者の行はハイライトされるのに1位バッジは別の
                  // プレイヤーに付く、という矛盾表示になっていた。isDrawでなければ勝者を
                  // 必ず先頭に固定し、順位バッジと勝者ハイライトが一致するようにする。
                  const sortedScores = (winner.scores || [])
                    .slice()
                    .sort((a, b) => {
                      if (!winner.isDraw) {
                        const aIsWinner = a.name === winner.name;
                        const bIsWinner = b.name === winner.name;
                        if (aIsWinner !== bIsWinner) return aIsWinner ? -1 : 1;
                      }
                      return b.score - a.score;
                    });
                  const leadScore = sortedScores[0] ? sortedScores[0].score : 0;
                  return React.createElement(
                    "div",
                    { className: "space-y-2" },
                    sortedScores.map((s, rank) => {
                      const isWinner = !winner.isDraw && s.name === winner.name;
                      const diffFromLead = leadScore - s.score;
                      return React.createElement(
                        "div",
                        {
                          key: s.name,
                          className: `flex justify-between items-center rounded-xl px-4 py-3 border ${isWinner ? "bg-amber-950/40 border-amber-500/50" : "bg-zinc-900/60 border-zinc-800"}`,
                        },
                        React.createElement(
                          "div",
                          { className: "text-left flex items-center gap-3" },
                          React.createElement(
                            "span",
                            {
                              className: `w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border ${rank === 0 ? "border-amber-400 text-amber-300 bg-amber-500/10" : "border-zinc-700 text-zinc-500 bg-black/20"}`,
                            },
                            rank + 1,
                          ),
                          React.createElement(
                            "div",
                            null,
                            React.createElement(
                              "span",
                              {
                                className: `block text-[11px] font-black uppercase ${isWinner ? "text-amber-300" : "text-zinc-300"}`,
                              },
                              s.name,
                            ),
                            diffFromLead > 0 &&
                              React.createElement(
                                "span",
                                {
                                  className:
                                    "block text-[9px] text-zinc-500 font-bold mt-0.5",
                                },
                                `LEAD -${diffFromLead}`,
                              ),
                          ),
                        ),
                        React.createElement(
                          "span",
                          {
                            className: `text-2xl font-black font-mono tabular-nums ${isWinner ? "text-amber-300" : "text-zinc-300"}`,
                          },
                          s.score,
                        ),
                      );
                    }),
                  );
                })()
              : React.createElement("div", { className: "space-y-2" },
                  React.createElement("p", { className: "text-[10px] text-zinc-500 font-bold tracking-widest mb-2" },
                    winner.o1RoundResult ? "🏁 ラウンド終了！" : "🎯 チェックアウト！"),
                  players.filter((p,i) => i < playerCount).map((p,i) =>
                    React.createElement("div", {
                      key: p.id,
                      // isDraw時はid=nullなので全行をニュートラル表示、勝者はnameで判定
                      className: `flex justify-between items-center rounded-xl px-4 py-2.5 border ${!winner.isDraw && p.id === winner.id ? "bg-amber-950/40 border-amber-500/50" : "bg-zinc-900/60 border-zinc-800"}`,
                    },
                      React.createElement("span", { className: `text-[11px] font-black uppercase ${!winner.isDraw && p.id===winner.id?"text-amber-300":"text-zinc-400"}` }, p.name),
                      React.createElement("span", { className: `text-lg font-black font-mono ${!winner.isDraw && p.id===winner.id?"text-amber-300":"text-zinc-400"}` },
                        winner.o1RoundResult
                          ? p.remainingScore
                          : p.remainingScore === 0 ? "✓ OUT" : p.remainingScore)
                    )
                  ),
                ),
            React.createElement(
              "div",
              { className: "space-y-2" },
              React.createElement(
                "button",
                {
                  onClick: () => {
                    handleStartGame(false);
                  },
                  className:
                    "w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 text-black font-black text-base rounded-2xl cursor-pointer hover:from-amber-300 hover:to-amber-400 shadow-[0_8px_24px_rgba(245,158,11,0.2)] tracking-[0.1em] uppercase transition",
                },
                "PLAY AGAIN",
              ),
              React.createElement(
                "button",
                {
                  onClick: () => {
                    handleStartGame(true);
                  },
                  className:
                    "w-full py-2.5 bg-zinc-900/80 border border-zinc-700/60 text-zinc-400 font-black text-[11px] rounded-xl cursor-pointer hover:border-amber-500/30 hover:text-amber-400 tracking-widest uppercase transition",
                },
                "Change Settings",
              ),
            ),
          ),
        ),
    );
  }

  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(React.createElement(App, null));
