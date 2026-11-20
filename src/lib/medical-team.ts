/**
 * Arora Health team media (headshots, names, titles, bios).
 *
 * Governed by the "Team Bio / Media Licensing Consent" agreement between
 * Arora Health and Beema Health (beemahealth.com). Rules this file and
 * `components/site/MedicalTeamSection.tsx` are built to honor - do not loosen
 * them without written approval from Arora Health:
 *
 * 1. Approved content only. Bios, titles, and the disclaimer below are
 *    verbatim from the supplied documents. Do not paraphrase, shorten, or
 *    "improve" them (a test pins the exact text).
 * 2. No alterations. Headshots in `src/assets/team/` are the original files,
 *    byte for byte. Do not crop, recolor, re-encode, overlay text on, or
 *    apply filters to them. Render them at their native aspect ratio.
 * 3. Context of use. Only to illustrate the professional relationship between
 *    Arora Health and Beema Health. Never use in ads, social creative, OG
 *    images, testimonials, or next to treatment pricing / CTAs, and never
 *    imply the physicians endorse a product or are Beema Health employees.
 * 4. Required disclaimer. `TEAM_MEDIA_DISCLAIMER` must render in proximity to
 *    every placement of the media.
 * 5. 24-hour takedown. Arora Health may revoke by email. To comply, set
 *    `MEDICAL_TEAM_MEDIA_ENABLED` to false and deploy: every placement renders
 *    nothing. Then also delete `src/assets/team/`, and remove the remaining
 *    mentions of Arora Health personnel (provider-info.ts, seo.ts reviewer
 *    JSON-LD, FAQ copy, per-page "Clinical oversight" lines).
 */

import seanHeadshot from "@/assets/team/sean-arora-headshot.jpeg";
import shannonHeadshot from "@/assets/team/shannon-arora-headshot.jpeg";

/** Kill switch for all team media (headshots, bios, disclaimer section). */
export const MEDICAL_TEAM_MEDIA_ENABLED = true;

/** Where the full verbatim bios live. */
export const MEDICAL_TEAM_BIOS_HASH = "clinical-team";

/** Verbatim from the license agreement, section 3. */
export const TEAM_MEDIA_DISCLAIMER =
  "The inclusion of Arora Health personnel on this website denotes a professional collaboration/service provider relationship. It does not constitute an endorsement of the company’s products, services, or independent business practices, nor does it imply a joint venture, partnership, or employment relationship.";

export type MedicalTeamMember = {
  id: "sean-arora" | "shannon-arora";
  displayName: string;
  /** Title as written in the approved bio document. */
  title: string;
  headshot: {
    src: string;
    alt: string;
    /** Intrinsic pixel size of the original file. Never render at another aspect ratio. */
    width: 896;
    height: 1088;
  };
  /** Approved bio, one entry per paragraph, verbatim. */
  bio: readonly string[];
};

export const MEDICAL_TEAM: readonly MedicalTeamMember[] = [
  {
    id: "sean-arora",
    displayName: "Dr. Sean Arora",
    title: "CEO, Founder",
    headshot: {
      src: seanHeadshot,
      alt: "Headshot of Dr. Sean Arora",
      width: 896,
      height: 1088,
    },
    bio: [
      "Dr. Sean Arora is a board-certified physician and the founder of Arora Health & Aesthetics, bringing deep expertise in wellness, family medicine, and telehealth innovation. He leads one of the nation’s most comprehensive medical oversight and compliance networks, supporting clinics through full-spectrum medical directorship, nationwide telehealth provider coverage, and evidence-based protocol development across peptides, hormone optimization, weight loss, regenerative medicine, and aesthetic treatments.",
      "Known for his forward-thinking approach to patient safety and scalable clinical operations, Dr. Arora partners closely with medical spas, wellness clinics, and telehealth organizations to ensure responsible, compliant, and impactful care. Licensed in all 50 states, he is dedicated to expanding access to high-quality wellness services through innovation, leadership, and patient-centered standards.",
    ],
  },
  {
    id: "shannon-arora",
    displayName: "Dr. Shannon Arora",
    title: "Chief Medical Officer",
    headshot: {
      src: shannonHeadshot,
      alt: "Headshot of Dr. Shannon Arora",
      width: 896,
      height: 1088,
    },
    bio: [
      "Dr. Shannon Arora is a physician dedicated to making a meaningful impact on patient health through both traditional medicine and proactive wellness care. With experience as a hospitalist, she brings a strong clinical foundation shaped by work in hospitals and nursing homes, offering a broad perspective on patient care across diverse settings.",
      "While her early career focused on acute care, Dr. Arora recognized an opportunity to create a more proactive, personalized approach within the health, wellness, and longevity space. She now focuses on optimizing patient health through advanced wellness therapies, preventative medicine, and longevity-focused care, helping patients improve energy, confidence, and overall quality of life.",
      "As Chief Medical Officer, Dr. Arora is passionate about advancing innovation in regenerative medicine and wellness, while helping both patients and organizations achieve better outcomes through thoughtful, patient-centered care.",
    ],
  },
];
