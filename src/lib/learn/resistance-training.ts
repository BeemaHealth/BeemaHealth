/**
 * Shared copy for /learn/resistance-training. FAQ plain text must stay in sync
 * with the visible accordion (faqPageJsonLd consumes this array).
 */

export const RESISTANCE_TRAINING_PATH = "/learn/resistance-training/" as const;
export const RESISTANCE_TRAINING_DATE_MODIFIED = "2026-08-12" as const;

export const RESISTANCE_TRAINING_TITLE =
  "Resistance Training for Muscle Maintenance and Growth" as const;

export const RESISTANCE_TRAINING_DESCRIPTION =
  "Evidence-based guide to weekly volume, effort, protein, and creatine for maintaining and building muscle. Educational only, not medical advice." as const;

export type ResistanceTrainingTocItem = { id: string; title: string };

export const RESISTANCE_TRAINING_TOC: readonly ResistanceTrainingTocItem[] = [
  { id: "defaults", title: "What the evidence supports" },
  {
    id: "programming",
    title: "Load, volume, frequency, rest, tempo, and progression",
  },
  {
    id: "effort",
    title:
      "Effort, repetitions in reserve, failure, and set-endpoint strategies",
  },
  { id: "programs", title: "Sample programs and maintenance" },
  {
    id: "supplements",
    title: "Supplements, doses, safety, and typical costs",
  },
  { id: "checklist", title: "Quick-reference checklist" },
  { id: "faq", title: "Frequently Asked Questions" },
  { id: "references", title: "References" },
] as const;

export const RESISTANCE_TRAINING_FAQ: readonly { q: string; a: string }[] = [
  {
    q: "Do I have to train to failure to build muscle?",
    a: "No. Getting reasonably close to failure matters more than reaching it on every set. A 2024 meta-regression found hypertrophy tended to increase as sets finished closer to failure, while an eight-week study in trained adults found similar quadriceps growth with about 1-2 repetitions in reserve versus momentary failure. Systematic reviews do not establish a reliable hypertrophy advantage to mandatory failure. A practical default is 1-3 repetitions in reserve on most compound sets, with closer effort on stable machine or isolation work.",
  },
  {
    q: "How many sets per week do I need?",
    a: "There is no single optimal number. The 2026 American College of Sports Medicine position stand treats about 10 hard sets per muscle group per week as a useful population-level starting point for hypertrophy, and a 2026 volume meta-regression found a positive but diminishing dose-response. A practical start for growth is often 8-12 challenging sets per muscle per week, spread over at least two sessions, then adjusted for recovery and progress. More is not automatically better.",
  },
  {
    q: "Can I maintain muscle with much less training?",
    a: "Often yes, especially in younger adults, but it is not a universal rule. In a 32-week randomized maintenance experiment after 16 weeks of training, young adults preserved acquired hypertrophy even when weekly dose fell to one-third or one-ninth of the prior dose; older adults did not preserve hypertrophy as successfully with those reductions. Keep meaningful load and effort, and reduce weekly sets before turning maintenance work into easy sets. Individual needs vary with age, muscle group, and training history.",
  },
  {
    q: "Is whey protein required to build muscle?",
    a: "No. Total daily protein matters more than the powder. A large meta-analysis found protein supplementation can augment resistance-training gains, with additional fat-free-mass benefit leveling off around about 1.6 grams per kilogram of body weight per day on average. Whey is a convenient complete protein if it helps you reach that intake; food sources can do the same job. People with kidney disease, milk allergy, or other medical conditions should get individualized advice from a licensed clinician. Beema Health does not sell protein powder.",
  },
  {
    q: "Should I take creatine?",
    a: "Creatine monohydrate is the supplement with the clearest evidence for modestly augmenting resistance-training adaptations in healthy adults. Typical studied doses are 3-5 grams per day; a short loading phase is optional, not required. The National Institutes of Health notes a generally favorable safety record in healthy adults, with initial water-weight gain common. Dietary supplements are not individually approved by the United States Food and Drug Administration before sale. People with kidney disease or other medical conditions, and people taking prescription medications, should talk with a licensed clinician first. Beema Health does not sell creatine.",
  },
  {
    q: "Does this apply if I am using a glucagon-like peptide-1 medication?",
    a: "Resistance training and adequate protein are commonly discussed as lifestyle strategies during weight loss, including medically assisted weight loss. This page is general education for healthy adults. It is not a claim that any medication preserves muscle, and it is not a training prescription. Trial findings for branded glucagon-like peptide-1 products approved by the United States Food and Drug Administration are summarized in our companion guide and do not apply to compounded products. Whether training or any supplement is appropriate for you is a decision to make with a licensed clinician.",
  },
];

