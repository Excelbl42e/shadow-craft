import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {audit} from './common';
import {Bullets} from './scenes/Bullets';
import {Compare} from './scenes/Compare';
import {Flow} from './scenes/Flow';
import {Code, Figure, Symbols, Title} from './scenes/Misc';
import {C, FONT, H, HEADER_H, SIDE, W} from './theme';
import type {SceneT, Timeline} from './types';

const SceneSwitch: React.FC<{scene: SceneT}> = ({scene}) => {
  switch (scene.kind) {
    case 'title':
      return <Title scene={scene} />;
    case 'bullets':
      return <Bullets scene={scene} />;
    case 'compare':
      return <Compare scene={scene} />;
    case 'flow':
      return <Flow scene={scene} />;
    case 'code':
      return <Code scene={scene} />;
    case 'symbols':
      return <Symbols scene={scene} />;
    case 'image':
      return <Figure scene={scene} />;
    default:
      return null;
  }
};

const SUB_FS = 40;
const SUB_LH = 1.3;

const Subtitles: React.FC<{tl: Timeline}> = ({tl}) => {
  const frame = useCurrentFrame();
  const cue = tl.cues.find((c) => c.from <= frame && frame < c.to);
  if (!cue) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 880,
        height: 170,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: FONT,
      }}
    >
      <div
        ref={(el) => {
          if (!el) return;
          const lines = Math.round((el.clientHeight - 24) / (SUB_FS * SUB_LH));
          if (lines > 2) audit(`SUBTITLE_LINES=${lines} at frame ${cue.from}: ${cue.text}`, 'error');
        }}
        style={{
          maxWidth: 1640,
          background: 'rgba(0,0,0,0.78)',
          color: '#fff',
          fontSize: SUB_FS,
          lineHeight: SUB_LH,
          fontWeight: 500,
          padding: '12px 28px',
          borderRadius: 12,
          textAlign: 'center',
          textWrap: 'balance',
        } as React.CSSProperties}
      >
        {cue.text}
      </div>
    </div>
  );
};

const Header: React.FC<{tl: Timeline}> = ({tl}) => {
  const frame = useCurrentFrame();
  let ch = tl.chapters[0];
  for (const c of tl.chapters) if (c.start <= frame) ch = c;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: HEADER_H,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `0 ${SIDE}px`,
        fontFamily: FONT,
        borderBottom: `1px solid ${C.cardEdge}`,
        background: 'rgba(0,0,0,0.18)',
      }}
    >
      <div style={{fontSize: 26, color: C.dim, fontWeight: 600, whiteSpace: 'nowrap'}}>
        <span style={{color: C.learn, fontWeight: 800}}>CSE103</span> · Part {tl.part} · {tl.partTitle}
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 18, maxWidth: 1150}}>
        {tl.draft ? (
          <div style={{fontSize: 18, fontWeight: 800, color: '#ff6b6b', border: '2px solid #ff6b6b', borderRadius: 6, padding: '2px 8px', whiteSpace: 'nowrap'}}>
            DRAFT · NO VOICE
          </div>
        ) : null}
        <div
          ref={(el) => {
            if (el && el.scrollWidth > el.clientWidth + 1) audit(`OVERFLOW header chapter=${ch.id}`, 'error');
          }}
          style={{fontSize: 24, color: C.text, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}
        >
          {ch.id === 'intro' || ch.id === 'end' ? ch.title : `${ch.id} · ${ch.title}`}
        </div>
      </div>
    </div>
  );
};

const Progress: React.FC<{tl: Timeline}> = ({tl}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 10, background: 'rgba(255,255,255,0.08)'}}>
      <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(frame / tl.totalFrames) * 100}%`, background: C.learn}} />
      {tl.chapters.slice(1).map((c, i) => (
        <div key={i} style={{position: 'absolute', top: 0, bottom: 0, width: 3, left: `${(c.start / tl.totalFrames) * 100}%`, background: C.bg1}} />
      ))}
    </div>
  );
};

export const PartVideo: React.FC<{timeline: Timeline | null}> = ({timeline: tl}) => {
  if (!tl) return <AbsoluteFill style={{background: C.bg1}} />;
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse at 30% 20%, ${C.bg2} 0%, ${C.bg1} 70%)`, width: W, height: H}}>
      <Header tl={tl} />
      {tl.scenes.map((s) => (
        <Sequence key={s.key} from={s.start} durationInFrames={s.dur} layout="none">
          <SceneSwitch scene={s} />
        </Sequence>
      ))}
      {tl.audio.map((a, i) => (
        <Sequence key={i} from={a.from} durationInFrames={a.dur} layout="none">
          <Audio src={staticFile(a.src)} />
        </Sequence>
      ))}
      <Subtitles tl={tl} />
      <Progress tl={tl} />
    </AbsoluteFill>
  );
};
