// Usage: node pipeline/build.mjs <part>
// Builds timeline.json + .srt + transcript + chapter list + ffmetadata + narration script.
import fs from 'node:fs';
import path from 'node:path';
import {beatHash, expand, FPS, fmtClock, fmtTime, loadScript, partDir, readJSON, toDisplay, toSpoken} from './lib.mjs';

const n = Number(process.argv[2] ?? 1);
const script = await loadScript(n);
const dir = partDir(n);
const outDir = path.join(dir, 'out');
const buildDir = path.join(dir, 'build');
fs.mkdirSync(outDir, {recursive: true});
fs.mkdirSync(buildDir, {recursive: true});

const manifest = readJSON(path.join(dir, 'audio', 'manifest.json'), {});
const scenes = expand(script);

// pacing (seconds)
const TITLE_LEAD = 0.5;
const GAP_BEAT = 0.45; // small pause between ideas
const GAP_SCENE = 0.7;
const GAP_TITLE = 0.6;
const EST_WPS = 2.55; // only used when no audio exists (draft)

let missing = 0;
let t = 0;
const tl = {part: script.part, partTitle: script.partTitle, fps: FPS, totalFrames: 0, draft: false, chapters: [], scenes: [], audio: [], cues: []};
const transcript = [];
const fr = (sec) => Math.round(sec * FPS);

for (const [si, sc] of scenes.entries()) {
  const ch = script.chapters[sc.chapter];
  if (sc.isTitle) {
    tl.chapters.push({id: ch.id, title: ch.title, start: fr(t), end: 0});
    transcript.push({chapter: ch, start: t, lines: []});
  }
  const sceneStart = t;
  if (sc.isTitle) t += TITLE_LEAD;
  else t += 0.2;
  const beats = [];
  for (const b of sc.beats) {
    const spoken = toSpoken(b.say).trim();
    const shown = toDisplay(b.say).trim();
    const h = beatHash(spoken);
    let dur;
    if (manifest[h]) {
      dur = manifest[h].duration;
      tl.audio.push({src: `part${n}/audio/${h}.mp3`, from: fr(t), dur: fr(dur) + 2});
    } else {
      missing++;
      dur = spoken.split(/\s+/).length / EST_WPS + 0.3;
    }
    beats.push({start: fr(t) - fr(sceneStart), dur: fr(dur), show: b.show, focus: b.focus, line: b.line, caption: b.caption});
    // subtitle cues for this beat
    for (const c of cueChunks(b.say)) {
      // proportional to spoken characters within the beat
      tl.cues.push({from: fr(t + dur * c.f0), to: fr(t + dur * c.f1), text: c.text});
    }
    transcript[transcript.length - 1].lines.push({start: t, text: shown});
    t += dur + GAP_BEAT;
  }
  t += sc.isTitle ? GAP_TITLE - GAP_BEAT : GAP_SCENE - GAP_BEAT;
  tl.scenes.push({key: `s${String(si).padStart(3, '0')}_${ch.id}_${sc.kind}`, kind: sc.kind, chapter: sc.chapter, start: fr(sceneStart), dur: fr(t) - fr(sceneStart), data: sc.data, beats});
}
t += 0.8;
tl.totalFrames = fr(t);
tl.draft = missing > 0;
tl.chapters.forEach((c, i) => (c.end = i + 1 < tl.chapters.length ? tl.chapters[i + 1].start : tl.totalFrames));

// cue gaps: extend each cue to bridge tiny gaps, never overlap
tl.cues.sort((a, b) => a.from - b.from);
for (let i = 0; i < tl.cues.length; i++) {
  const nx = tl.cues[i + 1];
  if (nx) {
    if (tl.cues[i].to > nx.from) tl.cues[i].to = nx.from;
    else if (nx.from - tl.cues[i].to <= fr(GAP_BEAT) + 1) tl.cues[i].to = Math.min(nx.from, tl.cues[i].to + fr(0.25));
  }
}

fs.writeFileSync(path.join(buildDir, 'timeline.json'), JSON.stringify(tl));

// ---- .srt -----------------------------------------------------------------
const base = `Part${n}`;
const srt = tl.cues.map((c, i) => `${i + 1}\n${fmtTime(c.from / FPS)} --> ${fmtTime(c.to / FPS)}\n${wrap2(c.text)}\n`).join('\n');
fs.writeFileSync(path.join(outDir, `${base}.srt`), srt);

// ---- chapters -------------------------------------------------------------
const chapTitle = (c) => (c.id === 'intro' || c.id === 'end' ? c.title : `${c.id} ${c.title}`);
fs.writeFileSync(
  path.join(outDir, `${base}_chapters.txt`),
  tl.chapters.map((c) => `${fmtClock(c.start / FPS).padStart(5)}  ${chapTitle(c)}`).join('\n') + '\n',
);
fs.writeFileSync(
  path.join(buildDir, 'chapters.ffmeta'),
  ';FFMETADATA1\ntitle=CSE103 Part ' + n + ' - ' + script.partTitle + '\n' +
    tl.chapters
      .map((c) => `[CHAPTER]\nTIMEBASE=1/1000\nSTART=${Math.round((c.start / FPS) * 1000)}\nEND=${Math.round((c.end / FPS) * 1000)}\ntitle=${chapTitle(c).replace(/([=;#\\\n])/g, '\\$1')}\n`)
      .join(''),
);

