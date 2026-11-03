import React, {useLayoutEffect, useRef, useState} from 'react';
import {continueRender, delayRender, interpolate, useCurrentFrame, Easing} from 'remotion';
import {C, CONTENT_BOTTOM, CONTENT_TOP, FONT, SIDE, W, tagColor} from './theme';
import type {Beat, SceneT} from './types';

// ---- beat helpers -------------------------------------------------------
export const beatIndexAt = (beats: Beat[], frame: number) => {
  let idx = 0;
  for (let i = 0; i < beats.length; i++) if (beats[i].start <= frame) idx = i;
  return idx;
};

// Frame at which reveal unit `k` first appears (first beat whose show > k).
export const revealFrame = (beats: Beat[], k: number) => {
  for (const b of beats) if ((b.show ?? 0) > k) return b.start;
  return Infinity;
};

export const appear = (frame: number, at: number, len = 14) =>
  interpolate(frame - at, [0, len], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

// ---- audit logging (picked up by the renderer via onBrowserLog) --------
const logged = new Set<string>();
export const audit = (msg: string, level: 'error' | 'log' = 'log') => {
  if (logged.has(msg)) return;
  logged.add(msg);
  // eslint-disable-next-line no-console
  (level === 'error' ? console.error : console.log)('AUDIT ' + msg);
};

// ---- auto-fit: shrink font until the box's full content (all reveal units
// laid out, hidden ones only transparent) fits. Size is constant for the
// whole scene, so nothing jumps while items appear.
export const useFit = (key: string, base: number, min: number) => {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(base);
  const [handle] = useState(() => delayRender('fit ' + key));
  const [done, setDone] = useState(false);
  useLayoutEffect(() => {
    if (done) return;
    const el = ref.current;
    if (!el) return;
    const over = el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;
    if (over && size > min) {
      setSize((s) => s - 1);
      return;
    }
    if (over) audit(`OVERFLOW scene=${key} size=${size} scrollH=${el.scrollHeight} clientH=${el.clientHeight}`, 'error');
    else audit(`FIT scene=${key} size=${size}`);
    setDone(true);
    continueRender(handle);
  }, [size, done, key, min, handle]);
  return {ref, size};
};

// ---- scene frame: tag pill + heading + fitted content box --------------
export const SceneFrame: React.FC<{
  scene: SceneT;
  children: (size: number) => React.ReactNode;
  base?: number;
  min?: number;
  fit?: boolean;
}> = ({scene, children, base = 40, min = 24, fit = true}) => {
  const frame = useCurrentFrame();
  const color = tagColor(scene.data.tag);
  const o = appear(frame, 0, 10);
  const {ref, size} = useFit(scene.key, base, fit ? min : base);
  const headTop = CONTENT_TOP;
  const boxTop = CONTENT_TOP + 92;
  return (
    <div style={{position: 'absolute', inset: 0, fontFamily: FONT, color: C.text}}>
      <div
        style={{
          position: 'absolute',
          left: SIDE,
          right: SIDE,
          top: headTop,
          height: 76,
          display: 'flex',
          alignItems: 'center',
          gap: 22,
          opacity: o,
        }}
      >
        {scene.data.tag ? (
          <div
            style={{
              background: color,
              color: '#08121e',
              fontWeight: 800,
              fontSize: 24,
              letterSpacing: 2,
              padding: '8px 16px',
              borderRadius: 10,
              whiteSpace: 'nowrap',
            }}
          >
            {scene.data.tag}
          </div>
        ) : null}
        {scene.data.chip ? (
          <div
            style={{
              border: `2px solid ${C.example}`,
              color: C.example,
              fontWeight: 700,
              fontSize: 20,
              letterSpacing: 1,
              padding: '6px 12px',
              borderRadius: 8,
              whiteSpace: 'nowrap',
            }}
          >
            {scene.data.chip}
          </div>
        ) : null}
        <div
          style={{
            fontSize: 42,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          ref={(el) => {
            if (el && el.scrollWidth > el.clientWidth + 1) audit(`OVERFLOW heading scene=${scene.key}`, 'error');
          }}
        >
          {scene.data.heading}
        </div>
      </div>
      <div
        ref={ref}
        style={{
          position: 'absolute',
          left: SIDE,
          width: W - 2 * SIDE,
          top: boxTop,
          height: CONTENT_BOTTOM - boxTop,
          overflow: 'hidden',
          fontSize: size,
          lineHeight: 1.38,
        }}
      >
        {children(size)}
      </div>
    </div>
  );
};

export const Chips: React.FC<{codes?: string}> = ({codes}) =>
  codes ? (
    <span style={{whiteSpace: 'nowrap', marginLeft: '0.4em'}}>
      {codes.split(/\s*,\s*/).map((c, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            fontSize: '0.56em',
            fontWeight: 700,
            color: C.asked,
            background: 'rgba(255,159,67,0.12)',
            border: `1.5px solid rgba(255,159,67,0.55)`,
            borderRadius: 6,
            padding: '0.15em 0.4em',
            marginLeft: '0.25em',
            verticalAlign: '0.2em',
            lineHeight: 1,
          }}
        >
          {c}
        </span>
      ))}
    </span>
  ) : null;
