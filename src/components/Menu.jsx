import { useEffect, useRef, useState } from "react";
import { LANES, COLORS, FONT_STACK } from "../theme";
import { useSongLibrary, addUploadedFile, removeSong } from "../audio/songLibrary";

export default function Menu({ onStart }) {
  const { songs, loading } = useSongLibrary();
  const [selectedId, setSelectedId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState(null);
  const fileRef = useRef(null);

  // Auto-select first song when library finishes loading
  useEffect(() => {
    if (!selectedId && songs.length) setSelectedId(songs[0].id);
  }, [songs, selectedId]);

  const song = songs.find((s) => s.id === selectedId);

  // Pulse the strings
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPulse((p) => (p + 1) % LANES.length), 280);
    return () => clearInterval(id);
  }, []);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadErr(null);
    setUploading(true);
    try {
      const added = await addUploadedFile(file);
      setSelectedId(added.id);
    } catch (err) {
      setUploadErr(err.message || String(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={styles.root}>
      {/* Animated background layers */}
      <div style={styles.bgDots} />
      <FloatingNotesBg />
      <div style={styles.bgGlowA} />
      <div style={styles.bgGlowB} />

      {/* Header */}
      <div style={styles.titleWrap}>
        <h1 style={styles.title}>
          <span style={{ ...styles.titlePart, color: LANES[0].color, textShadow: `0 0 32px ${LANES[0].color}, 0 0 12px ${LANES[0].color}` }}>Uku</span>
          <span style={{ ...styles.titlePart, color: LANES[1].color, textShadow: `0 0 32px ${LANES[1].color}, 0 0 12px ${LANES[1].color}` }}>lele</span>
          <span style={styles.titleHero}> Hero</span>
        </h1>
        <p style={styles.tagline}>4 strings · 4 keys · infinite aloha</p>
      </div>

      {/* Animated strings */}
      <div style={styles.stringRow}>
        {LANES.map((b, i) => (
          <div
            key={b.id}
            style={{
              ...styles.string,
              background: `linear-gradient(to bottom, ${b.color}, ${b.color}22)`,
              boxShadow: pulse === i ? `0 0 32px ${b.glow}, 0 0 60px ${b.glow}55` : `0 0 8px ${b.color}44`,
              transform: pulse === i ? "scaleY(1.12)" : "scaleY(1)",
            }}
          />
        ))}
      </div>

      {/* Song picker */}
      <div style={styles.picker}>
        <div style={styles.pickerLabel}>CHOOSE YOUR JAM</div>

        {loading && songs.length === 0 && (
          <div style={styles.loadingBox}>Loading songs…</div>
        )}

        <div style={styles.songList}>
          {songs.map((s) => (
            <SongCard
              key={s.id}
              song={s}
              selected={s.id === selectedId}
              onSelect={() => setSelectedId(s.id)}
              onRemove={s.source === "upload" ? () => {
                if (selectedId === s.id) setSelectedId(null);
                removeSong(s.id);
              } : null}
            />
          ))}

          {uploading && <div style={styles.loadingBox}>Analyzing BPM…</div>}

          <button style={styles.addBtn} onClick={() => fileRef.current?.click()}>
            <span style={styles.addIcon}>＋</span>
            <span>Add Song</span>
            <span style={styles.addSub}>mp3 · wav · m4a · ogg</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            onChange={handleFile}
            style={{ display: "none" }}
          />
        </div>

        {uploadErr && <div style={styles.err}>{uploadErr}</div>}
      </div>

      {/* Play button */}
      <button
        style={{
          ...styles.playBtn,
          opacity: song ? 1 : 0.45,
          pointerEvents: song ? "auto" : "none",
        }}
        onClick={() => song && onStart(song)}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.06)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        ▶  PLAY
      </button>

      <div style={styles.hint}>
        Press <kbd style={styles.kbd}>A</kbd> <kbd style={styles.kbd}>S</kbd>{" "}
        <kbd style={styles.kbd}>D</kbd> <kbd style={styles.kbd}>F</kbd> to strum
      </div>
    </div>
  );
}

