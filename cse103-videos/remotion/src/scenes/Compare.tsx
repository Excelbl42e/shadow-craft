import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Rich} from '../Rich';
import {appear, beatIndexAt, revealFrame, SceneFrame} from '../common';
import {C} from '../theme';
import type {SceneT} from '../types';

// data: {cols:[A,B], rows:[{label?, a, b}], cells:[[r,c],...] (reveal order, computed by the pipeline)}
export const Compare: React.FC<{scene: SceneT}> = ({scene}) => {
  const frame = useCurrentFrame();
  const bi = beatIndexAt(scene.beats, frame);
  const shown = scene.beats[bi].show ?? 0;
  const rows: {label?: string; a: string; b: string}[] = scene.data.rows;
  const cells: [number, number][] = scene.data.cells;
  const hasLabel = rows.some((r) => r.label);
  const colColors = [C.learn, C.example];
  const order = (r: number, c: number) => cells.findIndex(([rr, cc]) => rr === r && cc === c);
  return (
    <SceneFrame scene={scene} base={scene.data.size ?? 44} min={24}>
      {(size) => (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: hasLabel ? `${size * 6}px 1fr 1fr` : '1fr 1fr',
            columnGap: size * 0.7,
            rowGap: size * 0.55,
          }}
        >
          {hasLabel ? <div /> : null}
          {scene.data.cols.map((c: string, i: number) => (
            <div
              key={i}
              style={{
                fontWeight: 800,
                fontSize: '1.05em',
                color: colColors[i],
                borderBottom: `4px solid ${colColors[i]}`,
                paddingBottom: size * 0.2,
                opacity: appear(frame, 0, 10),
              }}
            >
              <Rich text={c} />
            </div>
          ))}
          {rows.map((r, ri) => (
            <React.Fragment key={ri}>
              {hasLabel ? (
                <div
                  style={{
                    color: C.dim,
                    fontWeight: 700,
                    fontSize: '0.85em',
                    opacity: appear(frame, Math.min(revealFrame(scene.beats, order(ri, 0)), revealFrame(scene.beats, order(ri, 1)))),
                  }}
                >
                  {r.label}
                </div>
              ) : null}
              {[r.a, r.b].map((txt, ci) => {
                const k = order(ri, ci);
                if (k < 0)
                  return <div key={ci} />;
                const o = appear(frame, revealFrame(scene.beats, k));
                const current = k === shown - 1;
                return (
                  <div
                    key={ci}
                    style={{
                      background: current ? 'rgba(255,255,255,0.09)' : C.card,
                      border: `2px solid ${current ? colColors[ci] : C.cardEdge}`,
                      borderRadius: 14,
                      padding: `${size * 0.35}px ${size * 0.5}px`,
                      opacity: o,
                      transform: `scale(${0.95 + 0.05 * o})`,
                      transformOrigin: 'center top',
                    }}
                  >
                    <Rich text={txt} />
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      )}
    </SceneFrame>
  );
};
