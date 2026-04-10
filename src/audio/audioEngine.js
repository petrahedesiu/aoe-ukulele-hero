// Audio engine: decode files, detect BPM, expose a unified song object.
//
// A "song" is the thing the game plays:
//   { id, title, artist, bpm, durationMs, audioUrl, chart }
//
// Songs come from two sources:
//   1. Default library (iTunes 30s previews for MONTERO + Shape of You)
//   2. User uploads (File → decoded → BPM detected → auto-charted)

import { analyze } from "web-audio-beat-detector";
import { generateChart } from "./autoChart";

let _ctx = null;
function getCtx() {
  if (!_ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    _ctx = new C();
  }
  return _ctx;
}

// Decode an ArrayBuffer into an AudioBuffer.
export async function decodeArrayBuffer(arrayBuffer) {
  const ctx = getCtx();
  // Copy the buffer because decodeAudioData detaches it on some browsers
  const copy = arrayBuffer.slice(0);
  return await ctx.decodeAudioData(copy);
}

// Detect BPM with a fallback to 120.
export async function detectBpm(audioBuffer) {
  try {
    const bpm = await analyze(audioBuffer);
    return Math.round(bpm);
  } catch (err) {
    console.warn("BPM detection failed, falling back to 120", err);
    return 120;
  }
}

// Load an uploaded File into a playable song.
export async function songFromFile(file) {
  const url = URL.createObjectURL(file);
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await decodeArrayBuffer(arrayBuffer);
  const bpm = await detectBpm(audioBuffer);
  const durationMs = Math.round(audioBuffer.duration * 1000);
  const title = file.name.replace(/\.[^.]+$/, "");
  const chart = generateChart({ bpm, durationMs });
  return {
    id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    artist: "You",
    bpm,
    durationMs,
    audioUrl: url,
    chart,
    source: "upload",
  };
}

// Load a remote URL (used for iTunes previews). Fetches the audio, then
// runs the same decode → BPM → chart pipeline. We can also skip detection
// and pass an explicit BPM for known tracks — that's what the defaults do.
export async function songFromUrl({
  id,
  url,
  title,
  artist,
  bpm: knownBpm,
  source = "preview",
}) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`fetch ${url} → ${resp.status}`);
  const arrayBuffer = await resp.arrayBuffer();
  const audioBuffer = await decodeArrayBuffer(arrayBuffer);
  const bpm = knownBpm || (await detectBpm(audioBuffer));
  const durationMs = Math.round(audioBuffer.duration * 1000);
  const chart = generateChart({ bpm, durationMs });
  return {
    id,
    title,
    artist,
    bpm,
    durationMs,
    audioUrl: url,
    chart,
    source,
  };
}
