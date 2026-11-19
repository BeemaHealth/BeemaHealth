import React from 'react';
import {Composition} from 'remotion';
import {Short, TOTAL} from './Short';
import {FPS, W, H} from './theme';
import {Glp1Short, TOTAL as GLP1_TOTAL} from './glp1/Short';
import {AdShort, TOTAL as AD_TOTAL} from './ad/Short';
import {BlackFridayShort, TOTAL as BF_TOTAL} from './blackfriday/Short';
import {Clip} from './engine/Clip';
import type {ClipProps} from './engine/ui';

const SIZES: Record<string, [number, number]> = {'9x16': [1080, 1920], '4x5': [1080, 1350], '1x1': [1080, 1080]};
const demo: ClipProps = {id: 'demo', product: 'tadalafil', format: 'organic', aspect: '9x16', duration: 4, audio: 'engine/tmp/none.wav', segments: [], words: [], endcard: {lines: ['', ''], disclosures: [], safety: '', logo: 'engine/brand/stacked.png', mark: 'engine/brand/mark.png', photo: 'engine/products/tadalafil-oral-tablets-bottle.webp'}, brand: {colors: {}}, safeZones: {}, seed: ''};

export const Root: React.FC = () => (
  <>
    <Composition id="Pde5Short" component={Short} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
    <Composition id="Glp1Short" component={Glp1Short} durationInFrames={GLP1_TOTAL} fps={FPS} width={W} height={H} />
    <Composition id="AdEd" component={AdShort} durationInFrames={AD_TOTAL} fps={FPS} width={W} height={H} />
    <Composition id="BlackFriday" component={BlackFridayShort} durationInFrames={BF_TOTAL} fps={FPS} width={W} height={H} />
    {Object.entries(SIZES).map(([k, [w, h]]) => (
      <Composition key={k} id={`Clip${k}`} component={Clip as React.FC<any>} durationInFrames={120} fps={30} width={w} height={h} defaultProps={{...demo, aspect: k}}
        calculateMetadata={({props}: any) => ({durationInFrames: Math.max(30, Math.ceil(props.duration * 30))})} />
    ))}
  </>
);
