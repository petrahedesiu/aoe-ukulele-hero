import { useState, useEffect, useCallback } from "react";

const BUTTONS = [
  {
    id: 0,
    label: "G",
    color: "#FF4D6D",
    glow: "#FF4D6D",
    shadow: "#8B0000",
    darkBg: "#2a0a0f",
    key: "a",
    emoji: "🌺",
  },
  {
    id: 1,
    label: "C",
    color: "#FFD700",
    glow: "#FFD700",
    shadow: "#7a6000",
    darkBg: "#2a2200",
    key: "s",
    emoji: "🌻",
  },
  {
    id: 2,
    label: "E",
    color: "#00C896",
    glow: "#00C896",
    shadow: "#004d3a",
    darkBg: "#002a1e",
    key: "d",
    emoji: "🍀",
  },
  {
    id: 3,
    label: "A",
    color: "#4D9EFF",
    glow: "#4D9EFF",
    shadow: "#003a7a",
    darkBg: "#001a2a",
    key: "f",
    emoji: "🌊",
  },
];

export default function UkuleleHero() {
  const [pressed, setPressed] = useState({});
  const [ripples, setRipples] = useState({});

  const triggerPress = useCallback((id) => {
    setPressed((prev) => ({ ...prev, [id]: true }));
    setRipples((prev) => ({ ...prev, [id]: Date.now() }));
    setTimeout(() => {
      setPressed((prev) => ({ ...prev, [id]: false }));
    }, 300);
  }, []);

  useEffect(() => {
    const keyMap = {};
    BUTTONS.forEach((b) => (keyMap[b.key] = b.id));

    const onDown = (e) => {
      const id = keyMap[e.key.toLowerCase()];
      if (id !== undefined && !pressed[id]) triggerPress(id);
    };
    window.addEventListener("keydown", onDown);
    return () => window.removeEventListener("keydown", onDown);
  }, [triggerPress, pressed]);

  return (
    <div style={styles.root}>
      {/* Decorative background dots */}
      <div style={styles.bgDots} />

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.ukuIcon}>🪗</div>
        <h1 style={styles.title}>
          <span style={styles.titleUku}>Uku</span>
          <span style={styles.titleLele}>lele</span>
          <span style={styles.titleHero}> Hero</span>
        </h1>
        <p style={styles.subtitle}>Press A S D F or tap to strum!</p>
      </div>

      {/* Strings decoration */}
      <div style={styles.stringsRow}>
        {BUTTONS.map((b) => (
          <div
            key={b.id}
            style={{
              ...styles.string,
              background: `linear-gradient(to bottom, ${b.color}88, ${b.color}22)`,
              boxShadow: pressed[b.id] ? `0 0 12px ${b.color}` : "none",
            }}
          />
        ))}
      </div>

      {/* Buttons */}
      <div style={styles.buttonRow}>
        {BUTTONS.map((b) => {
          const isPressed = !!pressed[b.id];
          return (
            <button
              key={b.id}
              onMouseDown={() => triggerPress(b.id)}
              onTouchStart={(e) => {
                e.preventDefault();
                triggerPress(b.id);
              }}
              style={{
                ...styles.btn,
                background: isPressed
                  ? `radial-gradient(circle at 40% 35%, #fff8, ${b.color} 45%, ${b.shadow})`
                  : `radial-gradient(circle at 40% 35%, ${b.color}cc, ${b.shadow})`,
                boxShadow: isPressed
                  ? `0 0 40px 10px ${b.glow}cc, 0 0 80px 20px ${b.glow}55, inset 0 2px 8px #fff5`
                  : `0 6px 0 ${b.shadow}, 0 8px 24px ${b.color}44, inset 0 2px 4px #fff3`,
                transform: isPressed ? "scale(0.93) translateY(4px)" : "scale(1) translateY(0)",
                border: `3px solid ${isPressed ? "#fff9" : b.color + "88"}`,
              }}
              aria-label={`String ${b.label}`}
            >
              {/* Inner shine */}
              <div style={styles.btnShine} />

              {/* Emoji */}
              <span style={{ ...styles.btnEmoji, fontSize: isPressed ? "2rem" : "1.6rem" }}>
                {b.emoji}
              </span>

              {/* Note label */}
              <span
                style={{
                  ...styles.btnLabel,
                  color: isPressed ? "#fff" : "#ffffffcc",
                  textShadow: isPressed ? `0 0 12px #fff` : "none",
                }}
              >
                {b.label}
              </span>

              {/* Key hint */}
              <span style={styles.keyHint}>{b.key.toUpperCase()}</span>

              {/* Ripple */}
              {isPressed && (
                <div
                  key={ripples[b.id]}
                  style={{
                    ...styles.ripple,
                    background: `radial-gradient(circle, #ffffff55, transparent 70%)`,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Footer fret board bar */}
      <div style={styles.fretBar}>
        <div style={styles.fretBarInner} />
        {BUTTONS.map((b) => (
          <div
            key={b.id}
            style={{
              ...styles.fretDot,
              background: pressed[b.id] ? b.color : "#ffffff22",
              boxShadow: pressed[b.id] ? `0 0 10px ${b.color}` : "none",
            }}
          />
        ))}
        <div style={styles.fretBarInner} />
      </div>

      <p style={styles.footer}>
        🎵 4 strings · 4 colors · 1 song to rule them all
      </p>
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #0d0d1a 0%, #1a0d2e 50%, #0d1a1a 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Fredoka One', 'Nunito', cursive, sans-serif",
    padding: "2rem 1rem",
    overflow: "hidden",
    position: "relative",
    userSelect: "none",
  },
  bgDots: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "radial-gradient(circle, #ffffff09 1px, transparent 1px)",
    backgroundSize: "30px 30px",
    pointerEvents: "none",
  },
  header: {
    textAlign: "center",
    marginBottom: "2rem",
    zIndex: 1,
  },
  ukuIcon: {
    fontSize: "3rem",
    marginBottom: "0.5rem",
    display: "block",
    filter: "drop-shadow(0 0 12px #ff4d6d88)",
  },
  title: {
    fontSize: "clamp(2.5rem, 8vw, 4.5rem)",
    margin: 0,
    lineHeight: 1,
    letterSpacing: "-0.02em",
  },
  titleUku: {
    color: "#FF4D6D",
    textShadow: "0 0 20px #FF4D6D88",
  },
  titleLele: {
    color: "#FFD700",
    textShadow: "0 0 20px #FFD70088",
  },
  titleHero: {
    color: "#ffffff",
    fontStyle: "italic",
  },
  subtitle: {
    color: "#ffffffaa",
    fontSize: "1rem",
    marginTop: "0.5rem",
    letterSpacing: "0.05em",
  },
  stringsRow: {
    display: "flex",
    gap: "4.2rem",
    height: "60px",
    alignItems: "flex-start",
    marginBottom: "-10px",
    zIndex: 1,
  },
  string: {
    width: "3px",
    height: "60px",
    borderRadius: "4px",
    transition: "box-shadow 0.1s",
  },
  buttonRow: {
    display: "flex",
    gap: "1.5rem",
    zIndex: 2,
  },
  btn: {
    width: "110px",
    height: "110px",
    borderRadius: "18px",
    cursor: "pointer",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    outline: "none",
    transition: "transform 0.1s cubic-bezier(.17,.67,.35,1.2), box-shadow 0.1s, background 0.1s, border 0.1s",
    overflow: "hidden",
    flexShrink: 0,
  },
  btnShine: {
    position: "absolute",
    top: "6px",
    left: "12px",
    width: "40%",
    height: "30%",
    background: "linear-gradient(135deg, #ffffff44, transparent)",
    borderRadius: "50%",
    pointerEvents: "none",
  },
  btnEmoji: {
    display: "block",
    transition: "font-size 0.1s",
    lineHeight: 1,
    marginBottom: "4px",
    zIndex: 1,
  },
  btnLabel: {
    fontSize: "1.5rem",
    fontWeight: "900",
    transition: "color 0.1s, text-shadow 0.1s",
    zIndex: 1,
    lineHeight: 1,
  },
  keyHint: {
    position: "absolute",
    bottom: "6px",
    right: "8px",
    fontSize: "0.65rem",
    color: "#ffffff55",
    fontWeight: "700",
    letterSpacing: "0.05em",
  },
  ripple: {
    position: "absolute",
    inset: 0,
    borderRadius: "16px",
    animation: "rippleFade 0.35s ease-out forwards",
    pointerEvents: "none",
  },
  fretBar: {
    display: "flex",
    alignItems: "center",
    gap: "3.3rem",
    marginTop: "1.5rem",
    zIndex: 1,
  },
  fretBarInner: {
    width: "20px",
    height: "6px",
    background: "#ffffff22",
    borderRadius: "3px",
  },
  fretDot: {
    width: "14px",
    height: "14px",
    borderRadius: "50%",
    transition: "background 0.15s, box-shadow 0.15s",
  },
  footer: {
    marginTop: "2rem",
    color: "#ffffff44",
    fontSize: "0.8rem",
    letterSpacing: "0.08em",
    zIndex: 1,
  },
};

// Inject keyframes for ripple
const styleTag = document.createElement("style");
styleTag.innerHTML = `
  @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@700;900&display=swap');
  @keyframes rippleFade {
    from { opacity: 1; transform: scale(0.8); }
    to   { opacity: 0; transform: scale(1.3); }
  }
  * { box-sizing: border-box; }
  button { -webkit-tap-highlight-color: transparent; }
`;
document.head.appendChild(styleTag);