export type ResistanceTrainingReference = {
  /** Citation text shown on the page. */
  label: string;
  /** External URL opened in a new tab. Prefer DOI or official primary sources. */
  href: string;
};

export const RESISTANCE_TRAINING_REFERENCES: readonly ResistanceTrainingReference[] =
  [
    {
      label:
        "Currier BS, D'Souza AC, Fiatarone Singh MA, et al. American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews. Medicine and Science in Sports and Exercise. 2026;58(4):851-872.",
      href: "https://doi.org/10.1249/MSS.0000000000003897",
    },
    {
      label:
        "Pelland JC, Remmert JF, Robinson ZP, Hinson SR, Zourdos MC. The Resistance Training Dose-Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy and Strength Gain. SportRxiv. 2025/2026.",
      href: "https://doi.org/10.51224/srxiv.460",
    },
    {
      label:
        "Lopez P, Radaelli R, Taaffe DR, et al. Resistance Training Load Effects on Muscle Hypertrophy and Strength Gain: Systematic Review and Network Meta-analysis. Medicine and Science in Sports and Exercise. 2021;53(6):1206-1216.",
      href: "https://doi.org/10.1249/MSS.0000000000002585",
    },
    {
      label:
        "Schoenfeld BJ, Grgic J, Ogborn D, Krieger JW. Strength and Hypertrophy Adaptations Between Low- versus High-Load Resistance Training: A Systematic Review and Meta-analysis. Journal of Strength and Conditioning Research. 2017;31(12):3508-3523.",
      href: "https://doi.org/10.1519/JSC.0000000000002200",
    },
    {
      label:
        "Schoenfeld BJ, Grgic J, Van Every DW, Plotkin DL. Loading Recommendations for Muscle Strength, Hypertrophy, and Local Endurance: A Re-Examination of the Repetition Continuum. Sports (Basel). 2021;9(2):32.",
      href: "https://doi.org/10.3390/sports9020032",
    },
    {
      label:
        "Bickel CS, Cross JM, Bamman MM. Exercise Dosing to Retain Resistance Training Adaptations in Young and Older Adults. Medicine and Science in Sports and Exercise. 2011;43(7):1177-1187.",
      href: "https://doi.org/10.1249/MSS.0b013e318207c15d",
    },
    {
      label:
        "Morton RW, Murphy KT, McKellar SR, et al. A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults. British Journal of Sports Medicine. 2018;52(6):376-384.",
      href: "https://doi.org/10.1136/bjsports-2017-097608",
    },
    {
      label:
        "Burke R, Pi\u00f1ero A, Coleman M, et al. The Effects of Creatine Supplementation Combined with Resistance Training on Regional Measures of Muscle Hypertrophy: A Systematic Review with Meta-Analysis. Nutrients. 2023;15(9):2116.",
      href: "https://doi.org/10.3390/nu15092116",
    },
    {
      label:
        "National Institutes of Health, Office of Dietary Supplements. Dietary Supplements for Exercise and Athletic Performance: Health Professional Fact Sheet.",
      href: "https://ods.od.nih.gov/factsheets/ExerciseAndAthleticPerformance-HealthProfessional/",
    },
    {
      label:
        "Schoenfeld BJ, Grgic J, Krieger J. How many times per week should a muscle be trained to maximize muscle hypertrophy? A systematic review and meta-analysis of studies examining the effects of resistance training frequency. Journal of Sports Sciences. 2019;37(11):1286-1295.",
      href: "https://doi.org/10.1080/02640414.2018.1555906",
    },
    {
      label:
        "Singer A, Wolf M, Generoso L, et al. Give it a rest: a systematic review with Bayesian meta-analysis on the effect of inter-set rest interval duration on muscle hypertrophy. Frontiers in Sports and Active Living. 2024;6:1429789.",
      href: "https://doi.org/10.3389/fspor.2024.1429789",
    },
    {
      label:
        "Enes A, Pi\u00f1ero A, Hermann T, et al. How Slow Should You Go? A Systematic Review With Meta-Analysis of the Effect of Resistance Training Repetition Tempo on Muscle Hypertrophy. Journal of Strength and Conditioning Research. 2025;39(12):1331-1339.",
      href: "https://doi.org/10.1519/JSC.0000000000005302",
    },
    {
      label:
        "Robinson ZP, Pelland JC, Remmert JF, et al. Exploring the Dose-Response Relationship Between Estimated Resistance Training Proximity to Failure, Strength Gain, and Muscle Hypertrophy: A Series of Meta-Regressions. Sports Medicine. 2024;54(9):2209-2231.",
      href: "https://doi.org/10.1007/s40279-024-02069-2",
    },
    {
      label:
        "Refalo MC, Helms ER, Hamilton DL, Fyfe JJ. Similar muscle hypertrophy following eight weeks of resistance training to momentary muscular failure or with repetitions-in-reserve in resistance-trained individuals. Journal of Sports Sciences. 2024.",
      href: "https://doi.org/10.1080/02640414.2024.2321021",
    },
    {
      label:
        "Refalo MC, Helms ER, Trexler ET, Hamilton DL, Fyfe JJ. Influence of Resistance Training Proximity-to-Failure on Skeletal Muscle Hypertrophy: A Systematic Review with Meta-analysis. Sports Medicine. 2023;53(3):649-665.",
      href: "https://doi.org/10.1007/s40279-022-01784-y",
    },
    {
      label:
        "Helms ER, Cronin J, Storey A, Zourdos MC. Application of the Repetitions in Reserve-Based Rating of Perceived Exertion Scale for Resistance Training. Strength and Conditioning Journal. 2016;38(4):42-49.",
      href: "https://doi.org/10.1519/SSC.0000000000000218",
    },
    {
      label:
        "Grgic J, Schoenfeld BJ, Orazem J, Sabol F. Effects of resistance training performed to repetition failure or non-failure on muscular strength and hypertrophy: A systematic review and meta-analysis. Journal of Sport and Health Science. 2022;11(2):202-211.",
      href: "https://doi.org/10.1016/j.jshs.2021.01.007",
    },
    {
      label:
        "United States Food and Drug Administration. Spilling the Beans: How Much Caffeine is Too Much? (about 400 milligrams per day generally not associated with dangerous effects for healthy adults).",
      href: "https://www.fda.gov/consumers/consumer-updates/spilling-beans-how-much-caffeine-too-much",
    },
    {
      label:
        "United States Food and Drug Administration. Dietary Supplements (not individually approved by the United States Food and Drug Administration for safety and efficacy before marketing).",
      href: "https://www.fda.gov/food/dietary-supplements",
    },
    {
      label:
        "American College of Sports Medicine. Progression models in resistance training for healthy adults. Medicine and Science in Sports and Exercise. 2009;41(3):687-708.",
      href: "https://doi.org/10.1249/MSS.0b013e3181915670",
    },
  ];
