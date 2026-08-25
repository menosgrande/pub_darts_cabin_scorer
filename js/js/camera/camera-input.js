// ═══════════════════════════════════════════════════════════════════════
// js/camera/camera-input.js — カメラ自動採点モード関連のUI・ロジック
//   依存: React（vendor script）。他のjs/内ファイルには依存しない。
//   読み込み順: ui-components.js の直後、app-main.js の直前
//   （index.htmlのscriptタグ参照。app-main.jsのJSX内でCameraInputPanelを参照するため、
//    app-main.jsより前に読み込まれている必要がある）
//
//   このフォルダの方針:
//   カメラ自動採点機能はゲームロジック本体（constants/checkout/scoring/cpu）とは
//   独立した「入力アダプター」として追加する。既存のタップ入力を置き換えず、
//   検出結果を最終的に {score, multiplier, x, y, label, isBull} の形へ変換して
//   commitThrow(t) に渡すだけで、バースト判定・履歴確定・サウンドは
//   既存の経路にそのまま乗る（詳細はSTATE_MANAGEMENT.md「将来のカメラ自動採点との
//   統合点」を参照）。将来ここに追加する想定のファイル:
//     calibration.js     手動4点キャリブレーション・ホモグラフィ計算
//     dart-detection.js  差分検出によるダーツ着弾位置の推定
//
//   1台/2台構成について:
//   単眼(1台)でもホモグラフィ変換だけで動く設計だが、2台構成にすれば将来的に
//   視差を使った精度向上（三角測量ではなく、2視点の一致度でダーツ先端の誤検出を
//   減らす簡易版）も選べるようにしておきたい。そのため入力アダプターの時点で
//   「カメラは1〜2台の可変構成」として扱う。実際の検出ロジック(dart-detection.js)
//   側で「2台目の情報をどう使うか」はまだ決めていないが、UIの土台だけ先に作る。
// ═══════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────
// CameraSlot: 1台分のカメラ映像を表示する最小単位。
//   deviceIdが変わるたびにストリームを開き直す。アンマウント時は必ず停止する。
//   キャリブレーション(手動4点→ホモグラフィ)もこの単位で行う。カメラごとに
//   物理的な設置位置・角度が異なるため、ホモグラフィもカメラごとに別々に持つ。
//   結果はCAMERA_STORAGE_KEYにdeviceId単位で保存し、キャビン設置(カメラが動かない
//   前提)なら次回以降キャリブレーションをやり直さなくて済むようにする。
// ─────────────────────────────────────────────────────────────────────────
const loadSavedHomographies = () => {
  try {
    const raw = localStorage.getItem(CAMERA_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};
const saveHomography = (deviceId, H) => {
  try {
    const all = loadSavedHomographies();
    all[deviceId || "__default__"] = H;
    localStorage.setItem(CAMERA_STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    // 保存に失敗してもキャリブレーション自体は今セッション中は有効なままにする
  }
};

const CameraSlot = ({ deviceId, label, bullType }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState("requesting"); // "requesting" | "ready" | "error"
  const [errorMessage, setErrorMessage] = useState("");
  const [homography, setHomography] = useState(null);
  const [calibrating, setCalibrating] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("requesting");
    setErrorMessage("");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus("error");
      setErrorMessage("このブラウザはカメラ入力(getUserMedia)に対応していません。");
      return;
    }

    const constraints = {
      video: deviceId
        ? { deviceId: { exact: deviceId } }
        : { facingMode: "environment" },
      audio: false,
    };

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(
          err && err.name === "NotAllowedError"
            ? "カメラへのアクセスが許可されていません。"
            : err && err.name === "OverconstrainedError"
              ? "選択したカメラを開けませんでした。"
              : "カメラを起動できませんでした。",
        );
      });

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [deviceId]);

  // deviceIdが決まったら、保存済みのキャリブレーション結果があれば読み込む
  useEffect(() => {
    const saved = loadSavedHomographies();
    const H = saved[deviceId || "__default__"];
    setHomography(H || null);
    setTestResult(null);
  }, [deviceId]);

  const handleCalibrated = (H) => {
    setHomography(H);
    saveHomography(deviceId, H);
    setCalibrating(false);
    setTestResult(null);
  };

  // キャリブレーション済みの状態で映像をタップ → 実際にgetThrowFromCoordsへ通してテストする
  const handleTestTap = (e) => {
    if (!homography || !videoRef.current) return;
    const rect = videoRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    try {
      const board = applyHomography(homography, px, py);
      const result = getThrowFromCoords(board.x, board.y, bullType || "separate");
      setTestResult(result);
    } catch (err) {
      setTestResult(null);
    }
  };

  return React.createElement(
    "div",
    {
      className:
        "relative w-full h-full rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-emerald-500/30",
    },
    status === "ready" &&
      React.createElement("video", {
        ref: videoRef,
        autoPlay: true,
        playsInline: true,
        muted: true,
        className: "w-full h-full object-cover",
        onClick: !calibrating && homography ? handleTestTap : undefined,
      }),
    status !== "ready" &&
      React.createElement(
        "p",
        {
          className:
            "text-center px-3 text-[8px] text-zinc-500 font-bold leading-relaxed",
        },
        status === "requesting"
          ? "起動中…"
          : errorMessage || "利用できません",
      ),
    label &&
      React.createElement(
        "span",
        {
          className:
            "absolute top-1 left-1.5 text-[8px] font-black text-emerald-300/90 bg-black/50 px-1.5 py-0.5 rounded",
        },
        label,
      ),

    // ── キャリブレーションオーバーレイ ──
    status === "ready" &&
      calibrating &&
      React.createElement(CalibrationOverlay, {
        videoRef,
        onCalibrated: handleCalibrated,
        onCancel: () => setCalibrating(false),
      }),

    // ── 未キャリブレーション時: 実行ボタン ──
    status === "ready" &&
      !calibrating &&
      !homography &&
      React.createElement(
        "button",
        {
          onClick: () => setCalibrating(true),
          className:
            "absolute bottom-1.5 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[8px] font-black cursor-pointer",
        },
        "キャリブレーション実行",
      ),

    // ── キャリブレーション済み: 再実行ボタン＋テスト結果表示 ──
    status === "ready" &&
      !calibrating &&
      homography &&
      React.createElement(
        React.Fragment,
        null,
        React.createElement(
          "button",
          {
            onClick: () => setCalibrating(true),
            className:
              "absolute bottom-1.5 right-1.5 px-2 py-1 rounded-lg bg-black/70 border border-zinc-700 text-[8px] font-bold text-zinc-400 hover:text-white cursor-pointer",
          },
          "再調整",
        ),
        testResult &&
          React.createElement(
            "div",
            {
              className:
                "absolute bottom-1.5 left-1.5 px-2 py-1 rounded-lg bg-black/70 text-[10px] font-black text-emerald-300 pointer-events-none",
            },
            `${testResult.label} (${testResult.score * testResult.multiplier}点)`,
          ),
      ),
  );
};

