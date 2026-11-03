import React from 'react';
import {C, MONO} from './theme';

// Inline markup used in the scripts:
//   **bold**   `code`   (1) / (2) / (1–2) = mark earned   [2] / [8 marks] / [2+2+2] = question value   ★ = frequent
const TOKEN = /(\*\*[^*]+\*\*|`[^`]+`|\((?:1|2|1–2)\)|\[[0-9][0-9+–\- a-z]*\]|★)/g;

export const Rich: React.FC<{text: string; strongColor?: string}> = ({text, strongColor}) => {
  const parts = text.split(TOKEN).filter((p) => p !== '');
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) {
          return (
            <b key={i} style={{color: strongColor ?? '#ffffff', fontWeight: 700}}>
              {p.slice(2, -2)}
            </b>
          );
        }
        if (p.startsWith('`') && p.endsWith('`')) {
          return (
            <code
              key={i}
              style={{
                fontFamily: MONO,
                fontSize: '0.88em',
                background: 'rgba(255,255,255,0.08)',
                padding: '0.05em 0.3em',
                borderRadius: 6,
                color: '#ffe6a8',
              }}
            >
              {p.slice(1, -1)}
            </code>
          );
        }
        if (/^\((1|2|1–2)\)$/.test(p)) {
          const n = p.slice(1, -1);
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                background: C.mark,
                color: '#04291a',
                fontWeight: 800,
                fontSize: '0.62em',
                lineHeight: 1,
                padding: '0.22em 0.45em',
                borderRadius: 999,
                verticalAlign: '0.25em',
                margin: '0 0.15em',
                whiteSpace: 'nowrap',
              }}
            >
              {n} {n === '1' ? 'mark' : 'marks'}
            </span>
          );
        }
        if (/^\[[0-9]/.test(p)) {
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                border: `2px solid ${C.accent}`,
                color: C.accent,
                fontWeight: 700,
                fontSize: '0.7em',
                lineHeight: 1,
                padding: '0.18em 0.4em',
                borderRadius: 8,
                verticalAlign: '0.15em',
                margin: '0 0.1em',
                whiteSpace: 'nowrap',
              }}
            >
              {p.slice(1, -1)}
            </span>
          );
        }
        if (p === '★') {
          return (
            <span key={i} style={{color: C.accent}}>
              ★
            </span>
          );
        }
        return <React.Fragment key={i}>{p}</React.Fragment>;
      })}
    </>
  );
};
