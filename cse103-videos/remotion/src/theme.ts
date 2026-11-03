export const W = 1920;
export const H = 1080;

// Screen regions (px). Content never enters the subtitle band.
export const HEADER_H = 96;
export const CONTENT_TOP = 120;
export const CONTENT_BOTTOM = 850; // subtitle band starts below this
export const SIDE = 100;

export const C = {
  bg1: '#0b1626',
  bg2: '#12243a',
  card: '#162b44',
  cardEdge: '#24425f',
  text: '#eaf1f8',
  dim: '#9fb3c8',
  faint: '#5d7590',
  learn: '#4ea8ff',
  asked: '#ff9f43',
  mark: '#2ecc8f',
  trap: '#ffd166',
  example: '#c38bff',
  accent: '#ffd166',
  code: '#0a1320',
  codeText: '#d6e4f0',
};

export const tagColor = (tag?: string) => {
  switch ((tag || '').toUpperCase()) {
    case 'LEARN':
      return C.learn;
    case 'ASKED AS':
      return C.asked;
    case 'MARK SCHEME':
      return C.mark;
    case 'TRAP':
      return C.trap;
    case 'EXAMPLE':
      return C.example;
    default:
      return C.learn;
  }
};

export const FONT = "Inter, 'DejaVu Sans', sans-serif";
export const MONO = "'DejaVu Sans Mono', monospace";
