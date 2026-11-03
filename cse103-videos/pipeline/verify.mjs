// Usage: node pipeline/verify.mjs <part>
// Cross-checks a part's script against the booklet text (source/booklet.txt, from pdftotext -layout).
import fs from 'node:fs';
import path from 'node:path';
import {expand, loadScript, partDir, ROOT, toDisplay} from './lib.mjs';

const n = Number(process.argv[2] ?? 1);
const script = await loadScript(n);
const raw = fs.readFileSync(path.join(ROOT, 'source', 'booklet.txt'), 'utf8');

// ---- slice this part out of the booklet text --------------------------------
const lines = raw.split('\n');
const startIdx = lines.findIndex((l) => new RegExp(`^\\s*Part ${n} · `).test(l));
const endIdx = lines.findIndex((l, i) => i > startIdx && new RegExp(`^\\s*Part ${n + 1} · `).test(l));
const part = lines.slice(startIdx, endIdx).filter((l) => !/Marking-scheme booklet · page/.test(l));
const text = part.join('\n');

// everything the video shows or says, as one searchable string
const scenes = expand(script);
const all = [];
const walk = (v) => {
  if (typeof v === 'string') all.push(v);
  else if (Array.isArray(v)) v.forEach(walk);
  else if (v && typeof v === 'object') Object.values(v).forEach(walk);
};
walk(script.chapters);
const hay = toDisplay(all.join(' \n ')).replace(/\*\*/g, '').replace(/`/g, '').toLowerCase().replace(/\s+/g, ' ');
const has = (s) => hay.includes(s.toLowerCase().replace(/\s+/g, ' ').trim());

let problems = 0;
const report = [];
const out = (s) => {
  report.push(s);
  console.log(s);
};

// ---- 1. subsections --------------------------------------------------------
out(`# Part ${n} verification against the booklet (lines ${startIdx + 1}–${endIdx} of booklet.txt)\n`);
out('## 1. Subsections');
const subs = [...text.matchAll(/☐ (\d+\.\d+) (.+?)\s*$/gm)].map((m) => ({id: m[1], title: m[2].replace(/\s*★\s*$/, '').trim(), star: /★/.test(m[2])}));
const chapIds = script.chapters.map((c) => c.id);
let order = -1;
for (const s of subs) {
  const ci = chapIds.indexOf(s.id);
  const ch = script.chapters[ci];
  const titleOk = ch && ch.title.toLowerCase() === s.title.toLowerCase();
  const starOk = ch && !!ch.star === s.star;
  const inOrder = ci > order;
  order = Math.max(order, ci);
  const scenesN = scenes.filter((x) => x.chapter === ci && !x.isTitle).length;
  const ok = ch && titleOk && starOk && inOrder && scenesN > 0;
  if (!ok) problems++;
  out(`${ok ? 'OK  ' : 'FAIL'} ${s.id} ${s.title}${s.star ? ' ★' : ''}  ->  ${ch ? `chapter "${ch.title}"${ch.star ? ' ★' : ''}, ${scenesN} scenes` : 'MISSING'}${ch && !titleOk ? ' [title differs]' : ''}${ch && !starOk ? ' [star differs]' : ''}${!inOrder ? ' [out of order]' : ''}`);
}
const extra = script.chapters.filter((c) => !subs.find((s) => s.id === c.id)).map((c) => c.id);
out(`Extra chapters not in the booklet's subsection list: ${extra.join(', ') || 'none'} (intro = part blurb + how-to/paper-code legend from booklet p.1; end = how-to items 1 & 4 from p.1)`);

// ---- 2. paper codes in every ASKED AS block ---------------------------------
out('\n## 2. Paper codes from every ASKED AS block');
const blocks = [];
{
  let cur = null;
  let sub = null;
  for (const l of part) {
    const m = l.match(/☐ (\d+\.\d+)/);
    if (m) sub = m[1];
    if (/^\s*ASKED AS\s*$/.test(l)) {
      cur = {sub, text: ''};
      blocks.push(cur);
      continue;
    }
    if (/^\s*MARK SCHEME\s*$/.test(l)) {
      cur = null;
      continue;
    }
    if (cur) cur.text += ' ' + l.trim();
  }
}
for (const b of blocks) {
  // codes: RQ11, MQ17a, MQ5b, 13b, A23 Q2a, S24 Q5c, 21 Q1a, A23, A25, S24, 19, 21, 24
  const codes = new Set();
  for (const m of b.text.matchAll(/\b(RQ\d+|MQ\d+[a-z]?|(?:A23|S24|21) Q\d+[a-z]?|A2[35]|S24|T1|1[0-9][a-z]|2[0-9][a-z]|[5-9][a-z])\b/g)) codes.add(m[1]);
  // bare year codes only when they sit in a code list (after a mark like [2]. or another code)
  for (const m of b.text.matchAll(/(?:\]\.?|,|·)\s*((?:19|21|24)(?:\s*,\s*(?:19|21|24))*)\b/g)) m[1].split(/\s*,\s*/).forEach((c) => codes.add(c));
  const scriptCodes = new Set();
  const ch = script.chapters.find((c) => c.id === b.sub);
  JSON.stringify(ch).replace(/"codes":"([^"]+)"/g, (_, c) => c.split(/\s*,\s*/).forEach((x) => scriptCodes.add(x)));
  // also accept codes shown inside item text (e.g. 1.8 "A23 Q4b")
  const chText = JSON.stringify(ch);
  const missing = [...codes].filter((c) => !scriptCodes.has(c) && !chText.includes(c));
  if (missing.length) problems++;
  out(`${missing.length ? 'FAIL' : 'OK  '} ${b.sub}: ${codes.size} codes in booklet${missing.length ? ' — missing: ' + missing.join(', ') : ''}`);
}