function SongCard({ song, selected, onSelect, onRemove }) {
  const color = song.color || "#f682f4";
  return (
    <button
      onClick={onSelect}
      style={{
        ...styles.songCard,
        borderColor: selected ? color : "#ffffff22",
        background: selected
          ? `linear-gradient(135deg, ${color}22, #0d0d1aaa)`
          : "#ffffff06",
        transform: selected ? "scale(1.03) translateY(-2px)" : "scale(1)",
        boxShadow: selected
          ? `0 14px 40px ${color}55, 0 0 30px ${color}44, inset 0 0 0 1px ${color}`
          : "0 6px 20px #00000055",
      }}
    >
      <div
        style={{
          ...styles.songCardArt,
          background: `radial-gradient(circle at 35% 35%, #ffffff22, ${color} 60%, #0d0d1a)`,
          boxShadow: selected ? `0 0 24px ${color}, inset 0 0 16px #000` : "none",
          animation: selected ? "uh-bg-drift 4s ease-in-out infinite" : undefined,
        }}
      >
        <div style={styles.songCardVinyl} />
      </div>
      <div style={styles.songCardText}>
        <div style={styles.songCardTitle}>{song.title}</div>
        <div style={styles.songCardMeta}>
          {song.artist} · {song.bpm} BPM
        </div>
        <div style={styles.songCardSub}>
          {Math.round(song.durationMs / 1000)}s · {song.source === "upload" ? "uploaded" : "preview"}
        </div>
      </div>
      {onRemove && (
        <span
          role="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={styles.removeBtn}
          title="Remove"
        >✕</span>
      )}
    </button>
  );
}

