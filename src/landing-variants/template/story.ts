/**
 * Founder / patient story video shown on every page that uses the shared
 * landing template. The default is the general Beema Health video. The
 * tirzepatide story video discusses tirzepatide results, so it is only used
 * on tirzepatide pages (see TIRZEPATIDE_STORY and GlpTreatmentPage).
 */
export const PATIENT_STORY_YOUTUBE_ID = "16ZYihb0Wfo";
export const PATIENT_STORY_POSTER = "/videos/patient-story-general-poster.webp";

/** The tirzepatide story. Use on tirzepatide pages only. */
export const TIRZEPATIDE_STORY_YOUTUBE_ID = "ZRzKvDBRjYs";
export const TIRZEPATIDE_STORY_POSTER =
  "/videos/patient-story-glp1-poster.webp";

/** "glp1": the video discusses a GLP-1 result. "none": a company story with no claims. */
export type StoryDisclaimer = "glp1" | "none";
export const STORY_DISCLAIMER: StoryDisclaimer = "none";