// ---- 3. every labelled MARK SCHEME answer ----------------------------------
out('\n## 3. Labelled MARK SCHEME answers ("Label [n]:")');
const msLabels = [];
{
  let inMS = false;
  let sub = null;
  for (const l of part) {
    const m = l.match(/☐ (\d+\.\d+)/);
    if (m) {
      sub = m[1];
      inMS = false;
    }
    if (/^\s*MARK SCHEME\s*$/.test(l)) inMS = true;
    else if (/^\s*(LEARN|ASKED AS)\s*$/.test(l)) inMS = false;
    if (!inMS) continue;
    const mm = l.match(/^\s*([A-Z][^:\[]{2,60}?)\s*(\[[0-9][^\]]*\])/);
    if (mm) msLabels.push({sub, label: mm[1].trim(), marks: mm[2]});
  }
}
for (const x of msLabels) {
  const ok = has(x.label);
  if (!ok) problems++;
  out(`${ok ? 'OK  ' : 'FAIL'} ${x.sub} ${x.label} ${x.marks}`);
}

// ---- 4. mark badges add up -------------------------------------------------
out('\n## 4. Mark badges add up to the stated total (on-screen MARK SCHEME text)');
const sumBadges = (t) => [...t.matchAll(/\((1|2)\)/g)].reduce((a, m) => a + Number(m[1]), 0);
// Answers whose marks are given per item in the booklet text itself:
const PER_ITEM = {'Five symbols': {perItem: 2, items: 5, why: 'booklet: "draw each shape (1) + one-line description (1)" for each of 5 symbols'}};
for (const sc of scenes.filter((s) => s.data.tag === 'MARK SCHEME')) {
  const heading = sc.data.heading;
  const checks = []; // {label, want, text}
  if (sc.kind === 'bullets') {
    const labelled = sc.data.items.filter((i) => /^\*\*[^*]+?\s*\[\d+\]/.test(i.t));
    for (const i of labelled) {
      const m = i.t.match(/^\*\*([^*]+?)\s*\[(\d+)\]/);
      checks.push({label: m[1], want: Number(m[2]), text: i.t});
    }
    const hm = heading.match(/^([^·]+?)\s*\[(\d+)\]$/);
    if (!labelled.length && hm) checks.push({label: hm[1], want: Number(hm[2]), text: sc.data.items.map((i) => i.t).join(' ')});
  }
  if (sc.kind === 'compare') {
    const hm = heading.match(/^(.+?)\s*\[(\d+)\]$/);
    if (hm) checks.push({label: hm[1], want: Number(hm[2]), text: sc.data.cols.join(' ') + ' ' + sc.data.rows.map((r) => r.a + ' ' + r.b).join(' ')});
  }
  if (sc.kind === 'flow' && sc.data.side?.kind === 'list') {
    const hm = heading.match(/(\d+) marks/);
    if (hm) checks.push({label: heading, want: Number(hm[1]), text: sc.data.side.items.join(' ')});
  }
  for (const c of checks) {
    let got = sumBadges(c.text);
    let note = '';
    const pi = Object.entries(PER_ITEM).find(([k]) => c.label.startsWith(k));
    if (pi) {
      got = got * pi[1].items;
      note = ` (${sumBadges(c.text)} per item × ${pi[1].items}; ${pi[1].why})`;
    }
    if (got === 0) {
      out(`--   ${c.label} [${c.want}] — booklet gives no per-phrase marks`);
      continue;
    }
    const ok = got === c.want;
    if (!ok) problems++;
    out(`${ok ? 'OK  ' : 'FAIL'} ${c.label} [${c.want}] — badges sum to ${got}${note}`);
  }
}

out(`\n${problems === 0 ? 'ALL CHECKS PASSED' : problems + ' PROBLEM(S)'}`);
fs.writeFileSync(path.join(partDir(n), 'out', `Part${n}_verification.md`), report.join('\n') + '\n');
