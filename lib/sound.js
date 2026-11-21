'use client';
let ctx = null, master = null, musicG = null, enabled = false, musicOn = false, timer = null, step = 0, nextT = 0, mode = 0;
const KEY = 'ww-sound';
export const soundPref = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
function ensure() {
  if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false; ctx = new AC(); master = ctx.createGain(); master.gain.value = 1.2; master.connect(ctx.destination); musicG = ctx.createGain(); musicG.gain.value = 0.45; musicG.connect(master); }
  if (ctx.state === 'suspended') ctx.resume();
  return true;
}
export const isEnabled = () => enabled;
export function enable(opts = {}) { if (!ensure()) return false; enabled = true; try { localStorage.setItem(KEY, '1'); } catch {} if (opts.music) startMusic(); return true; }
export function disable() { enabled = false; try { localStorage.setItem(KEY, '0'); } catch {} stopMusic(); }
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
function tone(t, m, d, type = 'triangle', v = 0.25, dest = null, attack = 0.01) {
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = mtof(m);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + d + 0.05);
}
export function sfx(name) {
  if (!enabled || !ctx) return;
  const t = ctx.currentTime + 0.02;
  if (name === 'clue') { tone(t, 72, 0.15); tone(t + 0.12, 79, 0.25); }
  else if (name === 'lock') { tone(t, 55, 0.12, 'square', 0.2); tone(t + 0.1, 48, 0.2, 'square', 0.2); }
  else if (name === 'bull') { [72, 76, 79, 84, 88].forEach((m, i) => tone(t + i * 0.09, m, 0.4)); }
  else if (name === 'good') { [67, 72, 76].forEach((m, i) => tone(t + i * 0.12, m, 0.35)); }
  else if (name === 'miss') { tone(t, 55, 0.3, 'sawtooth', 0.18); tone(t + 0.25, 50, 0.5, 'sawtooth', 0.18); }
  else if (name === 'turn') { tone(t, 76, 0.12, 'sine', 0.15); }
  else if (name === 'tick') { tone(t, 96, 0.04, 'square', 0.06); }
  else if (name === 'send') { tone(t, 79, 0.1, 'sine', 0.2); tone(t + 0.08, 86, 0.2, 'sine', 0.2); }
  else if (name === 'whoosh') { noiseBurst(t, 0.6, 400, 3500); }
  else if (name === 'win') { [60, 64, 67, 72, 67, 72, 76, 79].forEach((m, i) => tone(t + i * 0.16, m, 0.4)); }
}

function noiseBurst(t, dur, f0, f1) {
  const len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + dur * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(master); src.start(t);
}

// ---------- เพลงพื้นหลัง (สังเคราะห์) ----------
const CHORDS = [[48, 55, 59, 64], [45, 52, 55, 60], [41, 48, 52, 57], [43, 50, 55, 59]]; // Cmaj7, Am7, Fmaj7, G6
const ARP = [0, 2, 3, 2, 1, 3, 2, 1];
export function isMusic() { return musicOn; }
export function setMode(m) { mode = m; } // 0 ผ่อนคลาย, 1 ลุ้น (เร็วขึ้น + เสียงนาฬิกา)
export function startMusic() {
  if (!ctx || musicOn) return;
  musicOn = true; step = 0; nextT = ctx.currentTime + 0.1;
  timer = setInterval(pump, 100);
}
export function stopMusic() { musicOn = false; clearInterval(timer); timer = null; }
function pump() {
  if (!musicOn || !ctx) return;
  while (nextT < ctx.currentTime + 0.35) {
    const bpm = mode === 1 ? 112 : 92;
    const eighth = 60 / bpm / 2;
    const bar = Math.floor(step / 8) % 4, k = step % 8, t = nextT;
    const ch = CHORDS[bar];
    if (k === 0) {
      ch.forEach((m, i) => tone(t, m + (i ? 12 : 0), eighth * 8.2, 'triangle', 0.05, musicG, 0.35));
      tone(t, ch[0] - 12, eighth * 4, 'sine', 0.16, musicG, 0.02);
    }
    if (k === 4) tone(t, ch[0] - 12, eighth * 3, 'sine', 0.1, musicG, 0.02);
    tone(t, ch[ARP[k]] + 24, eighth * 1.6, 'sine', mode === 1 ? 0.075 : 0.055, musicG, 0.008);
    if (k % 2 === 1) noiseHat(t, mode === 1 ? 0.05 : 0.03);
    if (mode === 1 && k % 2 === 0) tone(t, k % 4 === 0 ? 100 : 96, 0.03, 'square', 0.035, musicG);
    step++; nextT += eighth;
  }
}
function noiseHat(t, v) {
  const len = Math.floor(ctx.sampleRate * 0.04), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
  const g = ctx.createGain(); g.gain.value = v; src.connect(f); f.connect(g); g.connect(musicG); src.start(t);
}
