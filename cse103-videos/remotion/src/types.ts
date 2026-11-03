export type Beat = {
  start: number; // frame, relative to the scene
  dur: number; // frames of speech
  show?: number; // number of reveal units visible
  focus?: string[];
  line?: number;
  caption?: string;
};

export type SceneT = {
  key: string;
  kind: 'title' | 'bullets' | 'compare' | 'flow' | 'code' | 'symbols' | 'image';
  chapter: number;
  start: number;
  dur: number;
  data: any;
  beats: Beat[];
};

export type Cue = {from: number; to: number; text: string};

export type Timeline = {
  part: number;
  partTitle: string;
  fps: number;
  totalFrames: number;
  draft: boolean;
  chapters: {id: string; title: string; start: number; end: number}[];
  scenes: SceneT[];
  audio: {src: string; from: number; dur: number}[];
  cues: Cue[];
};
