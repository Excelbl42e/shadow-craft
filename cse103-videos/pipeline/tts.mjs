// Usage: OPENAI_API_KEY=... node pipeline/tts.mjs <part>        (or ELEVENLABS_API_KEY=...)
// Voices every narration beat to parts/partN/audio/<hash>.mp3 (cached), records exact durations
// in audio/manifest.json. build.mjs then times scenes + subtitles from the real audio.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {beatHash, expand, loadScript, partDir, readJSON, toSpoken, VOICE} from './lib.mjs';

const n = Number(process.argv[2] ?? 1);
const onlyFirst = process.argv.includes('--sample') ? 6 : Infinity;
const dir = path.join(partDir(n), 'audio');
fs.mkdirSync(dir, {recursive: true});
const manifestFile = path.join(dir, 'manifest.json');
const manifest = readJSON(manifestFile, {});

const key = VOICE.provider === 'elevenlabs' ? process.env.ELEVENLABS_API_KEY : process.env.OPENAI_API_KEY;
if (!key) {
  console.error(`No ${VOICE.provider === 'elevenlabs' ? 'ELEVENLABS_API_KEY' : 'OPENAI_API_KEY'} set — refusing to fall back to a robotic voice.`);
  process.exit(2);
}

const script = await loadScript(n);
const beats = expand(script).flatMap((s) => s.beats.map((b) => toSpoken(b.say).trim()));
const todo = [...new Set(beats)].filter((t) => !manifest[beatHash(t)] || !fs.existsSync(path.join(dir, beatHash(t) + '.mp3'))).slice(0, onlyFirst);
console.log(`${beats.length} beats, ${todo.length} to synthesize with ${VOICE.provider}`);

async function synth(text) {
  if (VOICE.provider === 'elevenlabs') {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE.elevenVoice}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: {'xi-api-key': key, 'content-type': 'application/json'},
      body: JSON.stringify({text, model_id: VOICE.elevenModel, voice_settings: {stability: 0.5, similarity_boost: 0.75, style: 0.15, use_speaker_boost: true}}),
    });
    if (!r.ok) throw new Error(`ElevenLabs ${r.status}: ${await r.text()}`);
    return Buffer.from(await r.arrayBuffer());
  }
  const r = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {authorization: `Bearer ${key}`, 'content-type': 'application/json'},
    body: JSON.stringify({model: VOICE.openaiModel, voice: VOICE.openaiVoice, input: text, instructions: VOICE.openaiInstructions, response_format: 'mp3'}),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text()}`);
  return Buffer.from(await r.arrayBuffer());
}

const duration = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim());

let done = 0;
async function worker() {
  while (todo.length) {
    const text = todo.shift();
    const h = beatHash(text);
    const file = path.join(dir, h + '.mp3');
    for (let attempt = 1; ; attempt++) {
      try {
        fs.writeFileSync(file, await synth(text));
        break;
      } catch (e) {
        if (attempt >= 5) throw e;
        await new Promise((r) => setTimeout(r, 2000 * 2 ** (attempt - 1)));
      }
    }
    manifest[h] = {duration: duration(file), text};
    if (++done % 20 === 0) {
      fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 1));
      console.log(`  ${done} done`);
    }
  }
}
await Promise.all([worker(), worker(), worker(), worker()]);
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 1));
console.log(`synthesized ${done}; manifest has ${Object.keys(manifest).length} clips`);
