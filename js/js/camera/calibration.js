// ═══════════════════════════════════════════════════════════════════════
// js/camera/calibration.js — 手動4点キャリブレーション・ホモグラフィ計算
//   依存: React（vendor script）、constants.js の BOARD_OUTER_RADIUS。
//   読み込み順: camera-input.js の直後、app-main.js の直前（index.html参照）
//
//   このファイルの役割:
//   カメラ映像上の4点(ピクセル座標)と、盤面座標系(-176〜176、getThrowFromCoordsが
//   使う座標系)上の既知の4点を対応づけて、ホモグラフィ行列を求める。
//   計算部分(computeHomography/applyHomography)はDOM非依存の純粋関数にしてあり、
//   tests/から直接検証できる(vmローダーの対象ファイルにこのファイルも追加する)。
//
//   基準点の選び方:
//   「何番のセグメントか」を数えさせるとキャリブレーションの心理的ハードルが上がるため、
//   カメラが盤面を真上から見ている前提で、ダブルリング外周(r=BOARD_OUTER_RADIUS)の
//   上/右/下/左の4点(時計でいう12時・3時・6時・9時の位置)をタップしてもらう方式にする。
//   盤面座標系はgetThrowFromCoords/描画側と同じ「12時=(0,-r)、3時=(r,0)、
//   6時=(0,r)、9時=(-r,0)」という向き(x右+, y下+のスクリーン座標系)。
// ═══════════════════════════════════════════════════════════════════════

// キャリブレーションで使う4つの基準点(盤面座標系)。順序は固定
// (上→右→下→左の順でユーザーにタップしてもらう)。
const CALIBRATION_BOARD_POINTS = [
  { x: 0, y: -BOARD_OUTER_RADIUS }, // 12時(上)
  { x: BOARD_OUTER_RADIUS, y: 0 }, // 3時(右)
  { x: 0, y: BOARD_OUTER_RADIUS }, // 6時(下)
  { x: -BOARD_OUTER_RADIUS, y: 0 }, // 9時(左)
];
const CALIBRATION_POINT_LABELS = ["上(12時)", "右(3時)", "下(6時)", "左(9時)"];

// ─────────────────────────────────────────────────────────────────────────
// solveLinearSystem: ガウスの消去法(部分ピボット選択付き)でAx=bを解く。
//   A: n×n行列(配列の配列)、b: 長さnの配列。戻り値: 長さnの解ベクトル。
//   4点対応から立てる8元連立方程式を解くためだけの最小実装。外部ライブラリ不要。
// ─────────────────────────────────────────────────────────────────────────
const solveLinearSystem = (A, b) => {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let maxAbs = Math.abs(M[col][col]);
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > maxAbs) {
        maxAbs = Math.abs(M[r][col]);
        pivotRow = r;
      }
    }
    if (maxAbs < 1e-9) {
      throw new Error(
        "計算できない点配置です(4点が一直線に近い、または重複しています)",
      );
    }
    if (pivotRow !== col) {
      const tmp = M[col];
      M[col] = M[pivotRow];
      M[pivotRow] = tmp;
    }
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col] / M[col][col];
      if (factor === 0) continue;
      for (let c = col; c <= n; c++) {
        M[r][c] -= factor * M[col][c];
      }
    }
  }
  return M.map((row, i) => row[n] / row[i]);
};

// ─────────────────────────────────────────────────────────────────────────
// computeHomography: 4組の対応点(pixel座標 → 盤面座標)からホモグラフィ行列を求める。
//   srcPoints: カメラ映像上のピクセル座標 [{x,y}, ...] (4点、CALIBRATION_BOARD_POINTSと同じ順序)
//   dstPoints: 対応する盤面座標 [{x,y}, ...] (通常はCALIBRATION_BOARD_POINTSをそのまま渡す)
//   戻り値: 3x3行列(配列の配列)。h33=1に正規化済み。
// ─────────────────────────────────────────────────────────────────────────
const computeHomography = (srcPoints, dstPoints) => {
  if (
    !Array.isArray(srcPoints) ||
    !Array.isArray(dstPoints) ||
    srcPoints.length !== 4 ||
    dstPoints.length !== 4
  ) {
    throw new Error("computeHomography には4組の対応点が必要です");
  }
  const A = [];
  const b = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = srcPoints[i];
    const { x: X, y: Y } = dstPoints[i];
    A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]);
    b.push(X);
    A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]);
    b.push(Y);
  }
  const h = solveLinearSystem(A, b);
  return [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], 1],
  ];
};

