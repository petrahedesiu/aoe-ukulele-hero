// Song library: in-memory store + reactive hook. Seeds with iTunes preview
// URLs for MONTERO and Shape of You so the game is playable out of the box.

import { useEffect, useState } from "react";
import { songFromUrl, songFromFile } from "./audioEngine";

// Known-good iTunes 30-second preview URLs. These are publicly hosted by
// Apple and served over HTTPS with CORS enabled — safe to fetch client-side.
const DEFAULT_SOURCES = [
  {
    id: "montero",
    title: "MONTERO (Call Me By Your Name)",
    artist: "Lil Nas X",
    bpm: 178,
    url: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview124/v4/6e/cd/99/6ecd9966-bbe2-36b5-35f1-cd8ed6406906/mzaf_3486740843482888093.plus.aac.p.m4a",
    color: "#f682f4",
  },
  {
    id: "shape-of-you",
    title: "Shape of You",
    artist: "Ed Sheeran",
    bpm: 96,
    url: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/44/c7/4f/44c74f0d-72dc-6143-d4d0-ba14d661ca0d/mzaf_9566898362556366703.plus.aac.p.m4a",
    color: "#54e4e9",
  },
];

const state = {
  songs: [],          // loaded song objects
  loading: false,     // true while defaults are fetching
  error: null,
};
const subs = new Set();

function notify() {
  for (const fn of subs) fn({ ...state });
}

export function subscribe(fn) {
  subs.add(fn);
  fn({ ...state });
  return () => subs.delete(fn);
}

let _bootPromise = null;
export function bootDefaults() {
  if (_bootPromise) return _bootPromise;
  state.loading = true;
  notify();
  _bootPromise = (async () => {
    try {
      for (const src of DEFAULT_SOURCES) {
        try {
          const song = await songFromUrl(src);
          song.color = src.color;
          state.songs.push(song);
          notify();
        } catch (e) {
          console.warn(`Failed to load default song ${src.id}`, e);
        }
      }
    } finally {
      state.loading = false;
      notify();
    }
  })();
  return _bootPromise;
}

export async function addUploadedFile(file) {
  const song = await songFromFile(file);
  song.color = "#ffd95a";
  state.songs.push(song);
  notify();
  return song;
}

export function removeSong(id) {
  const idx = state.songs.findIndex((s) => s.id === id);
  if (idx < 0) return;
  const [removed] = state.songs.splice(idx, 1);
  if (removed?.source === "upload" && removed.audioUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(removed.audioUrl);
  }
  notify();
}

// React hook wrapper.
export function useSongLibrary() {
  const [snap, setSnap] = useState({ ...state });
  useEffect(() => subscribe(setSnap), []);
  useEffect(() => { bootDefaults(); }, []);
  return snap;
}
