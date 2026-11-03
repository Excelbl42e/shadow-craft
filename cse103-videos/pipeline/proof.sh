#!/usr/bin/env bash
# Usage: pipeline/proof.sh <part> <mp4>   — real-output proof: duration, size, chapters, frames from the MP4
set -euo pipefail
N=$1; MP4=$2; OUT=parts/part$N/out/proof; mkdir -p $OUT
echo "== file"; ls -l "$MP4" | awk '{printf "%s  %.1f MB\n", $9, $5/1048576}'
echo "== streams"; ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,r_frame_rate -of compact=p=0 "$MP4"
echo "== duration"; ffprobe -v error -show_entries format=duration -of csv=p=0 "$MP4" | awk '{s=int($1); printf "%.2f s  (%d:%02d)\n",$1,s/60,s%60}'
echo "== embedded chapters"; ffprobe -v error -show_chapters -of csv=p=0 "$MP4" | awk -F, '{s=int($5); printf "%2d:%02d  %s\n", s/60, s%60, $NF}'
echo "== frames"
node -e '
const tl=JSON.parse(require("fs").readFileSync("parts/part'$N'/build/timeline.json"));
const pick=[["_1.2_flow",2,0.55],["_1.4_compare",5,0.5],["_1.7_symbols",6,0.5],["s060_1.8_flow",5,0.15],["_1.10_compare",1,0.5],["_1.11_bullets",2,0.5]];
for (const [k,b,f] of pick){const s=tl.scenes.find(x=>x.key.includes(k)); const bt=s.beats[b]; const fr=s.start+bt.start+Math.round(bt.dur*f); console.log((fr/30).toFixed(3)+" "+s.key);}
' | while read T K; do ffmpeg -v error -y -ss $T -i "$MP4" -frames:v 1 "$OUT/${K}_t${T}.png"; echo "$T s  $K"; done