// ─────────────────────────────────────────────────────────────────────────
// applyHomography: ホモグラフィ行列Hを使って、ピクセル座標(x,y)を盤面座標へ変換する。
// ─────────────────────────────────────────────────────────────────────────
const applyHomography = (H, x, y) => {
  const w = H[2][0] * x + H[2][1] * y + H[2][2];
  if (Math.abs(w) < 1e-9) {
    throw new Error("変換できない座標です(ホモグラフィが特異点を通過)");
  }
  return {
    x: (H[0][0] * x + H[0][1] * y + H[0][2]) / w,
    y: (H[1][0] * x + H[1][1] * y + H[1][2]) / w,
  };
};

// ─────────────────────────────────────────────────────────────────────────
// CalibrationOverlay: 映像の上に重ねて4点タップを受け付けるUI。
//   videoRefが指す<video>要素のクライアント矩形を基準に、タップ位置をvideo要素内の
//   相対ピクセル座標(0,0が左上)として記録する。4点揃ったらcomputeHomographyを呼び、
//   onCalibrated(homography, points)を返す。
// ─────────────────────────────────────────────────────────────────────────
const CalibrationOverlay = ({ videoRef, onCalibrated, onCancel }) => {
  const [points, setPoints] = useState([]); // クリックされたピクセル座標の配列
  const [error, setError] = useState("");

  const handleClick = (e) => {
    if (points.length >= 4 || !videoRef.current) return;
    const rect = videoRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const next = [...points, { x: px, y: py }];
    setPoints(next);
    setError("");
    if (next.length === 4) {
      try {
        const H = computeHomography(next, CALIBRATION_BOARD_POINTS);
        onCalibrated(H, next);
      } catch (err) {
        setError(err.message || "キャリブレーションに失敗しました");
        setPoints([]); // 失敗したら最初からやり直してもらう
      }
    }
  };

  const currentLabel =
    points.length < 4 ? CALIBRATION_POINT_LABELS[points.length] : null;

  return React.createElement(
    "div",
    {
      className: "absolute inset-0 cursor-crosshair",
      onClick: handleClick,
    },
    // 既にタップした点を表示
    points.map((p, i) =>
      React.createElement("div", {
        key: i,
        className:
          "absolute w-2.5 h-2.5 -ml-[5px] -mt-[5px] rounded-full bg-emerald-400 border border-white/80 pointer-events-none",
        style: { left: `${p.x}px`, top: `${p.y}px` },
      }),
    ),
    // ガイド文言
    React.createElement(
      "div",
      {
        className:
          "absolute top-1.5 left-1.5 right-1.5 bg-black/70 rounded-lg px-2 py-1.5 text-center pointer-events-none",
      },
      React.createElement(
        "p",
        { className: "text-[9px] font-black text-emerald-300" },
        currentLabel
          ? `ダブルリング外周の「${currentLabel}」をタップ (${points.length + 1}/4)`
          : "キャリブレーション完了",
      ),
      error &&
        React.createElement(
          "p",
          { className: "text-[8px] text-rose-400 font-bold mt-0.5" },
          error,
        ),
    ),
    React.createElement(
      "button",
      {
        onClick: (e) => {
          e.stopPropagation();
          onCancel();
        },
        className:
          "absolute bottom-1.5 right-1.5 px-2 py-1 rounded-lg bg-black/70 border border-zinc-700 text-[8px] font-bold text-zinc-400 hover:text-white cursor-pointer",
      },
      "キャンセル",
    ),
  );
};
