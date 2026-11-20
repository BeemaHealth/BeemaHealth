import React from 'react';
import {Composition} from 'remotion';
import type {ClipProps} from '../engine/ui';
import {WellClip} from './WellClip';

/** Separate Remotion entry (src/wellness/index.ts) for the wellness overview short, so the shared engine Root is untouched. */
const demo: ClipProps = {id: 'demo', product: 'wellness', format: 'organic', aspect: '9x16', duration: 4, audio: 'engine/tmp/none.wav', segments: [], words: [],
  endcard: {lines: ['', ''], disclosures: [], safety: '', logo: 'engine/brand/stacked.png', mark: 'engine/brand/mark.png', photo: null}, brand: {colors: {}}, safeZones: {}, seed: ''};

export const WellRoot: React.FC = () => (
  <Composition id="WellClip9x16" component={WellClip as React.FC<Record<string, unknown>>} durationInFrames={120} fps={30} width={1080} height={1920} defaultProps={demo as unknown as Record<string, unknown>}
    calculateMetadata={({props}) => ({durationInFrames: Math.max(30, Math.ceil(Number((props as unknown as ClipProps).duration) * 30))})} />
);
