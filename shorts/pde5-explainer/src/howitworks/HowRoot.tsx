import React from 'react';
import {Composition} from 'remotion';
import {HowClip} from './HowClip';
import type {ClipProps} from '../engine/ui';

/** Separate Remotion entry (src/howitworks/index.ts) for the 'How It Works' Story video, so the shared src/index.ts and engine stay untouched. */
const demo: ClipProps = {id: 'demo', product: 'how-it-works', format: 'organic', aspect: '9x16', duration: 4, audio: 'engine/tmp/none.wav', segments: [], words: [], endcard: {lines: ['', ''], disclosures: [], safety: '', logo: 'engine/brand/stacked.png', mark: 'engine/brand/mark.png', photo: null}, brand: {colors: {}}, safeZones: {}, seed: ''};

export const HowRoot: React.FC = () => (
  <Composition id="HowClip9x16" component={HowClip as React.FC<any>} durationInFrames={120} fps={30} width={1080} height={1920} defaultProps={demo}
    calculateMetadata={({props}: any) => ({durationInFrames: Math.max(30, Math.ceil(props.duration * 30))})} />
);
