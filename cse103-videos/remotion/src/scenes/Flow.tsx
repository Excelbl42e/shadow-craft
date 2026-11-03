import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Rich} from '../Rich';
import {appear, audit, beatIndexAt, revealFrame, SceneFrame} from '../common';
import {C, MONO} from '../theme';
import type {SceneT} from '../types';
import {Shape, ShapePath} from './Shapes';

type Node = {id: string; shape: Shape; text: string; x: number; y: number; w: number; h: number; fs?: number; mono?: boolean};
type Edge = {
  id: string;
  from: string;
  to: string;
  fromSide?: 't' | 'b' | 'l' | 'r';
  toSide?: 't' | 'b' | 'l' | 'r';
  via?: [number, number][];
  label?: string;
  labelAt?: [number, number];
  dashed?: boolean;
  noArrow?: boolean;
  toAt?: [number, number];
};

const anchor = (n: Node, side: string): [number, number] => {
  switch (side) {
    case 't':
      return [n.x + n.w / 2, n.y];
    case 'b':
      return [n.x + n.w / 2, n.y + n.h];
    case 'l':
      return [n.x, n.y + n.h / 2];
    default:
      return [n.x + n.w, n.y + n.h / 2];
  }
};

const BOX_H = 850 - (120 + 92); // content box height (see SceneFrame)
const BOX_W = 1920 - 200;

