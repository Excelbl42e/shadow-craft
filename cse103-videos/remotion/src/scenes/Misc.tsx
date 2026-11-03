import React from 'react';
import {Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Rich} from '../Rich';
import {appear, beatIndexAt, revealFrame, SceneFrame} from '../common';
import {C, FONT, MONO, SIDE} from '../theme';
import type {SceneT} from '../types';
import {ShapePath} from './Shapes';

// ---- Title card ---------------------------------------------------------
export const Title: React.FC<{scene: SceneT}> = ({scene}) => {
  const frame = useCurrentFrame();
  const d = scene.data;
  const o = appear(frame, 0, 16);
  const bar = appear(frame, 6, 24);
  const stars = typeof d.star === 'number' ? d.star : d.star ? 1 : 0;
  return (
    <div style={{position: 'absolute', inset: 0, fontFamily: FONT, color: C.text}}>
      <div style={{position: 'absolute', left: SIDE + 40, right: SIDE + 40, top: 300}}>
        <div style={{fontSize: 34, color: C.dim, fontWeight: 600, letterSpacing: 3, opacity: o}}>{d.kicker}</div>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 40, marginTop: 16, opacity: o, transform: `translateY(${(1 - o) * 30}px)`}}>
          {d.id ? <div style={{fontSize: 150, fontWeight: 800, color: C.learn, lineHeight: 1, whiteSpace: 'nowrap'}}>{d.id}</div> : null}
          <div style={{fontSize: d.id ? 64 : 80, fontWeight: 700, lineHeight: 1.15}}>
            {d.title}
            {stars ? <span style={{color: C.accent, whiteSpace: 'nowrap'}}> {'★'.repeat(stars)}</span> : null}
          </div>
        </div>
        <div style={{marginTop: 36, height: 8, width: `${bar * 100}%`, background: `linear-gradient(90deg, ${C.learn}, ${C.mark})`, borderRadius: 4}} />
        <div style={{display: 'flex', gap: 24, alignItems: 'center', marginTop: 26, opacity: appear(frame, 12)}}>
          {d.chip ? (
            <div style={{border: `2px solid ${C.example}`, color: C.example, fontWeight: 800, fontSize: 26, letterSpacing: 1, padding: '6px 14px', borderRadius: 8}}>{d.chip}</div>
          ) : null}
          {stars ? <div style={{fontSize: 30, color: C.accent}}>{d.starNote || '★ appears in almost every paper'}</div> : null}
        </div>
      </div>
    </div>
  );
};

// ---- Pseudocode stepper ------------------------------------------------
export const Code: React.FC<{scene: SceneT}> = ({scene}) => {
  const frame = useCurrentFrame();
  const bi = beatIndexAt(scene.beats, frame);
  const beat = scene.beats[bi];
  const lines: {t: string; note?: string}[] = scene.data.lines;
  return (
    <SceneFrame scene={scene} base={50} min={26}>
      {(size) => (
        <div
          style={{
            background: C.code,
            border: `2px solid ${C.cardEdge}`,
            borderRadius: 18,
            padding: `${size * 0.6}px 0`,
            fontFamily: MONO,
            fontSize: size,
            lineHeight: 1.55,
          }}
        >
          {lines.map((l, i) => {
            const o = appear(frame, revealFrame(scene.beats, i), 10);
            const cur = beat.line === i;
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: `0 ${size}px`,
                  opacity: o,
                  background: cur ? 'rgba(255,209,102,0.16)' : 'transparent',
                  borderLeft: `8px solid ${cur ? C.accent : 'transparent'}`,
                }}
              >
                <span style={{whiteSpace: 'pre', color: C.codeText}}>{l.t}</span>
                {l.note ? <span style={{fontFamily: FONT, fontWeight: 800, color: C.mark}}>{l.note}</span> : null}
              </div>
            );
          })}
        </div>
      )}
    </SceneFrame>
  );
};

