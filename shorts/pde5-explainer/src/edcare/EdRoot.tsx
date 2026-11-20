import React from 'react';
import {Composition} from 'remotion';
import {EdClip} from './EdClip';
import type {ClipProps} from '../engine/ui';

/** Separate Remotion entry (src/edcare/index.ts) for the ED care 30 s short, so the shared src/index.ts is untouched. */
const demo: ClipProps = {id: 'demo', product: 'ed-mints', format: 'organic', aspect: '9x16', duration: 4, audio: 'engine/tmp/none.wav', segments: [], words: [], endcard: {lines: ['', ''], disclosures: [], safety: '', logo: 'engine/brand/stacked.png', mark: 'engine/brand/mark.png', photo: null}, brand: {colors: {}}, safeZones: {}, seed: ''};

export const EdRoot: React.FC = () => (
  <Composition id="EdCare9x16" component={EdClip as React.FC<any>} durationInFrames={120} fps={30} width={1080} height={1920} defaultProps={demo}
    calculateMetadata={({props}: any) => ({durationInFrames: Math.max(30, Math.ceil(props.duration * 30))})} />
);