// ---- transcript -----------------------------------------------------------
fs.writeFileSync(
  path.join(outDir, `${base}_transcript.txt`),
  `CSE103 System Development - Part ${n}: ${script.partTitle}\n\n` +
    transcript.map((s) => `[${fmtClock(s.start)}] ${chapTitle(s.chapter)}\n\n` + s.lines.map((l) => l.text).join(' ') + '\n').join('\n'),
);

// ---- human-readable narration script (narration + on-screen text) ---------
let md = `# CSE103 Part ${n} — ${script.partTitle}\n\nNarration script (generated from \`script.mjs\`). On-screen text is shown in quotes under each scene.\n\n`;
let ci = -1;
for (const sc of scenes) {
  if (sc.chapter !== ci) {
    ci = sc.chapter;
    const ch = script.chapters[ci];
    md += `\n## ${chapTitle(ch)}${ch.star ? ' ' + '★'.repeat(ch.star === 2 ? 2 : 1) : ''}${ch.chip ? ' (' + ch.chip + ')' : ''}\n\n`;
  }
  if (!sc.isTitle) md += `**[${sc.kind}${sc.data.tag ? ' · ' + sc.data.tag : ''}] ${sc.data.heading ?? ''}**\n\n`;
  for (const b of sc.beats) md += `- ${toDisplay(b.say)}\n`;
  md += '\n';
}
fs.writeFileSync(path.join(outDir, `${base}_narration_script.md`), md);

console.log(
  JSON.stringify({
    part: n,
    chapters: tl.chapters.length,
    scenes: tl.scenes.length,
    beats: tl.scenes.reduce((a, s) => a + s.beats.length, 0),
    cues: tl.cues.length,
    duration: fmtClock(tl.totalFrames / FPS),
    draft: tl.draft,
    beatsWithoutAudio: missing,
  }),
);

// ---------------------------------------------------------------------------
// Split a beat into subtitle chunks (<= MAX chars, max 2 lines on screen).
function cueChunks(say) {
  const MAX = 84; // target; the hard limit is 2 lines on screen (checked in the browser)
  const MERGE_MAX = 104;
  const words = [];
  const re = /\{[^}]*\}\S*|\S+/g;
  let m;
  while ((m = re.exec(say))) words.push({d: toDisplay(m[0]), s: toSpoken(m[0])});
  const len = (ws) => ws.map((w) => w.d).join(' ').length;
  // 1) sentences
  const sentences = [];
  let cur = [];
  words.forEach((w, i) => {
    cur.push(w);
    if (/[.!?:]["')]?$/.test(w.d) && len(cur) >= 20 && i < words.length - 1) {
      sentences.push(cur);
      cur = [];
    }
  });
  if (cur.length) sentences.push(cur);
  // 2) balanced split of long sentences, preferring punctuation near each target cut
  const chunks = [];
  for (const sen of sentences) {
    const L = len(sen);
    if (L <= MAX) {
      chunks.push(sen);
      continue;
    }
    const k = Math.ceil(L / MAX);
    let from = 0;
    for (let part = 1; part < k; part++) {
      const target = (L * part) / k;
      let best = -1;
      let bestScore = Infinity;
      for (let j = from; j < sen.length - 1; j++) {
        const pos = len(sen.slice(0, j + 1));
        const piece = len(sen.slice(from, j + 1));
        if (piece > MAX) break;
        let score = Math.abs(pos - target);
        if (/[,;:]$|—$/.test(sen[j].d)) score -= 14; // prefer natural pauses
        if (score < bestScore) {
          bestScore = score;
          best = j;
        }
      }
      if (best < from) best = from;
      chunks.push(sen.slice(from, best + 1));
      from = best + 1;
    }
    chunks.push(sen.slice(from));
  }
  // 3) merge short neighbours
  for (let i = chunks.length - 1; i > 0; i--) {
    const a = len(chunks[i - 1]);
    const b = len(chunks[i]);
    if ((b < 22 || a < 22) && a + b + 1 <= MERGE_MAX) {
      chunks[i - 1] = [...chunks[i - 1], ...chunks[i]];
      chunks.splice(i, 1);
    }
  }
  const total = chunks.reduce((a, c) => a + c.map((w) => w.s).join(' ').length + 1, 0);
  let acc = 0;
  return chunks.map((c) => {
    const l = c.map((w) => w.s).join(' ').length + 1;
    const r = {f0: acc / total, f1: (acc + l) / total, text: c.map((w) => w.d).join(' ')};
    acc += l;
    return r;
  });
}

function wrap2(text) {
  if (text.length <= 42) return text;
  // break near the middle at a space
  const mid = Math.floor(text.length / 2);
  let best = -1;
  for (let d = 0; d < mid; d++) {
    if (text[mid + d] === ' ') {
      best = mid + d;
      break;
    }
    if (text[mid - d] === ' ') {
      best = mid - d;
      break;
    }
  }
  return best < 0 ? text : text.slice(0, best) + '\n' + text.slice(best + 1);
}
