import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PARTS = path.join(ROOT, 'parts');
export const FPS = 30;

export const partDir = (n) => path.join(PARTS, `part${n}`);

export async function loadScript(n) {
  const file = path.join(partDir(n), 'script.mjs');
  const mod = await import(pathToFileURL(file).href + `?t=${Date.now()}`);
  return mod.default;
}

// Narration markup: {shown|spoken} -> subtitles use "shown", TTS uses "spoken".
export const toDisplay = (s) => s.replace(/\{([^|}]*)\|([^}]*)\}/g, '$1');
export const toSpoken = (s) => s.replace(/\{([^|}]*)\|([^}]*)\}/g, '$2');

// TTS settings live here so the cache key changes if they change.
export const VOICE = {
  provider: process.env.TTS_PROVIDER || (process.env.ELEVENLABS_API_KEY ? 'elevenlabs' : 'openai'),
  openaiModel: 'gpt-4o-mini-tts',
  openaiVoice: 'coral',
  openaiInstructions:
    'Voice: a warm, friendly university tutor explaining exam material to one student. Pace: moderate and clear, never rushed. ' +
    'Pause briefly at commas and between ideas. Tone: encouraging and natural, not theatrical. Read code identifiers like myNumber as "my number".',
  elevenVoice: process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL',
  elevenModel: 'eleven_multilingual_v2',
};

export const beatHash = (spoken) =>
  crypto
    .createHash('sha1')
    .update(JSON.stringify([VOICE.provider, VOICE.provider === 'openai' ? [VOICE.openaiModel, VOICE.openaiVoice, VOICE.openaiInstructions] : [VOICE.elevenVoice, VOICE.elevenModel], spoken]))
    .digest('hex')
    .slice(0, 14);

export const readJSON = (f, dflt) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : dflt);

// --- expand a script into scenes with "reveal units" and beats -------------
const asArr = (x) => (x === undefined ? [] : Array.isArray(x) ? x : [x]);

function unitsFor(sc) {
  switch (sc.kind) {
    case 'bullets':
      return sc.items.map((it) => ({say: it.say}));
    case 'symbols':
      return sc.items.map((it) => ({say: it.say}));
    case 'code':
      return sc.lines.map((l, i) => ({say: l.say, line: i}));
    case 'image':
      return sc.notes.map((n) => ({say: n.say}));
    case 'flow':
      return sc.steps.map((s) => ({say: s.say, focus: s.focus, line: s.line, caption: s.caption}));
    case 'compare': {
      const cells = [];
      const order = sc.order || 'rows';
      const push = (r, c) => {
        const row = sc.rows[r];
        const txt = c === 0 ? row.a : row.b;
        if (!txt) return;
        const say = c === 0 ? row.sayA : row.sayB ?? row.say;
        cells.push({cell: [r, c], say});
      };
      if (order === 'cols') {
        for (let c = 0; c < 2; c++) for (let r = 0; r < sc.rows.length; r++) push(r, c);
      } else {
        for (let r = 0; r < sc.rows.length; r++) for (let c = 0; c < 2; c++) push(r, c);
      }
      return cells;
    }
    default:
      throw new Error('unknown scene kind ' + sc.kind);
  }
}

function sceneData(sc, units) {
  const {kind, items, lines, notes, steps, intro, outro, rows, ...rest} = sc;
  switch (kind) {
    case 'bullets':
      return {...rest, items: items.map(({say, ...it}) => it)};
    case 'symbols':
      return {...rest, items: items.map(({say, ...it}) => it)};
    case 'code':
      return {...rest, lines: lines.map(({say, ...l}) => l)};
    case 'image':
      return {...rest, notes: notes.map((n) => n.t)};
    case 'flow':
      return {...rest, units: steps.map((s) => ({show: s.show || []}))};
    case 'compare':
      return {...rest, rows, cells: units.map((u) => u.cell)};
  }
}

// Returns [{chapter, kind, data, beats:[{say, show, focus, line, caption}]}]
export function expand(script) {
  const out = [];
  script.chapters.forEach((ch, ci) => {
    const isIntro = ch.id === 'intro' || ch.id === 'end';
    out.push({
      chapter: ci,
      kind: 'title',
      data: {
        kicker: isIntro ? 'CSE103 System Development · Marking-scheme booklet' : `Part ${script.part} · ${script.partTitle}`,
        id: isIntro ? '' : ch.id,
        title: ch.cardTitle || ch.title,
        star: !!ch.star,
      },
      beats: [{say: ch.titleSay || `Section ${ch.id}: ${ch.spoken || ch.title}.${ch.star ? ' This one is starred.' : ''}`, show: 0}],
      isTitle: true,
    });
    for (const sc of ch.scenes) {
      const units = unitsFor(sc);
      const beats = [];
      for (const s of asArr(sc.intro)) beats.push({say: s, show: 0});
      units.forEach((u, k) => {
        for (const s of asArr(u.say)) beats.push({say: s, show: k + 1, focus: u.focus, line: u.line, caption: u.caption});
      });
      for (const s of asArr(sc.outro)) beats.push({say: s, show: units.length, ...(units.length ? {focus: units[units.length - 1].focus, line: units[units.length - 1].line, caption: units[units.length - 1].caption} : {})});
      if (!beats.length) throw new Error(`scene without narration in ${ch.id}: ${sc.heading}`);
      // every unit must end up visible
      beats[beats.length - 1].show = Math.max(beats[beats.length - 1].show, units.length);
      out.push({chapter: ci, kind: sc.kind, data: sceneData(sc, units), beats});
    }
  });
  return out;
}

export const fmtTime = (sec, sep = ',') => {
  const ms = Math.round(sec * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const r = ms % 1000;
  const p = (x, n = 2) => String(x).padStart(n, '0');
  return `${p(h)}:${p(m)}:${p(s)}${sep}${p(r, 3)}`;
};

export const fmtClock = (sec) => {
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
};
