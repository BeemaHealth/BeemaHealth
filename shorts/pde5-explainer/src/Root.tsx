import React from 'react';
import {Composition} from 'remotion';
import {Short, TOTAL} from './Short';
import {FPS, W, H} from './theme';
import {Glp1Short, TOTAL as GLP1_TOTAL} from './glp1/Short';
import {AdShort, TOTAL as AD_TOTAL} from './ad/Short';

export const Root: React.FC = () => (
  <>
    <Composition id="Pde5Short" component={Short} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
    <Composition id="Glp1Short" component={Glp1Short} durationInFrames={GLP1_TOTAL} fps={FPS} width={W} height={H} />
    <Composition id="AdEd" component={AdShort} durationInFrames={AD_TOTAL} fps={FPS} width={W} height={H} />
  </>
);