// ---- Flowchart symbol gallery -----------------------------------------
export const Symbols: React.FC<{scene: SceneT}> = ({scene}) => {
  const frame = useCurrentFrame();
  const bi = beatIndexAt(scene.beats, frame);
  const shown = scene.beats[bi].show ?? 0;
  const items: {shape: any; name: string; shapeName: string; desc: string}[] = scene.data.items;
  return (
    <SceneFrame scene={scene} base={30} min={20}>
      {(size) => (
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 22}}>
          {items.map((it, i) => {
            const o = appear(frame, revealFrame(scene.beats, i));
            const cur = i === shown - 1;
            return (
              <div
                key={i}
                style={{
                  background: cur ? 'rgba(255,255,255,0.09)' : C.card,
                  border: `2px solid ${cur ? C.accent : C.cardEdge}`,
                  borderRadius: 16,
                  padding: '14px 18px',
                  opacity: o,
                  transform: `scale(${0.92 + 0.08 * o})`,
                  lineHeight: 1.3,
                }}
              >
                <svg width={200} height={84} style={{display: 'block', margin: '0 auto 6px'}}>
                  <ShapePath shape={it.shape} x={14} y={10} w={172} h={64} stroke={cur ? C.accent : '#7fb2e5'} fill="rgba(78,168,255,0.12)" />
                  {it.shape === 'annotation' ? (
                    <line x1={74} y1={42} x2={186} y2={42} stroke={cur ? C.accent : '#7fb2e5'} strokeWidth={3} strokeDasharray="8 7" />
                  ) : null}
                </svg>
                <div style={{fontWeight: 800, fontSize: size * 1.25}}>{it.name}</div>
                <div style={{color: C.trap, fontSize: size * 0.95, marginBottom: 6}}>{it.shapeName}</div>
                <div style={{color: C.dim, fontSize: size}}>{it.desc}</div>
              </div>
            );
          })}
        </div>
      )}
    </SceneFrame>
  );
};

// ---- Figure from the PDF ----------------------------------------------
// Tall/normal figures sit left with notes on the right; wide figures sit on top with notes below.
export const Figure: React.FC<{scene: SceneT}> = ({scene}) => {
  const frame = useCurrentFrame();
  const d = scene.data;
  const z = interpolate(frame, [0, scene.dur], [1, 1.04], {extrapolateRight: 'clamp'});
  const o = appear(frame, 0, 14);
  const wide = d.w / d.h > 1.6;
  const notes = (
    <div style={{flex: 1, fontSize: 42, lineHeight: 1.4, display: 'flex', flexDirection: 'column', gap: 22}}>
      {(d.notes as string[]).map((t, i) => {
        const oo = appear(frame, revealFrame(scene.beats, i));
        return (
          <div key={i} style={{opacity: oo, transform: `scale(${0.95 + 0.05 * oo})`, transformOrigin: 'left center'}}>
            <Rich text={t} />
          </div>
        );
      })}
    </div>
  );
  const img = (
    <div
      style={{
        ...(wide ? {width: '100%'} : {height: '100%'}),
        aspectRatio: `${d.w} / ${d.h}`,
        background: '#fff',
        borderRadius: 16,
        padding: 14,
        boxSizing: 'border-box',
        opacity: o,
        overflow: 'hidden',
        flex: '0 0 auto',
      }}
    >
      <Img src={staticFile(d.src)} style={{width: '100%', height: '100%', objectFit: 'contain', transform: `scale(${z})`}} />
    </div>
  );
  return (
    <SceneFrame scene={scene} fit={false} base={30}>
      {() =>
        wide ? (
          <div style={{display: 'flex', flexDirection: 'column', gap: 40, height: '100%'}}>
            {img}
            {notes}
          </div>
        ) : (
          <div style={{display: 'flex', gap: 60, height: '100%', alignItems: 'center'}}>
            {img}
            {notes}
          </div>
        )
      }
    </SceneFrame>
  );
};
