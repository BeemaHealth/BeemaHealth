import React from 'react';
import {Composition} from 'remotion';
import {Short, TOTAL} from './Short';
import {FPS, W, H} from './theme';

export const Root: React.FC = () => (
  <Composition id="Pde5Short" component={Short} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
);
