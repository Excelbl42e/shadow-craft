// Usage:
//   node pipeline/render.mjs <part> --stills        one still per scene (final state) + audit log
//   node pipeline/render.mjs <part> --frames a,b,c  specific frames
//   node pipeline/render.mjs <part>                 full MP4 + chapters muxed in
import {bundle} from '@remotion/bundler';
import {openBrowser, renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {partDir, PARTS, ROOT} from './lib.mjs';

const require = createRequire(path.join(ROOT, 'remotion', 'package.json'));
void require;

const n = Number(process.argv[2] ?? 1);
const args = process.argv.slice(3);
const dir = partDir(n);
const out = path.join(dir, 'out');
const tl = JSON.parse(fs.readFileSync(path.join(dir, 'build', 'timeline.json'), 'utf8'));
const BROWSER = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';

const auditLines = new Set();
const onBrowserLog = (log) => {
  if (log.text.includes('AUDIT')) auditLines.add(`[${log.type}] ${log.text}`);
};

console.time('bundle');
const serveUrl = await bundle({entryPoint: path.join(ROOT, 'remotion', 'src', 'index.ts'), publicDir: PARTS});
console.timeEnd('bundle');
const browser = await openBrowser('chrome', {browserExecutable: BROWSER, chromiumOptions: {gl: 'swiftshader'}});
const inputProps = {timeline: tl};
const composition = await selectComposition({serveUrl, id: 'Part', inputProps, puppeteerInstance: browser, browserExecutable: BROWSER});

const writeAudit = (name) => {
  const lines = [...auditLines].sort();
  fs.writeFileSync(path.join(out, name), lines.join('\n') + '\n');
  const errs = lines.filter((l) => l.startsWith('[error]'));
  console.log(`audit: ${lines.length} lines, ${errs.length} errors -> ${name}`);
  for (const e of errs) console.log('  ' + e);
};

if (args[0] === '--stills' || args[0] === '--frames') {
  const sdir = path.join(out, args[0] === '--stills' ? 'scene_stills' : 'stills');
  fs.rmSync(sdir, {recursive: true, force: true});
  fs.mkdirSync(sdir, {recursive: true});
  let frames;
  if (args[0] === '--stills') {
    // final state of each scene: 10 frames before the end (all units revealed)
    frames = tl.scenes.map((s) => ({f: s.start + s.dur - 10, name: s.key}));
  } else {
    frames = args[1].split(',').map((f) => ({f: Number(f), name: `f${String(f).padStart(6, '0')}`}));
  }
  console.time('stills');
  for (const {f, name} of frames) {
    await renderStill({
      composition,
      serveUrl,
      inputProps,
      frame: f,
      output: path.join(sdir, `${name}.png`),
      puppeteerInstance: browser,
      onBrowserLog,
      scale: args.includes('--half') ? 0.5 : 1,
    });
  }
  console.timeEnd('stills');
  writeAudit(args[0] === '--stills' ? 'audit_stills.log' : 'audit_frames.log');
} else {
  const base = tl.draft ? `Part${n}_DRAFT_no_voice` : `Part${n}`;
  const raw = path.join(dir, 'build', `${base}_raw.mp4`);
  const final = path.join(out, `${base}.mp4`);
  console.time('render');
  let last = 0;
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    crf: 20,
    outputLocation: raw,
    inputProps,
    puppeteerInstance: browser,
    concurrency: Number(process.env.CONCURRENCY || 4),
    onBrowserLog,
    muted: tl.draft,
    audioCodec: 'aac',
    audioBitrate: '160k',
    onProgress: ({progress}) => {
      const p = Math.floor(progress * 100);
      if (p >= last + 5) {
        last = p;
        console.log(`render ${p}%`);
      }
    },
  });
  console.timeEnd('render');
  writeAudit('audit_render.log');
  // mux chapter metadata (no re-encode)
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', raw, '-i', path.join(dir, 'build', 'chapters.ffmeta'), '-map', '0', '-map_metadata', '1', '-map_chapters', '1', '-c', 'copy', '-movflags', '+faststart', final]);
  console.log('wrote ' + final);
}
await browser.close({silent: true});
