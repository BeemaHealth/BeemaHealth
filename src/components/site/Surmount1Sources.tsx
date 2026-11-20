/**
 * Primary sources for the SURMOUNT-1 figures quoted on landing pages
 * (tirzepatide 15 mg, -20.9% mean weight change at 72 weeks).
 * Verified 2026-11-02 against PubMed and the ClinicalTrials.gov API.
 */
export const SURMOUNT1_PUBLICATION_URL =
  "https://doi.org/10.1056/NEJMoa2206038";
export const SURMOUNT1_REGISTRY_URL =
  "https://clinicaltrials.gov/study/NCT04184622";

const linkClass = "underline underline-offset-2 hover:text-foreground";

export function Surmount1Sources() {
  return (
    <>
      Source: SURMOUNT-1,{" "}
      <a
        href={SURMOUNT1_PUBLICATION_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        New England Journal of Medicine, 2022
      </a>{" "}
      (
      <a
        href={SURMOUNT1_REGISTRY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        ClinicalTrials.gov NCT04184622
      </a>
      ).
    </>
  );
}