function FloatingNotesBg() {
  // Inline <style> to keep the component self-contained.
  return (
    <>
      <style>{`
        @keyframes uh-float-up {
          0%   { transform: translateY(20px) rotate(-15deg); opacity: 0; }
          10%  { opacity: 0.4; }
          100% { transform: translateY(-100vh) rotate(15deg); opacity: 0; }
        }
      `}</style>
      <div style={styles.floatNotes}>
        {Array.from({ length: 14 }).map((_, i) => {
          const color = LANES[i % 4].color;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${(i * 73) % 100}%`,
                bottom: "-40px",
                fontSize: `${0.8 + (i % 3) * 0.4}rem`,
                color,
                textShadow: `0 0 12px ${color}`,
                animation: `uh-float-up ${10 + (i % 5) * 3}s linear ${i * 0.9}s infinite`,
                opacity: 0,
              }}
            >
              ♪
            </div>
          );
        })}
      </div>
    </>
  );
}

const styles = {
  root: {
    position: "fixed",
    inset: 0,
    background: `radial-gradient(ellipse at 50% 30%, ${COLORS.bg1} 0%, ${COLORS.bg0} 60%, #000 100%)`,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: FONT_STACK,
    userSelect: "none",
    overflow: "hidden",
    padding: "2rem 1rem",
  },
  bgDots: {
    position: "absolute",
    inset: 0,
    backgroundImage: "radial-gradient(circle, #ffffff0d 1px, transparent 1px)",
    backgroundSize: "30px 30px",
    pointerEvents: "none",
    animation: "uh-bg-drift 18s ease-in-out infinite",
  },
  bgGlowA: {
    position: "absolute",
    top: "10%",
    left: "20%",
    width: "500px",
    height: "500px",
    background: "radial-gradient(circle, #f682f433 0%, transparent 70%)",
    filter: "blur(60px)",
    pointerEvents: "none",
    animation: "uh-bg-drift 14s ease-in-out infinite",
  },
  bgGlowB: {
    position: "absolute",
    bottom: "10%",
    right: "15%",
    width: "600px",
    height: "600px",
    background: "radial-gradient(circle, #4d9eff22 0%, transparent 70%)",
    filter: "blur(70px)",
    pointerEvents: "none",
    animation: "uh-bg-drift 20s ease-in-out infinite reverse",
  },
  floatNotes: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
  },
  titleWrap: {
    textAlign: "center",
    zIndex: 2,
    animation: "uh-title-float 4s ease-in-out infinite",
  },
  title: {
    fontSize: "clamp(2.8rem, 9vw, 5.5rem)",
    margin: 0,
    lineHeight: 1,
    letterSpacing: "-0.02em",
  },
  titlePart: {
    transition: "text-shadow 0.3s",
  },
  titleHero: {
    color: "#ffffff",
    fontStyle: "italic",
    textShadow: "0 0 20px #fff7",
  },
  tagline: {
    marginTop: "0.8rem",
    color: COLORS.textDim,
    letterSpacing: "0.15em",
    fontSize: "0.85rem",
    textTransform: "uppercase",
  },
  stringRow: {
    display: "flex",
    gap: "2.2rem",
    height: "70px",
    marginTop: "1.2rem",
    marginBottom: "1rem",
    zIndex: 2,
  },
  string: {
    width: "4px",
    height: "70px",
    borderRadius: "4px",
    transition: "box-shadow 0.25s, transform 0.25s",
  },
  picker: {
    zIndex: 2,
    maxWidth: "720px",
    width: "100%",
    marginTop: "0.2rem",
  },
  pickerLabel: {
    fontSize: "0.65rem",
    letterSpacing: "0.25em",
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: "0.8rem",
  },
  loadingBox: {
    padding: "1rem",
    textAlign: "center",
    color: COLORS.textDim,
    fontSize: "0.8rem",
    letterSpacing: "0.1em",
  },
  songList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.6rem",
  },
  songCard: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    padding: "0.8rem",
    borderRadius: "14px",
    border: "1px solid #ffffff22",
    background: "#ffffff06",
    cursor: "pointer",
    fontFamily: FONT_STACK,
    color: "#fff",
    textAlign: "left",
    transition: "transform 0.2s cubic-bezier(.17,.67,.35,1.2), border-color 0.2s, box-shadow 0.2s, background 0.2s",
    position: "relative",
    width: "100%",
  },
  songCardArt: {
    width: 56,
    height: 56,
    borderRadius: 10,
    flexShrink: 0,
    position: "relative",
    overflow: "hidden",
  },
  songCardVinyl: {
    position: "absolute",
    inset: "20%",
    borderRadius: "50%",
    background: "radial-gradient(circle, #0d0d1a 22%, #ffffff22 23%, #0d0d1a 24%, #ffffff11 30%, #0d0d1a 32%, #ffffff11 40%, #0d0d1a 42%)",
    border: "1px solid #ffffff22",
  },
  songCardText: {
    flex: 1,
    minWidth: 0,
  },
  songCardTitle: {
    fontSize: "1rem",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  songCardMeta: {
    fontSize: "0.72rem",
    color: COLORS.textDim,
    letterSpacing: "0.05em",
    marginTop: "0.1rem",
  },
  songCardSub: {
    fontSize: "0.6rem",
    color: COLORS.textMuted,
    letterSpacing: "0.1em",
    marginTop: "0.15rem",
    textTransform: "uppercase",
  },
  removeBtn: {
    position: "absolute",
    top: 6,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: "50%",
    background: "#ffffff15",
    color: "#ffffffaa",
    fontSize: "0.7rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  addBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.8rem",
    padding: "0.8rem",
    borderRadius: 14,
    border: "1px dashed #ffffff33",
    background: "transparent",
    color: "#ffffffcc",
    cursor: "pointer",
    fontFamily: FONT_STACK,
    fontSize: "0.9rem",
  },
  addIcon: {
    fontSize: "1.4rem",
    color: "#fff",
  },
  addSub: {
    fontSize: "0.6rem",
    color: COLORS.textMuted,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  err: {
    marginTop: "0.6rem",
    padding: "0.5rem 0.8rem",
    borderRadius: 6,
    background: "#ff4d6d22",
    border: "1px solid #ff4d6d66",
    color: "#ffb3c1",
    fontSize: "0.75rem",
    textAlign: "center",
  },
  playBtn: {
    marginTop: "1.4rem",
    fontSize: "1.4rem",
    padding: "0.9rem 3.2rem",
    borderRadius: "999px",
    border: "none",
    background: "linear-gradient(135deg, #f682f4, #4d9eff, #54e4e9)",
    backgroundSize: "200% 200%",
    color: "#fff",
    cursor: "pointer",
    fontFamily: FONT_STACK,
    letterSpacing: "0.12em",
    boxShadow: "0 10px 40px #f682f466, 0 0 80px #4d9eff44, inset 0 -3px 0 #0005",
    transition: "transform 0.15s",
    zIndex: 2,
    animation: "uh-gradient-shift 4s ease infinite",
  },
  hint: {
    marginTop: "1.2rem",
    color: COLORS.textMuted,
    fontSize: "0.8rem",
    letterSpacing: "0.05em",
    zIndex: 2,
  },
  kbd: {
    display: "inline-block",
    padding: "2px 8px",
    border: "1px solid #ffffff33",
    borderRadius: "4px",
    margin: "0 2px",
    fontFamily: "monospace",
    background: "#ffffff08",
    color: "#fff",
  },
};
