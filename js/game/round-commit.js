// ═══════════════════════════════════════════════════════════════════════
// js/game/round-commit.js — ラウンド結果計算(採点→node生成→players更新→勝敗判定→
// ラウンド上限判定)の純粋関数
//   依存: checkout.js(getRoundState/getCricketRoundState/getSubtotal/
//   checkCricketWinner/normalizeOutMode)。React StateにもRefにも一切触れない。
//   読み込み順: checkout.js の後、app-main.js の前（index.html参照）
//
//   抽出の背景(STATE_MANAGEMENT.md「Phase 3-D」参照):
//   handleCommitRound(人間の投擲確定)とCPU自動投擲Effectを8段階に分解して
//   突き合わせたところ、以下が判明した:
//     ①Throw正規化 … 呼び出し元(commitThrow/cpuPlayTurn)で既に完了、共通化不要
//     ②ラウンド採点 ③node生成 ④players更新 ⑤winner判定 ⑥ラウンド上限判定
//       … 完全に同一のロジック(このファイルが担当)
//     ⑦ターン遷移 ⑧confirmStage制御
//       … Human/CPUで意図的に異なる(NEXT待ち vs 即時進行)。共通化しない。
//   この関数は②〜⑥だけを担い、⑦⑧・setTimeout・cancelled・winnerRef再確認・
//   全ドロップ処理(CPU固有)・editingThrowIndex制御(Human固有)は
//   呼び出し元(app-main.js)に残す。
//
//   isLastPlayerについて: 以前のCPU Effectは「CPU(idx=1)は常にラストプレイヤー」
//   という暗黙の前提でこのチェックを省略していた。この関数では呼び出し元に
//   isLastPlayerの計算(`playerCount === 1 || activePlayerIndex === playerCount - 1`)
//   を明示的にさせることで、その暗黙の前提を関数の外に出し、CPUの座席が
//   将来変わっても壊れない設計にしている。
// ═══════════════════════════════════════════════════════════════════════

const computeRoundResult = (
  players,
  activePlayerIndex,
  gameMode,
  throws,
  { outMode, playerCount, maxRounds, cuRounds, isLastPlayer, opponentsMarks },
) => {
  const activePlayer = players[activePlayerIndex];

  if (gameMode === "countup") {
    const pts = getSubtotal(throws);
    const node = {
      roundNum: activePlayer.history.length + 1,
      throws,
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
    const relevantPlayers = playerCount === 1 ? [mp[0]] : mp;
    const bothDone = relevantPlayers.every((p) => p.history.length >= cuRounds);
    if (bothDone) {
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
      return {
        players: mp,
        node,
        isGameOver: true,
        winner: {
          ...w,
          countUpResult: true,
          isDraw,
          scores: relevantPlayers.map((p) => ({
            name: p.name,
            score: p.accumulatedScore,
          })),
        },
        resultType: "countup-finished",
      };
    }
    return { players: mp, node, isGameOver: false, winner: null, resultType: "countup-continue" };
  }

  if (gameMode === "cricket") {
    const result = getCricketRoundState(
      activePlayer.cricketMarks,
      activePlayer.cricketScore,
      throws,
      opponentsMarks,
    );
    const node = {
      roundNum: activePlayer.history.length + 1,
      throws,
      roundScore: result.pointsThisTurn,
      cricketMarks: result.marks,
      cricketScore: result.score,
    };
    const mp = players.map((p, i) =>
      i === activePlayerIndex
        ? {
            ...p,
            cricketMarks: result.marks,
            cricketScore: result.score,
            history: [node, ...p.history],
          }
        : p,
    );
    const others = playerCount === 1 ? [] : mp.filter((_, i) => i !== activePlayerIndex);
    if (checkCricketWinner(mp[activePlayerIndex], others)) {
      return {
        players: mp,
        node,
        isGameOver: true,
        winner: {
          ...mp[activePlayerIndex],
          cricketResult: true,
          isDraw: false,
          scores: (playerCount === 1 ? [mp[activePlayerIndex]] : mp).map((p) => ({
            name: p.name,
            score: p.cricketScore,
          })),
        },
        resultType: "cricket-closed",
      };
    }
    const nextRoundNum = mp[activePlayerIndex].history.length;
    if (maxRounds !== null && isLastPlayer && nextRoundNum >= maxRounds) {
      const relevant = playerCount === 1 ? [mp[0]] : mp.slice(0, 2);
      const maxScore = Math.max(...relevant.map((p) => p.cricketScore));
      const winners = relevant.filter((p) => p.cricketScore === maxScore);
      const isDraw = winners.length > 1;
      const w = isDraw ? { ...winners[0], id: null } : winners[0];
      return {
        players: mp,
        node,
        isGameOver: true,
        winner: {
          ...w,
          cricketResult: true,
          isDraw,
          scores: relevant.map((p) => ({ name: p.name, score: p.cricketScore })),
        },
        resultType: "cricket-round-limit",
      };
    }
    return { players: mp, node, isGameOver: false, winner: null, resultType: "cricket-continue" };
  }

  // 01
  const normOut = normalizeOutMode(outMode);
  const freshState = getRoundState(activePlayer.remainingScore, throws, normOut);
  const nextRem = freshState.remainingScore;
  const node = {
    roundNum: activePlayer.history.length + 1,
    throws,
    roundScore: freshState.subtotal,
    remainingScore: nextRem,
    isBust: freshState.isBust,
  };
  const mp = players.map((p, i) =>
    i === activePlayerIndex
      ? { ...p, remainingScore: nextRem, history: [node, ...p.history] }
      : p,
  );
  if (nextRem === 0) {
    return {
      players: mp,
      node,
      isGameOver: true,
      winner: mp[activePlayerIndex],
      resultType: "01-checkout",
    };
  }
  const nextRoundNum = mp[activePlayerIndex].history.length;
  if (maxRounds !== null && isLastPlayer && nextRoundNum >= maxRounds) {
    const relevant = playerCount === 1 ? [mp[0]] : mp.slice(0, 2);
    const minRem = Math.min(...relevant.map((p) => p.remainingScore));
    const winners = relevant.filter((p) => p.remainingScore === minRem);
    const isDraw = winners.length > 1;
    const w = isDraw ? { ...winners[0], id: null } : winners[0];
    return {
      players: mp,
      node,
      isGameOver: true,
      winner: {
        ...w,
        o1RoundResult: true,
        isDraw,
        scores: relevant.map((p) => ({ name: p.name, score: p.remainingScore })),
      },
      resultType: "01-round-limit",
    };
  }
  return { players: mp, node, isGameOver: false, winner: null, resultType: "01-continue" };
};