export const Flow: React.FC<{scene: SceneT}> = ({scene}) => {
  const frame = useCurrentFrame();
  const bi = beatIndexAt(scene.beats, frame);
  const beat = scene.beats[bi];
  const shown = beat.show ?? 0;
  const d = scene.data;
  const nodes: Node[] = d.nodes;
  const edges: Edge[] = d.edges;
  const units: {show: string[]}[] = d.units;
  const initial: string[] = d.initial ?? [];
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

  // frame at which each element appears
  const appearAt: Record<string, number> = {};
  for (const id of initial) appearAt[id] = 0;
  units.forEach((u, k) => {
    for (const id of u.show) if (appearAt[id] === undefined) appearAt[id] = revealFrame(scene.beats, k);
  });
  const focus = new Set(beat.focus ?? []);

  const side = d.side as
    | undefined
    | {kind: 'code'; width: number; lines: {t: string; cont?: boolean}[]}
    | {kind: 'list'; width: number; title?: string; items: string[]};
  const sideW = side ? side.width : 0;
  const gap = side ? 50 : 0;
  const availW = BOX_W - sideW - gap;
  const scale = Math.min(availW / d.canvas.w, BOX_H / d.canvas.h);
  const cw = d.canvas.w * scale;

  // code side panel: lines visible up to the highest line reached so far
  let maxLine = -1;
  for (let i = 0; i <= bi; i++) {
    const l = scene.beats[i].line;
    if (l !== undefined && l > maxLine) maxLine = l;
  }
  const lineAppear = (li: number) => {
    for (const b of scene.beats) if ((b.line ?? -1) >= li) return b.start;
    return Infinity;
  };

  return (
    <SceneFrame scene={scene} fit={false} base={30}>
      {() => (
        <div style={{display: 'flex', gap, alignItems: 'flex-start', height: '100%'}}>
          <div style={{width: availW, height: '100%', display: 'flex', justifyContent: 'center'}}>
            <div style={{position: 'relative', width: cw, height: d.canvas.h * scale}}>
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: d.canvas.w,
                  height: d.canvas.h,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                }}
              >
                <svg width={d.canvas.w} height={d.canvas.h} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
                  {edges.map((e) => {
                    const at = appearAt[e.id];
                    if (at === undefined) return null;
                    const p = appear(frame, at, 18);
                    if (p <= 0) return null;
                    const a = byId[e.from];
                    const b = byId[e.to];
                    const pts: [number, number][] = [anchor(a, e.fromSide ?? 'b'), ...(e.via ?? []), e.toAt ?? anchor(b, e.toSide ?? 't')];
                    let len = 0;
                    for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
                    const isF = focus.has(e.id);
                    const col = isF ? C.accent : '#8fb3d9';
                    const [x1, y1] = pts[pts.length - 2];
                    const [x2, y2] = pts[pts.length - 1];
                    const ang = Math.atan2(y2 - y1, x2 - x1);
                    const ah = 20;
                    const arrow = `${x2},${y2} ${x2 - ah * Math.cos(ang - 0.42)},${y2 - ah * Math.sin(ang - 0.42)} ${x2 - ah * Math.cos(ang + 0.42)},${y2 - ah * Math.sin(ang + 0.42)}`;
                    const lab = e.labelAt ?? [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2];
                    return (
                      <g key={e.id}>
                        <polyline
                          points={pts.map((q) => q.join(',')).join(' ')}
                          fill="none"
                          stroke={col}
                          strokeWidth={isF ? 6 : 4}
                          strokeDasharray={e.dashed ? '12 10' : `${len} ${len}`}
                          strokeDashoffset={e.dashed ? 0 : len * (1 - p)}
                          opacity={e.dashed ? p : 1}
                          strokeLinejoin="round"
                        />
                        {!e.noArrow && !e.dashed && p > 0.95 ? <polygon points={arrow} fill={col} /> : null}
                        {e.label ? (
                          <g opacity={p}>
                            <rect x={lab[0] - 34} y={lab[1] - 20} width={68} height={40} rx={8} fill={isF ? C.accent : C.bg2} />
                            <text
                              x={lab[0]}
                              y={lab[1] + 9}
                              textAnchor="middle"
                              fontSize={26}
                              fontWeight={700}
                              fill={isF ? '#08121e' : C.text}
                              fontFamily="Inter"
                            >
                              {e.label}
                            </text>
                          </g>
                        ) : null}
                      </g>
                    );
                  })}
                  {nodes.map((n) => {
                    const at = appearAt[n.id];
                    if (at === undefined) return null;
                    const o = appear(frame, at, 12);
                    const isF = focus.has(n.id);
                    return (
                      <g key={n.id} opacity={o}>
                        <ShapePath
                          shape={n.shape}
                          x={n.x}
                          y={n.y}
                          w={n.w}
                          h={n.h}
                          stroke={isF ? C.accent : '#7fb2e5'}
                          fill={n.shape === 'annotation' || n.shape === 'text' ? 'none' : isF ? 'rgba(255,209,102,0.18)' : C.card}
                          sw={isF ? 6 : 3}
                        />
                      </g>
                    );
                  })}
                </svg>
                {nodes.map((n) => {
                  const at = appearAt[n.id];
                  if (at === undefined) return null;
                  const o = appear(frame, at, 12);
                  const inset = n.shape === 'decision' ? n.w * 0.16 : n.shape === 'io' ? n.h * 0.4 : 12;
                  return (
                    <div
                      key={n.id}
                      ref={(el) => {
                        if (el && (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2))
                          audit(`OVERFLOW node=${n.id} scene=${scene.key}`, 'error');
                      }}
                      style={{
                        position: 'absolute',
                        left: n.x + inset,
                        top: n.y + (n.shape === 'decision' ? n.h * 0.18 : 4),
                        width: n.w - 2 * inset,
                        height: n.h - (n.shape === 'decision' ? n.h * 0.36 : 8),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: n.shape === 'annotation' || n.shape === 'text' ? 'flex-start' : 'center',
                        textAlign: n.shape === 'annotation' || n.shape === 'text' ? 'left' : 'center',
                        fontSize: n.fs ?? 28,
                        fontFamily: n.mono ? MONO : undefined,
                        lineHeight: 1.25,
                        color: n.shape === 'text' ? C.dim : C.text,
                        opacity: o,
                        overflow: 'hidden',
                        whiteSpace: 'pre-line',
                      }}
                    >
                      <span>
                        <Rich text={n.text} />
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {side?.kind === 'code' ? (
            <div
              style={{
                width: sideW,
                background: C.code,
                border: `2px solid ${C.cardEdge}`,
                borderRadius: 16,
                padding: '22px 0',
                fontFamily: MONO,
                fontSize: 27,
                lineHeight: 1.5,
                color: C.codeText,
              }}
            >
              {side.lines.map((l, li) => {
                // a continuation line belongs to the statement on the line above it
                const own = l.cont ? li - 1 : li;
                const vis = own <= maxLine;
                const o = vis ? appear(frame, lineAppear(own), 10) : 0;
                const cur = beat.line === own;
                return (
                  <div
                    key={li}
                    style={{
                      whiteSpace: 'pre',
                      padding: '0 24px',
                      opacity: o,
                      background: cur ? 'rgba(255,209,102,0.16)' : 'transparent',
                      borderLeft: `6px solid ${cur ? C.accent : 'transparent'}`,
                    }}
                  >
                    {l.t}
                  </div>
                );
              })}
              {beat.caption ? (
                <div
                  style={{
                    margin: '18px 24px 0',
                    fontFamily: 'Inter',
                    fontSize: 24,
                    color: C.trap,
                    opacity: appear(frame, beat.start, 10),
                  }}
                >
                  <Rich text={beat.caption} />
                </div>
              ) : null}
            </div>
          ) : null}
          {side?.kind === 'list' ? (
            <div style={{width: sideW, fontSize: 30, lineHeight: 1.35, display: 'flex', flexDirection: 'column', gap: 16}}>
              {side.title ? <div style={{fontWeight: 800, color: C.mark, fontSize: 32}}>{side.title}</div> : null}
              {side.items.map((t, i) => {
                const o = appear(frame, revealFrame(scene.beats, i));
                const cur = i === shown - 1;
                return (
                  <div
                    key={i}
                    style={{
                      opacity: o * (cur ? 1 : 0.7),
                      transform: `scale(${0.95 + 0.05 * o})`,
                      transformOrigin: 'left center',
                      borderLeft: `6px solid ${cur ? C.accent : C.cardEdge}`,
                      paddingLeft: 16,
                    }}
                  >
                    <Rich text={t} />
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      )}
    </SceneFrame>
  );
};
