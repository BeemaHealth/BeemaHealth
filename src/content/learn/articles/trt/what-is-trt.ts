import type { LearnArticle } from "../../types";

export const article: LearnArticle = {
  vertical: "trt",
  slug: "what-is-trt",
  title: "What is testosterone replacement therapy (TRT)?",
  h1: "What is testosterone replacement therapy?",
  description:
    "Testosterone replacement therapy explained: who guidelines consider and why diagnosis needs repeated labs. Beema Health does not currently offer TRT.",
  keywords: [
    "what is TRT",
    "testosterone replacement therapy",
    "hypogonadism",
    "testosterone deficiency",
  ],
  cluster: "foundations",
  relatedSlugs: [],
  moneyPageHrefs: ["/weight-loss/"],
  datePublished: "2026-08-24",
  dateModified: "2026-08-27",
  sources: [
    {
      label:
        "Bhasin S, et al. Testosterone Therapy in Men With Hypogonadism: An Endocrine Society Clinical Practice Guideline. JCEM. 2018.",
      href: "https://doi.org/10.1210/jc.2018-00229",
    },
    {
      label:
        "U.S. Food and Drug Administration. Testosterone Information: labeling and safety communications for testosterone products.",
      href: "https://www.fda.gov/drugs/postmarket-drug-safety-information-patients-and-providers/testosterone-information",
    },
  ],
  faqs: [
    {
      question: "Does Beema Health prescribe TRT?",
      answer:
        "No. Beema Health does not currently offer TRT. Its related compounded enclomiphene treatment, when it is offered, works differently from the injectable, gel, or patch testosterone this article describes: it's an oral medication that encourages the body to produce more of its own testosterone rather than replacing it directly.",
    },
    {
      question: "Can I diagnose low testosterone from symptoms alone?",
      answer:
        "Guidelines expect compatible symptoms plus confirmed low morning testosterone, usually on more than one test, after considering other causes. A webpage cannot run those labs.",
    },
    {
      question: "Is TRT a weight-loss drug?",
      answer:
        "No. Some people with hypogonadism notice body-composition changes on treatment, but TRT is not a GLP-1 weight-management medicine. Beema Health does not currently offer TRT or compounded enclomiphene, and its live weight-loss care is a separate program.",
    },
  ],
  sections: [
    {
      id: "definition",
      heading: "A working definition",
      body: [
        "Testosterone replacement therapy is prescription treatment intended to restore testosterone in men with documented hypogonadism. It is regulated as a drug, not as a supplement. Online clinics that skip laboratory confirmation are not following the diagnostic approach in major endocrine and urology guidelines.",
      ],
    },
    {
      id: "diagnosis",
      heading: "How diagnosis is usually approached",
      body: [
        "Clinicians typically measure morning total testosterone, repeat a low result, and interpret it with sex hormone-binding globulin, symptoms, and medicines that can suppress testosterone. Free testosterone assays vary in quality. The point for readers is that a single afternoon number from a wellness booth is not a complete workup.",
      ],
      bullets: [
        "Repeat morning testing is standard when the first result is low.",
        "Fertility goals can change whether testosterone itself is even a reasonable option.",
        "Hematocrit, prostate evaluation when indicated, and sleep apnea history belong in the same conversation.",
      ],
    },
    {
      id: "not-beema",
      heading: "Beema Health does not currently offer TRT",
      body: [
        "This article describes the injectable, gel, and patch testosterone products covered in major endocrine and urology guidelines. Beema Health does not currently offer TRT or the related compounded enclomiphene treatment, which would work differently: rather than replacing testosterone directly, it's an oral medication that encourages the body to produce more of its own. If you need the injectable/gel/patch therapy described in this article specifically, see a licensed clinician who prescribes it. If you came here for GLP-1 weight-loss education, the weight-loss learn hub is the right shelf.",
      ],
    },
  ],
};
