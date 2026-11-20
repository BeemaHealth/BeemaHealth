import React from 'react';
import {Composition} from 'remotion';
import {Short, TOTAL} from './Short';
import {FPS, W, H} from './theme';
import {Glp1Short, TOTAL as GLP1_TOTAL} from './glp1/Short';
import {AdShort, TOTAL as AD_TOTAL} from './ad/Short';
import {BlackFridayShort, TOTAL as BF_TOTAL} from './blackfriday/Short';
import {BlackFridayShort as BfTirzShort, TOTAL as BfTirz_TOTAL} from './bf_tirz/Short';
import {BlackFridayShort as BfMintsShort, TOTAL as BfMints_TOTAL} from './bf_mints/Short';
import {BlackFridayShort as BfTadalafilShort, TOTAL as BfTadalafil_TOTAL} from './bf_tadalafil/Short';
import {BlackFridayShort as BfSildenafilShort, TOTAL as BfSildenafil_TOTAL} from './bf_sildenafil/Short';
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
    <Composition id="BfTirz" component={BfTirzShort} durationInFrames={BfTirz_TOTAL} fps={FPS} width={W} height={H} />
    <Composition id="BfMints" component={BfMintsShort} durationInFrames={BfMints_TOTAL} fps={FPS} width={W} height={H} />
    <Composition id="BfTadalafil" component={BfTadalafilShort} durationInFrames={BfTadalafil_TOTAL} fps={FPS} width={W} height={H} />
    <Composition id="BfSildenafil" component={BfSildenafilShort} durationInFrames={BfSildenafil_TOTAL} fps={FPS} width={W} height={H} />
    {Object.entries(SIZES).map(([k, [w, h]]) => (
      <Composition key={k} id={`Clip${k}`} component={Clip as React.FC<any>} durationInFrames={120} fps={30} width={w} height={h} defaultProps={{...demo, aspect: k}}
        calculateMetadata={({props}: any) => ({durationInFrames: Math.max(30, Math.ceil(props.duration * 30))})} />
    ))}
  </>
);
