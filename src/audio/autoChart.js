// Generate a chart (array of { lane, time }) from a BPM + duration.
//
// Strategy: place one note per beat across the whole song, cycling through
// a hand-picked lane pattern for variety instead of random. Drops the first
// couple of beats (lead-in feel) and the last couple of beats (outro).
//
// The chart times are in milliseconds from audio t=0. Game.jsx syncs its
// clock to the HTMLAudioElement's currentTime, so "time" here is literally
// the audio timestamp at which the note should be hit.

// A 16-step dance-y pattern across the 4 lanes. Feels good for pop/EDM.
const DEFAULT_PATTERN = [
  0, 1, 2, 3,
  0, 2, 1, 3,
  2, 0, 3, 1,
  0, 1, 2, 3,
];

export function generateChart({
  bpm,
  durationMs,
  subdivision = 1,   // 1 = one note per beat, 2 = eighth notes, 0.5 = half notes
  padStartMs = 1500, // no notes before this offset
  padEndMs = 1500,   // no notes in the last N ms
  pattern = DEFAULT_PATTERN,
} = {}) {
  if (!bpm || !durationMs) return [];
  const msPerBeat = 60_000 / bpm;
  const step = msPerBeat / subdivision;

  const notes = [];
  const firstT = padStartMs;
  const lastT = Math.max(padStartMs, durationMs - padEndMs);

  let beatIdx = 0;
  for (let t = firstT; t <= lastT; t += step) {
    const lane = pattern[beatIdx % pattern.length];
    notes.push({ lane, time: Math.round(t) });
    beatIdx += 1;
  }
  return notes;
}