// ─────────────────────────────────────────────────────────────────────────
// CameraInputPanel: カメラ自動採点モードのプレースホルダー
//   1台または2台のカメラを選んで映像を表示するだけ（ダーツ検出・座標変換は未実装）。
//   盤面タップUIと同じ位置(w-42%のコンテナ)に差し替わる形で表示される。
//   既存のタップ入力を置き換えるのではなく「切り替えて使う」設計なので、
//   いつでも盤面タップモードに戻れる(onSwitchToBoard)。
// ─────────────────────────────────────────────────────────────────────────
const CameraInputPanel = ({ onSwitchToBoard, bullType }) => {
  const [cameraCount, setCameraCount] = useState(1); // 1 | 2
  const [devices, setDevices] = useState([]); // enumerateDevicesの結果(videoinputのみ)
  const [deviceIds, setDeviceIds] = useState([null, null]); // 各スロットが使うdeviceId
  const [permissionStatus, setPermissionStatus] = useState("requesting"); // "requesting" | "granted" | "denied"

  // 初回だけ: 権限を取ってデバイス一覧を取得する。
  // enumerateDevices()はラベル(deviceの名前)を得るのに一度でもgetUserMedia許可が
  // 必要なため、まず適当な1本を開いてすぐ閉じる。
  useEffect(() => {
    let cancelled = false;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionStatus("denied");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((stream) => {
        stream.getTracks().forEach((t) => t.stop());
        if (cancelled) return;
        setPermissionStatus("granted");
        return navigator.mediaDevices.enumerateDevices();
      })
      .then((list) => {
        if (cancelled || !list) return;
        const videoInputs = list.filter((d) => d.kind === "videoinput");
        setDevices(videoInputs);
        setDeviceIds([
          videoInputs[0] ? videoInputs[0].deviceId : null,
          videoInputs[1]
            ? videoInputs[1].deviceId
            : videoInputs[0]
              ? videoInputs[0].deviceId
              : null,
        ]);
      })
      .catch(() => {
        if (!cancelled) setPermissionStatus("denied");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sameDeviceWarning =
    cameraCount === 2 &&
    deviceIds[0] &&
    deviceIds[1] &&
    deviceIds[0] === deviceIds[1];

  return React.createElement(
    "div",
    {
      className:
        "relative w-[42%] flex flex-col items-center gap-2 shrink-0 z-20",
    },
    // ── 台数切り替え ──
    React.createElement(
      "div",
      { className: "flex gap-1.5 w-full" },
      [1, 2].map((n) =>
        React.createElement(
          "button",
          {
            key: n,
            onClick: () => setCameraCount(n),
            className: `flex-1 py-1.5 rounded-lg text-[9px] font-black tracking-wide cursor-pointer transition ${
              cameraCount === n
                ? "bg-emerald-600 text-white"
                : "bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-zinc-300"
            }`,
          },
          `${n}台構成`,
        ),
      ),
    ),

    // ── カメラ映像(1台なら正方形1つ、2台なら縦に2分割) ──
    permissionStatus !== "granted"
      ? React.createElement(
          "div",
          {
            className:
              "w-full aspect-square rounded-2xl bg-black border border-zinc-800 flex items-center justify-center",
          },
          React.createElement(
            "p",
            { className: "text-[9px] text-zinc-500 font-bold px-4 text-center" },
            permissionStatus === "requesting"
              ? "カメラの権限を確認しています…"
              : "カメラへのアクセスが許可されていません。ブラウザのサイト設定を確認してください。",
          ),
        )
      : React.createElement(
          "div",
          {
            className: `w-full aspect-square flex gap-1.5 ${cameraCount === 2 ? "flex-col" : ""}`,
          },
          Array.from({ length: cameraCount }).map((_, i) =>
            React.createElement(
              "div",
              { key: i, className: "flex-1 min-h-0" },
              React.createElement(CameraSlot, {
                deviceId: deviceIds[i],
                label: cameraCount === 2 ? `CAM ${i + 1}` : null,
                bullType,
              }),
            ),
          ),
        ),

    // ── デバイス選択(2台以上検出されている場合のみ表示) ──
    permissionStatus === "granted" &&
      devices.length > 1 &&
      React.createElement(
        "div",
        { className: "w-full space-y-1" },
        Array.from({ length: cameraCount }).map((_, i) =>
          React.createElement(
            "select",
            {
              key: i,
              value: deviceIds[i] || "",
              onChange: (e) => {
                const next = [...deviceIds];
                next[i] = e.target.value;
                setDeviceIds(next);
              },
              className:
                "w-full text-[9px] bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-zinc-300",
            },
            devices.map((d, di) =>
              React.createElement(
                "option",
                { key: d.deviceId, value: d.deviceId },
                d.label || `カメラ ${di + 1}`,
              ),
            ),
          ),
        ),
      ),
    sameDeviceWarning &&
      React.createElement(
        "p",
        { className: "text-[8px] text-amber-500/80 font-bold" },
        "同じカメラが2つとも選択されています",
      ),

    React.createElement(
      "button",
      {
        onClick: onSwitchToBoard,
        className:
          "px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-700 text-[9px] font-black text-zinc-400 hover:text-white cursor-pointer transition",
      },
      "盤面タップに戻す",
    ),
  );
};
