#!/usr/bin/env bash
# Usage: pipeline/proof.sh <part> <mp4>
# Real-output proof read back from the rendered MP4: size, streams, duration, embedded chapters
# (compared with the exported chapter list) and six frames from different chapters, mid-sentence.
set -euo pipefail
N=$1; MP4=$2; OUT=parts/part$N/out/proof; mkdir -p "$OUT"

echo "== file"
ls -l "$MP4" | awk '{printf "%s  %.1f MB\n", $9, $5/1048576}'

echo "== streams"
ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,r_frame_rate -of compact=p=0 "$MP4"

echo "== duration"
ffprobe -v error -show_entries format=duration -of csv=p=0 "$MP4" | awk '{s=int($1); printf "%.2f s  (%d:%02d)\n",$1,s/60,s%60}'

echo "== embedded chapters (read back from the MP4)"
CH=$(ffprobe -v error -show_chapters -of json "$MP4" | node -e '
const c = JSON.parse(require("fs").readFileSync(0)).chapters;
for (const x of c) { const s = Math.round(+x.start_time); console.log(Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0") + "  " + x.tags.title); }')
echo "$CH" | awk '{printf "%6s  %s\n", $1, substr($0, index($0,$2))}'
echo "$(echo "$CH" | wc -l) chapters"
if diff <(echo "$CH") <(sed 's/^ *//' "parts/part$N/out/Part${N}_chapters.txt") >/dev/null; then
  echo "embedded chapters == Part${N}_chapters.txt"
else
  echo "MISMATCH between embedded chapters and Part${N}_chapters.txt"; exit 1
fi

echo "== frames (extracted from the MP4)"
node -e '
const tl = JSON.parse(require("fs").readFileSync("parts/part'"$N"'/build/timeline.json"));
// three diagram scenes + three text-heavy scenes (where cut-off text would show), from different chapters, mid-sentence
const diag = (s) => ["flow", "symbols", "code", "image"].includes(s.kind);
const text = (s) => ["compare", "bullets"].includes(s.kind);
const longest = (s) => JSON.stringify(s.data).length;
const used = new Set(), pick = [];
const take = (pred, n, order) => { for (const s of tl.scenes.filter(pred).sort(order)) { if (n === 0) break; if (used.has(s.chapter)) continue; used.add(s.chapter); pick.push(s); n--; } };
take(diag, 3, (a, b) => a.start - b.start);
take((s) => text(s) && s.data.tag === "MARK SCHEME" || text(s), 3, (a, b) => longest(b) - longest(a));
pick.sort((a, b) => a.start - b.start);
for (const s of pick) { const bt = s.beats[Math.floor(s.beats.length / 2)]; const fr = s.start + bt.start + Math.round(bt.dur * 0.5); console.log((fr / 30).toFixed(3) + " " + s.key); }
' | while read -r T K; do
  ffmpeg -nostdin -v error -y -ss "$T" -i "$MP4" -frames:v 1 "$OUT/${K}_t${T}.png"
  echo "$T s  $K"
done
