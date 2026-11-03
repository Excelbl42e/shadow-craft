import React from 'react';
import {Composition} from 'remotion';
import {PartVideo} from './PartVideo';
import type {Timeline} from './types';

export const Root: React.FC = () => (
  <Composition
    id="Part"
    component={PartVideo as any}
    width={1920}
    height={1080}
    fps={30}
    durationInFrames={300}
    defaultProps={{timeline: null as Timeline | null}}
    calculateMetadata={({props}: any) => ({durationInFrames: props.timeline ? props.timeline.totalFrames : 300})}
  />
);
