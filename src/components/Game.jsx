import { useEffect, useRef, useState, useCallback } from "react";
import { LANES, COLORS, FONT_STACK, TIMING, SCORE, HIGHWAY } from "../theme";
import { subscribe as subscribeInput, emit as emitInput } from "../input/inputManager";
import Hud, { multiplierFor } from "./Hud";
import Countdown from "./Countdown";

const LEAD_IN_MS = 2000;

// Game phases: countdown → playing → done
export default function Game({ song, onFinish, onExit }) {
  const [phase, setPhase] = useState("countdown");

  // Mutable state lives in refs so the rAF loop doesn't fight React renders.
  const stateRef = useRef(createState(song));
  const [, force] = useState(0);
  const renderTick = useCallback(() => force((n) => (n + 1) % 1_000_000), []);

  // Visual feedback state
  const [hitFx, setHitFx] = useState({});       // laneId -> { kind, ts, text }
  const [lanePressed, setLanePressed] = useState({});
  const [particles, setParticles] = useState([]); // list of active particle bursts
  const [comboFlash, setComboFlash] = useState(null); // { combo, color, ts }

  const audioRef = useRef(null);

  // --- Input handling ---
  const handleInput = useCallback((evt) => {
    const { lane, type } = evt;
    if (type === "press") {
      setLanePressed((p) => ({ ...p, [lane]: true }));
      if (phase === "playing") {
        const result = judgePress(stateRef.current, lane);
        if (result) {
          setHitFx((prev) => ({
            ...prev,
            [lane]: { kind: result.kind, ts: performance.now(), text: result.text },
          }));
          // Spawn particle burst
          setParticles((prev) => [
            ...prev,
            {
              id: Math.random().toString(36).slice(2),
              lane,
              color: LANES[lane].color,
              kind: result.kind,
              ts: performance.now(),
            },
          ]);
          // Combo milestone flash
          const c = stateRef.current.combo;
          if (c > 0 && (c === 10 || c === 25 || c === 50 || c === 100)) {
            setComboFlash({
              combo: c,
              color: c >= 50 ? "#f682f4" : c >= 25 ? "#54e4e9" : "#ffd95a",
              ts: performance.now(),
            });
          }
        }
      }
    } else {
      setLanePressed((p) => ({ ...p, [lane]: false }));
    }
  }, [phase]);

  useEffect(() => subscribeInput(handleInput), [handleInput]);

  // Garbage collect particles that have finished animating (700ms lifetime)
  useEffect(() => {
    if (!particles.length) return;
    const id = setTimeout(() => {
      const now = performance.now();
      setParticles((p) => p.filter((x) => now - x.ts < 700));
    }, 200);
    return () => clearTimeout(id);
  }, [particles]);

  // Escape to quit
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onExit(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit]);

  // --- Game loop (audio-synced) ---
  useEffect(() => {
    if (phase !== "playing") return;
    let rafId;
    const startPerfNow = performance.now();
    let audioStarted = false;

    const tick = (now) => {
      const s = stateRef.current;
      const elapsed = now - startPerfNow;

      // Clock logic: lead-in (pre-audio) → audio-driven once audio is playing.
      if (elapsed < LEAD_IN_MS) {
        s.currentMs = -(LEAD_IN_MS - elapsed); // negative counts up to 0
      } else {
        if (!audioStarted && audioRef.current) {
          audioRef.current.currentTime = 0;
          const pr = audioRef.current.play();
          if (pr && pr.catch) pr.catch((e) => console.error("audio play failed", e));
          audioStarted = true;
        }
        s.currentMs = audioRef.current
          ? audioRef.current.currentTime * 1000
          : elapsed - LEAD_IN_MS;
      }

      // Auto-miss notes that slipped past the hit window
      for (const n of s.notes) {
        if (!n.judged && s.currentMs - n.time > TIMING.good) {
          n.judged = true;
          n.result = "miss";
          s.stats.miss += 1;
          s.stats.judgedForAcc += 1;
          s.combo = 0;
        }
      }

      // Finish condition: all notes judged AND we're past end of chart + 1s
      const lastNoteTime = s.notes.length ? s.notes[s.notes.length - 1].time : 0;
      const allJudged = s.notes.every((n) => n.judged);
      const audioEnded = audioRef.current?.ended;
      if ((allJudged && s.currentMs > lastNoteTime + 800) || audioEnded) {
        setPhase("done");
        if (audioRef.current) audioRef.current.pause();
        onFinish(finalStats(s));
        return;
      }

      renderTick();
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    const capturedAudio = audioRef.current;
    return () => {
      cancelAnimationFrame(rafId);
      if (capturedAudio) capturedAudio.pause();
    };
  }, [phase, onFinish, renderTick]);

  // Stop audio on unmount / exit
  useEffect(() => {
    const capturedAudio = audioRef.current;
    return () => {
      if (capturedAudio) {
        capturedAudio.pause();
        capturedAudio.currentTime = 0;
      }
    };
  }, []);

  const s = stateRef.current;
  const progress = computeProgress(s);
  const accuracy = s.stats.judgedForAcc
    ? (s.stats.perfect + s.stats.good) / s.stats.judgedForAcc
    : 1;

  return (
    <div style={styles.root}>
      <div style={styles.bgDots} />
      <div style={styles.bgGlowA} />
      <div style={styles.bgGlowB} />

      <audio ref={audioRef} src={song.audioUrl} preload="auto" crossOrigin="anonymous" />

      <Hud
        score={s.score}
        combo={s.combo}
        accuracy={accuracy}
        progress={progress}
      />

      <HighwayView
        song={song}
        state={s}
        hitFx={hitFx}
        lanePressed={lanePressed}
        particles={particles}
      />

      {comboFlash && (
        <ComboFlash key={comboFlash.ts} flash={comboFlash} onDone={() => setComboFlash(null)} />
      )}

      {phase === "countdown" && (
        <Countdown onDone={() => setPhase("playing")} />
      )}

      <button style={styles.exitBtn} onClick={onExit}>✕</button>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Combo milestone flash
// -----------------------------------------------------------------------------

function ComboFlash({ flash, onDone }) {
  useEffect(() => {
    const id = setTimeout(onDone, 900);
    return () => clearTimeout(id);
  }, [onDone]);
  return (
    <div style={{
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      zIndex: 50,
      background: `radial-gradient(ellipse at center, ${flash.color}55 0%, transparent 60%)`,
      animation: "uh-combo-flash 0.9s ease-out forwards",
    }}>
      <div style={{
        position: "absolute",
        top: "35%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        fontSize: "5rem",
        color: flash.color,
        textShadow: `0 0 40px ${flash.color}, 0 0 80px ${flash.color}, 0 0 120px #fff`,
        fontFamily: FONT_STACK,
        letterSpacing: "0.05em",
        animation: "uh-combo-flash-text 0.9s ease-out forwards",
      }}>
        {flash.combo} COMBO!
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Highway: perspective-tilted 4-lane scrolling track.
// -----------------------------------------------------------------------------

function HighwayView({ song, state, hitFx, lanePressed, particles }) {
  const { widthPx, heightPx, perspectiveDeg, noteTravelMs, noteSizePx, hitLineFromBottom } = HIGHWAY;
  const laneW = widthPx / LANES.length;
  const hitY = heightPx - hitLineFromBottom;
  const pxPerMs = hitY / noteTravelMs;

  return (
    <div style={{ ...styles.highwayWrap, perspective: "900px" }}>
      <div
        style={{
          ...styles.highway,
          width: widthPx,
          height: heightPx,
          transform: `rotateX(${perspectiveDeg}deg)`,
        }}
      >
        {/* Lane backgrounds */}
        {LANES.map((lane) => (
          <div
            key={`bg-${lane.id}`}
            style={{
              position: "absolute",
              left: lane.id * laneW,
              top: 0,
              width: laneW,
              height: heightPx,
              background: lanePressed[lane.id]
                ? `linear-gradient(to bottom, ${lane.color}08 0%, ${lane.color}44 90%, ${lane.color}88 100%)`
                : `linear-gradient(to bottom, transparent 0%, ${lane.color}18 100%)`,
              borderLeft: lane.id === 0 ? "none" : `1px solid ${COLORS.laneDivider}`,
              transition: "background 0.15s",
            }}
          />
        ))}

        {/* Moving fret lines (scroll illusion) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `repeating-linear-gradient(
              to bottom,
              transparent 0,
              transparent 58px,
              ${COLORS.fretLine} 58px,
              ${COLORS.fretLine} 60px
            )`,
            backgroundPositionY: `${(Math.max(0, state.currentMs) * pxPerMs) % 60}px`,
          }}
        />

        {/* Notes */}
        {state.notes.map((n) => {
          if (n.judged) return null;
          const dt = n.time - state.currentMs;
          if (dt > noteTravelMs + 50) return null;
          if (dt < -TIMING.good - 50) return null;
          const y = hitY - dt * pxPerMs - noteSizePx / 2;
          const lane = LANES[n.lane];
          return (
            <div
              key={n.id}
              style={{
                position: "absolute",
                left: n.lane * laneW + (laneW - noteSizePx) / 2,
                top: y,
                width: noteSizePx,
                height: noteSizePx * 0.55,
                borderRadius: noteSizePx,
                background: `radial-gradient(ellipse at 50% 40%, #ffffffee, ${lane.color} 50%, ${lane.shadow})`,
                boxShadow: `0 0 30px ${lane.glow}aa, 0 0 60px ${lane.glow}55, 0 4px 0 ${lane.shadow}, inset 0 2px 8px #fff8`,
                border: `2px solid ${lane.color}`,
              }}
            />
          );
        })}

        {/* Hit line */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: hitY,
            width: widthPx,
            height: "4px",
            background: "linear-gradient(90deg, transparent, #ffffffdd, transparent)",
            boxShadow: "0 0 24px #fff, 0 0 48px #fff9",
          }}
        />

        {/* Hit circles (targets) */}
        {LANES.map((lane) => {
          const isPressed = !!lanePressed[lane.id];
          return (
            <div
              key={`target-${lane.id}`}
              style={{
                position: "absolute",
                left: lane.id * laneW + (laneW - noteSizePx) / 2,
                top: hitY - noteSizePx * 0.27,
                width: noteSizePx,
                height: noteSizePx * 0.55,
                borderRadius: noteSizePx,
                border: `3px solid ${isPressed ? "#fff" : lane.color + "cc"}`,
                boxShadow: isPressed
                  ? `0 0 40px ${lane.glow}, 0 0 80px ${lane.glow}66, inset 0 0 24px ${lane.color}`
                  : `0 0 14px ${lane.color}77`,
                background: isPressed
                  ? `radial-gradient(ellipse at 50% 40%, ${lane.color}cc, transparent 70%)`
                  : "transparent",
                transition: "box-shadow 0.08s, background 0.08s",
              }}
            />
          );
        })}
      </div>

      {/* Flat overlay: hit text + particles + tactile buttons */}
      <FlatOverlay hitFx={hitFx} lanePressed={lanePressed} particles={particles} />
    </div>
  );
}

function FlatOverlay({ hitFx, lanePressed, particles }) {
  const { widthPx } = HIGHWAY;
  const laneW = widthPx / LANES.length;

  return (
    <div style={styles.flatOverlay}>
      {/* Particle bursts */}
      {particles.map((p) => (
        <ParticleBurst key={p.id} particle={p} laneW={laneW} />
      ))}

      {/* Floating hit text */}
      {LANES.map((lane) => {
        const fx = hitFx[lane.id];
        if (!fx) return null;
        const color =
          fx.kind === "perfect" ? COLORS.perfect :
          fx.kind === "good"    ? COLORS.good :
                                  COLORS.miss;
        return (
          <div
            key={`fx-${lane.id}-${fx.ts}`}
            style={{
              position: "absolute",
              left: lane.id * laneW + laneW / 2,
              bottom: 220,
              color,
              fontSize: "1.3rem",
              letterSpacing: "0.1em",
              textShadow: `0 0 18px ${color}, 0 0 32px ${color}`,
              animation: "uh-pop-in 0.7s ease-out forwards",
              pointerEvents: "none",
              fontWeight: 900,
            }}
          >
            {fx.text}
          </div>
        );
      })}

      {/* Physical-feel buttons (click/tap for touch play) */}
      <div style={styles.btnRow}>
        {LANES.map((lane) => {
          const isPressed = !!lanePressed[lane.id];
          return (
            <button
              key={lane.id}
              onMouseDown={() => emitInput(lane.id, "press")}
              onMouseUp={() => emitInput(lane.id, "release")}
              onMouseLeave={() => isPressed && emitInput(lane.id, "release")}
              onTouchStart={(e) => { e.preventDefault(); emitInput(lane.id, "press"); }}
              onTouchEnd={(e) => { e.preventDefault(); emitInput(lane.id, "release"); }}
              style={{
                ...styles.btn,
                background: isPressed
                  ? `radial-gradient(circle at 40% 35%, #fff8, ${lane.color} 45%, ${lane.shadow})`
                  : `radial-gradient(circle at 40% 35%, ${lane.color}cc, ${lane.shadow})`,
                boxShadow: isPressed
                  ? `0 0 48px 12px ${lane.glow}cc, 0 0 96px 24px ${lane.glow}55, inset 0 2px 8px #fff5`
                  : `0 6px 0 ${lane.shadow}, 0 8px 24px ${lane.color}44, inset 0 2px 4px #fff3`,
                transform: isPressed ? "scale(0.94) translateY(3px)" : "scale(1)",
                border: `3px solid ${isPressed ? "#fff9" : lane.color + "88"}`,
              }}
              aria-label={`String ${lane.label}`}
            >
              <span style={styles.btnLabel}>{lane.label}</span>
              <span style={styles.btnKey}>{lane.key.toUpperCase()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ParticleBurst({ particle, laneW }) {
  // Generate 10 particles with deterministic angles per burst
  const count = particle.kind === "perfect" ? 14 : 8;
  const parts = Array.from({ length: count }).map((_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const dist = 60 + (i % 3) * 25;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 20;
    return { dx, dy, i };
  });
  const cx = particle.lane * laneW + laneW / 2;
  return (
    <>
      {parts.map(({ dx, dy, i }) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: cx,
            bottom: 200,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: particle.color,
            boxShadow: `0 0 12px ${particle.color}, 0 0 24px ${particle.color}`,
            animation: `uh-particle 0.7s ease-out forwards`,
            // CSS variables pass per-particle trajectories
            "--dx": `${dx}px`,
            "--dy": `${dy}px`,
            pointerEvents: "none",
          }}
        />
      ))}
    </>
  );
}

// -----------------------------------------------------------------------------
// Game state helpers
// -----------------------------------------------------------------------------

function createState(song) {
  return {
    currentMs: -LEAD_IN_MS,
    score: 0,
    combo: 0,
    maxCombo: 0,
    notes: song.chart.map((n, i) => ({
      id: i,
      lane: n.lane,
      time: n.time,
      judged: false,
      result: null,
    })),
    stats: {
      total: song.chart.length,
      perfect: 0,
      good: 0,
      miss: 0,
      judgedForAcc: 0,
    },
  };
}

function judgePress(s, lane) {
  let best = null;
  let bestDelta = Infinity;
  for (const n of s.notes) {
    if (n.judged) continue;
    if (n.lane !== lane) continue;
    const delta = Math.abs(n.time - s.currentMs);
    if (delta < bestDelta) { bestDelta = delta; best = n; }
    if (n.time - s.currentMs > TIMING.good) break;
  }
  if (!best || bestDelta > TIMING.good) return null;

  best.judged = true;
  let kind, text, pts;
  if (bestDelta <= TIMING.perfect) {
    kind = "perfect"; text = "PERFECT"; pts = SCORE.perfect;
    s.stats.perfect += 1;
  } else {
    kind = "good"; text = "GOOD"; pts = SCORE.good;
    s.stats.good += 1;
  }
  best.result = kind;
  s.combo += 1;
  if (s.combo > s.maxCombo) s.maxCombo = s.combo;
  s.score += pts * multiplierFor(s.combo);
  s.stats.judgedForAcc += 1;

  return { kind, text };
}

function computeProgress(s) {
  if (!s.notes.length) return 0;
  const last = s.notes[s.notes.length - 1].time;
  return Math.max(0, Math.min(1, Math.max(0, s.currentMs) / last));
}

function finalStats(s) {
  return {
    score: s.score,
    maxCombo: s.maxCombo,
    perfect: s.stats.perfect,
    good: s.stats.good,
    miss: s.stats.miss,
    total: s.stats.total,
  };
}

// -----------------------------------------------------------------------------

const styles = {
  root: {
    position: "fixed",
    inset: 0,
    background: `radial-gradient(ellipse at 50% 20%, ${COLORS.bg1} 0%, ${COLORS.bg0} 60%, #000 100%)`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: FONT_STACK,
    color: "#fff",
    overflow: "hidden",
    userSelect: "none",
  },
  bgDots: {
    position: "absolute",
    inset: 0,
    backgroundImage: "radial-gradient(circle, #ffffff09 1px, transparent 1px)",
    backgroundSize: "30px 30px",
    pointerEvents: "none",
  },
  bgGlowA: {
    position: "absolute",
    top: "10%",
    left: "10%",
    width: "400px",
    height: "400px",
    background: "radial-gradient(circle, #f682f422 0%, transparent 70%)",
    filter: "blur(60px)",
    pointerEvents: "none",
    animation: "uh-bg-drift 16s ease-in-out infinite",
  },
  bgGlowB: {
    position: "absolute",
    bottom: "5%",
    right: "10%",
    width: "500px",
    height: "500px",
    background: "radial-gradient(circle, #4d9eff22 0%, transparent 70%)",
    filter: "blur(70px)",
    pointerEvents: "none",
    animation: "uh-bg-drift 22s ease-in-out infinite reverse",
  },
  highwayWrap: {
    position: "relative",
  },
  highway: {
    position: "relative",
    transformStyle: "preserve-3d",
    transformOrigin: "center bottom",
    background: `linear-gradient(to bottom, ${COLORS.highwayTop} 0%, ${COLORS.highwayBottom} 100%)`,
    borderLeft: "1px solid #ffffff33",
    borderRight: "1px solid #ffffff33",
    boxShadow: "0 0 80px #000c, inset 0 0 80px #000c",
  },
  flatOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    pointerEvents: "none",
  },
  btnRow: {
    position: "absolute",
    bottom: 30,
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    gap: "1.2rem",
    pointerEvents: "auto",
  },
  btn: {
    width: "100px",
    height: "100px",
    borderRadius: "18px",
    cursor: "pointer",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    outline: "none",
    transition: "transform 0.08s cubic-bezier(.17,.67,.35,1.2), box-shadow 0.08s, background 0.08s, border 0.08s",
    overflow: "hidden",
    flexShrink: 0,
    color: "#fff",
  },
  btnLabel: {
    fontSize: "1.6rem",
    fontWeight: 900,
    textShadow: "0 2px 6px #0008",
  },
  btnKey: {
    position: "absolute",
    bottom: 6,
    right: 8,
    fontSize: "0.65rem",
    color: "#ffffff77",
    letterSpacing: "0.05em",
    fontFamily: "monospace",
  },
  exitBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "#ffffff10",
    border: "1px solid #ffffff33",
    color: "#fff",
    cursor: "pointer",
    fontSize: "1rem",
    zIndex: 20,
  },
};
