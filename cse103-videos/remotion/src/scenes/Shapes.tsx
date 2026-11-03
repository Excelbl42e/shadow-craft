import React from 'react';

export type Shape = 'terminal' | 'io' | 'process' | 'decision' | 'annotation' | 'method' | 'box' | 'text' | 'flowline';

// Draws a flowchart shape inside the box (x, y, w, h).
export const ShapePath: React.FC<{
  shape: Shape;
  x: number;
  y: number;
  w: number;
  h: number;
  stroke: string;
  fill: string;
  sw?: number;
}> = ({shape, x, y, w, h, stroke, fill, sw = 3}) => {
  const common = {stroke, fill, strokeWidth: sw, strokeLinejoin: 'round' as const};
  switch (shape) {
    case 'terminal':
      return <rect x={x} y={y} width={w} height={h} rx={h / 2} {...common} />;
    case 'io': {
      const s = Math.min(h * 0.4, w * 0.18);
      return <polygon points={`${x + s},${y} ${x + w},${y} ${x + w - s},${y + h} ${x},${y + h}`} {...common} />;
    }
    case 'process':
      return <rect x={x} y={y} width={w} height={h} rx={3} {...common} />;
    case 'decision':
      return <polygon points={`${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}`} {...common} />;
    case 'annotation':
      // three-sided box (open on the right)
      return <path d={`M ${x + w * 0.35} ${y} L ${x} ${y} L ${x} ${y + h} L ${x + w * 0.35} ${y + h}`} {...common} fill="none" />;
    case 'method':
      return (
        <g>
          <rect x={x} y={y} width={w} height={h} rx={3} {...common} />
          <line x1={x} x2={x + w} y1={y + h * 0.24} y2={y + h * 0.24} stroke={stroke} strokeWidth={sw} />
        </g>
      );
    case 'box':
      return <rect x={x} y={y} width={w} height={h} rx={16} {...common} />;
    case 'flowline':
      return (
        <g>
          <line x1={x} y1={y + h / 2} x2={x + w - 18} y2={y + h / 2} stroke={stroke} strokeWidth={sw + 1} />
          <polygon points={`${x + w},${y + h / 2} ${x + w - 22},${y + h / 2 - 11} ${x + w - 22},${y + h / 2 + 11}`} fill={stroke} />
        </g>
      );
    default:
      return null;
  }
};
