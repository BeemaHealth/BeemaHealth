/**
 * Founder / patient story video shown on every page that uses the shared
 * landing template. Change the id or poster here and every new-layout page
 * updates. When the generic "why we started Beema Health" video replaces the
 * tirzepatide story, switch STORY_DISCLAIMER to "general" so the disclaimer
 * under the video stops quoting GLP-1 trial results.
 */
export const PATIENT_STORY_YOUTUBE_ID = "ZRzKvDBRjYs";
export const PATIENT_STORY_POSTER = "/videos/patient-story-glp1-poster.jpg";

/** "glp1": the video discusses a GLP-1 result. "general": a company story only. */
export type StoryDisclaimer = "glp1" | "general";
export const STORY_DISCLAIMER: StoryDisclaimer = "glp1";
