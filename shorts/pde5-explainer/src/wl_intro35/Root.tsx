import React from 'react';
import {Composition} from 'remotion';
import {Wl35Clip, Wl35Props} from './Clip';

const demo: Wl35Props = {
  id: 'demo', product: 'tirzepatide', format: 'organic', aspect: '9x16', duration: 4, audio: 'engine/tmp/none.wav', segments: [], words: [],
  endcard: {lines: ['', ''], disclosures: [], safety: '', logo: 'engine/brand/stacked.png', mark: 'engine/brand/mark.png', photo: null},
  brand: {colors: {}}, safeZones: {}, seed: '', notice: [], url: '',
};

export const Wl35Root: React.FC = () => (
  <Composition id="WlIntro35" component={Wl35Clip as React.FC<any>} durationInFrames={120} fps={30} width={1080} height={1920} defaultProps={demo}
    calculateMetadata={({props}: any) => ({durationInFrames: Math.max(30, Math.ceil(props.duration * 30))})} />
);
