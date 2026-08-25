// ═══════════════════════════════════════════════════════════════════════
// js/hooks/useSound.js — 効果音・触覚フィードバックのフック
//   依存: React（vendor script）。ゲームロジック本体・Source of Truth
//   （players/activePlayerIndex等）には一切依存しない、完全に自己完結した機能。
//   読み込み順: ui-components.js/camera/* の後、app-main.js の直前
//   （index.htmlのscriptタグ参照）。
//
//   app-main.jsからの抽出方針（STATE_MANAGEMENT.md「app-main.js分割」参照）:
//   ここでは「サウンドシステムの再設計」はしていない。元のinitAudio/triggerHaptic/
//   playSoundの実装をそのまま移し、外部に公開するAPIを最小限（この3関数）に
//   絞っただけ。app-main.js側は
//     const { playSound, triggerHaptic, initAudio } = useSound(soundEnabled);
//   という1行で呼び出すだけで済む。
// ═══════════════════════════════════════════════════════════════════════

const useSound = (soundEnabled) => {
  const audioCtxRef = useRef(null);

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
      try {
        navigator.vibrate(duration);
      } catch (e) {}
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

  return { playSound, triggerHaptic, initAudio };
};
