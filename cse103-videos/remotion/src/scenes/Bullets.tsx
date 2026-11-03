import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Rich} from '../Rich';
import {appear, beatIndexAt, Chips, revealFrame, SceneFrame} from '../common';
import {C, tagColor} from '../theme';
import type {SceneT} from '../types';

export const Bullets: React.FC<{scene: SceneT}> = ({scene}) => {
  const frame = useCurrentFrame();
  const bi = beatIndexAt(scene.beats, frame);
  const shown = scene.beats[bi].show ?? 0;
  const color = tagColor(scene.data.tag);
  const items: {t: string; codes?: string; chip?: string; sub?: boolean}[] = scene.data.items;
  const progress = scene.data.progress as {labels: string[]; active: number} | undefined;
  return (
    <SceneFrame scene={scene} base={scene.data.size ?? 50} min={26}>
      {(size) => (
        <div style={{display: 'flex', flexDirection: 'column', gap: size * 0.42}}>
          {progress ? (
            <div style={{display: 'flex', gap: 14, marginBottom: 6}}>
              {progress.labels.map((l, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    padding: '8px 20px',
                    borderRadius: 10,
                    background: i === progress.active ? color : 'rgba(255,255,255,0.06)',
                    color: i === progress.active ? '#08121e' : i < progress.active ? C.dim : C.faint,
                    border: `2px solid ${i === progress.active ? color : 'rgba(255,255,255,0.12)'}`,
                  }}
                >
                  {l}
                </div>
              ))}
            </div>
          ) : null}
          {items.map((it, i) => {
            const at = revealFrame(scene.beats, i);
            const o = appear(frame, at);
            const current = i < shown && (i === shown - 1 || revealFrame(scene.beats, i) === revealFrame(scene.beats, shown - 1));
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: size * 0.5,
                  alignItems: 'flex-start',
                  opacity: o * (current || shown === 0 ? 1 : 0.72),
                  transform: `scale(${0.95 + 0.05 * o})`,
                  transformOrigin: 'left center',
                  marginLeft: it.sub ? size * 1.2 : 0,
                }}
              >
                <div
                  style={{
                    flex: '0 0 auto',
                    width: size * 0.42,
                    height: size * 0.42,
                    marginTop: size * 0.47,
                    borderRadius: scene.data.tag === 'ASKED AS' ? 4 : 999,
                    background: current ? color : 'rgba(255,255,255,0.35)',
                  }}
                />
                <div style={{flex: 1}}>
                  {it.chip ? (
                    <span
                      style={{
                        fontSize: '0.56em',
                        fontWeight: 800,
                        color: C.example,
                        border: `1.5px solid ${C.example}`,
                        borderRadius: 6,
                        padding: '0.15em 0.4em',
                        marginRight: '0.45em',
                        verticalAlign: '0.2em',
                        letterSpacing: 1,
                      }}
                    >
                      {it.chip}
                    </span>
                  ) : null}
                  <Rich text={it.t} />
                  <Chips codes={it.codes} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SceneFrame>
  );
};
