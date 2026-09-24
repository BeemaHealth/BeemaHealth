import type { LearnArticle } from "../../types";

export const article: LearnArticle = {
  vertical: "hrt",
  slug: "what-is-hrt",
  title: "What is menopausal hormone therapy (HRT)?",
  h1: "What is menopausal hormone therapy?",
  description:
    "A short educational explainer of menopausal hormone therapy, how it differs from TRT, and why Beema Health does not offer HRT today. Not medical advice.",
  keywords: [
    "what is HRT",
    "menopausal hormone therapy",
    "hormone replacement therapy",
    "menopause estrogen",
  ],
  cluster: "foundations",
  relatedSlugs: [],
  moneyPageHrefs: ["/weight-loss/"],
  datePublished: "2026-08-24",
  dateModified: "2026-08-24",
  sources: [
    {
      label: "The Menopause Society. 2022 Hormone Therapy Position Statement.",
      href: "https://menopause.org/wp-content/uploads/professional/nams-2022-hormone-therapy-position-statement.pdf",
    },
    {
      label:
        "U.S. Food and Drug Administration. Menopause: medicines to help you.",
      href: "https://www.fda.gov/consumers/womens-health-topics/menopause",
    },
    {
      label:
        "National Heart, Lung, and Blood Institute. Women's Health Initiative.",
      href: "https://www.nhlbi.nih.gov/science/womens-health-initiative-whi",
    },
  ],
  faqs: [
    {
      question: "Does Beema Health prescribe HRT?",
      answer:
        "No. Beema Health does not currently offer menopausal hormone therapy. This article is educational only.",
    },
    {
      question: "Is HRT the same as testosterone replacement?",
      answer:
        "No. In this library HRT means menopausal hormone therapy. TRT is testosterone replacement for documented hypogonadism in men.",
    },
    {
      question: "Can this page tell me if hormone therapy is safe for me?",
      answer:
        "No. Age, years since menopause, clot history, breast cancer history, and the specific product all change the discussion. That belongs with a licensed clinician.",
    },
  ],
  sections: [
    {
      id: "definition",
      heading: "A working definition",
      body: [
        "Menopausal hormone therapy uses prescription estrogen, with a progestogen when a uterus is present, to treat bothersome menopause symptoms and, in selected people, to help prevent osteoporosis. Public search still calls this HRT. FDA-approved products have labelled indications, boxed warnings, and monitoring expectations.",
      ],
    },
    {
      id: "evidence",
      heading: "Why the Women's Health Initiative still matters",
      body: [
        "The Women's Health Initiative is the large US trial that reshaped hormone therapy counselling. Later guideline statements, including The Menopause Society's 2022 position statement, place more weight on age and time since menopause for people with bothersome vasomotor symptoms. Those are population findings. They are not a green light for unregulated compounded pellets marketed as \"bioidentical.\"",
      ],
    },
    {
      id: "not-beema",
      heading: "Beema Health is not an HRT clinic",
      body: [
        "We published this explainer so HRT searches are not funneled into a fake product. If your question is about GLP-1 medicines for weight loss, use the weight-loss learn hub. If your question is about menopause hormones, see a clinician who prescribes them. Beema Health's live care is medical weight-loss.",
      ],
    },
  ],
};
