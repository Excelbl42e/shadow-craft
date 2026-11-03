# CSE103 marking-scheme booklet → explainer videos (Remotion)

One MP4 per Part of `source/CSE103_Marking_Scheme_Booklet.pdf` (74 pages, Parts 0–10).

## Layout
```
source/                 booklet PDF + pdftotext extraction (booklet.txt) + rendered pages
remotion/               Remotion (React) project: scenes, subtitles, header, chapter progress bar
pipeline/
  lib.mjs               script expansion, TTS voice settings, helpers
  tts.mjs               neural TTS per narration beat (OpenAI gpt-4o-mini-tts or ElevenLabs), cached
  build.mjs             timeline + .srt + transcript + chapters (txt + ffmetadata) + narration script
  render.mjs            stills (--stills / --frames) or full MP4; chapter metadata muxed with ffmpeg
  verify.mjs            cross-check of a part's script against the booklet text
parts/partN/
  script.mjs            SOURCE OF TRUTH: chapters (one per subsection) → scenes → narration beats
  figures/              figures extracted from the PDF
  audio/                TTS clips + manifest.json (exact durations)
  out/                  PartN.mp4, PartN.srt, PartN_transcript.txt, PartN_chapters.txt,
                        PartN_narration_script.md, PartN_verification.md, stills/, audit logs
```

## Make a part
```
cd remotion && npm install && cd ..
export OPENAI_API_KEY=...            # or ELEVENLABS_API_KEY=...
node pipeline/tts.mjs 1              # voice every beat (no key => refuses; no robotic fallback)
node pipeline/build.mjs 1            # timings come from the real audio durations
node pipeline/verify.mjs 1           # subsections / paper codes / mark-scheme answers / mark sums
node pipeline/render.mjs 1 --stills  # one still per scene + layout audit (overflow = error)
node pipeline/render.mjs 1           # full MP4 with embedded chapters
```
Without audio, build marks the timeline as a draft (timing estimated at ~153 wpm, "DRAFT · NO VOICE" badge).

## Checks built in
* Every scene's text box auto-fits; anything that still overflows logs `AUDIT OVERFLOW` (render fails review).
* Subtitles: ≤ 2 lines on screen (checked in the browser), no overlapping cues, min cue length reported.
* Header/heading truncation is logged as an error.
