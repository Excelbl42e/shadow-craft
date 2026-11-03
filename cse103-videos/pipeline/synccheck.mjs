// Usage: OPENAI_API_KEY=... node pipeline/synccheck.mjs <part> [samples=25]
// Measures subtitle/voice sync on real audio: transcribes sampled beat clips with word timestamps
// (whisper-1) and compares each subtitle cue's start with the time its first word is spoken.
import fs from 'node:fs';
import path from 'node:path';
import {beatHash, FPS, partDir, toSpoken} from './lib.mjs';

const n = Number(process.argv[2] ?? 1);
const samples = Number(process.argv[3] ?? 25);
const key = process.env.OPENAI_API_KEY;
if (!key) {
  console.error('synccheck needs OPENAI_API_KEY (whisper word timestamps).');
  process.exit(2);
}
const dir = partDir(n);
const tl = JSON.parse(fs.readFileSync(path.join(dir, 'build', 'timeline.json'), 'utf8'));
if (tl.draft) {
  console.error('timeline is a draft (no audio) — run tts.mjs and build.mjs first');
  process.exit(2);
}
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, '');
const results = [];
const step = Math.max(1, Math.floor(tl.audio.length / samples));
for (let i = 0; i < tl.audio.length && results.length < samples; i += step) {
  const a = tl.audio[i];
  const file = path.join(path.dirname(dir), a.src);
  const fd = new FormData();
  fd.append('file', new Blob([fs.readFileSync(file)]), path.basename(file));
  fd.append('model', 'whisper-1');
  fd.append('response_format', 'verbose_json');
  fd.append('timestamp_granularities[]', 'word');
  const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {method: 'POST', headers: {authorization: `Bearer ${key}`}, body: fd});
  if (!r.ok) throw new Error(await r.text());
  const words = (await r.json()).words || [];
  // cues that fall inside this clip
  const cues = tl.cues.filter((c) => c.from >= a.from - 1 && c.from < a.from + a.dur);
  let wi = 0;
  for (const c of cues) {
    const first = norm(toSpoken(c.text).split(/\s+/)[0]);
    const j = words.findIndex((w, k) => k >= wi && norm(w.word) === first);
    if (j < 0) continue;
    wi = j + 1;
    const spoken = a.from / FPS + words[j].start;
    results.push({cue: c.text.slice(0, 50), offset: c.from / FPS - spoken});
  }
}
const abs = results.map((r) => Math.abs(r.offset)).sort((x, y) => x - y);
const p = (q) => abs[Math.min(abs.length - 1, Math.floor(q * abs.length))];
const lines = [
  `cues measured: ${results.length}`,
  `median |offset|: ${p(0.5).toFixed(2)} s, 90th pct: ${p(0.9).toFixed(2)} s, max: ${abs[abs.length - 1].toFixed(2)} s`,
  `cues more than 0.5 s off: ${abs.filter((x) => x > 0.5).length}`,
  ...results.filter((r) => Math.abs(r.offset) > 0.5).map((r) => `  ${r.offset.toFixed(2)} s  ${r.cue}`),
];
console.log(lines.join('\n'));
fs.writeFileSync(path.join(dir, 'out', `Part${n}_subtitle_sync.txt`), lines.join('\n') + '\n');
