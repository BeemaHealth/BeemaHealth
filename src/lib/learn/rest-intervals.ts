/**
 * Shared copy for /learn/rest-intervals. FAQ plain text must stay in sync
 * with the visible accordion (faqPageJsonLd consumes this array).
 */

export const REST_INTERVALS_PATH = "/learn/rest-intervals/" as const;
export const REST_INTERVALS_DATE_MODIFIED = "2026-08-13" as const;

export const REST_INTERVALS_TITLE =
  "Rest Intervals Between Sets for Muscle, Strength, and Power" as const;

export const REST_INTERVALS_DESCRIPTION =
  "How long to rest between sets for muscle, strength, and power, based on current evidence. Educational only, not medical advice." as const;

export type RestIntervalsTocItem = { id: string; title: string };

export const REST_INTERVALS_TOC: readonly RestIntervalsTocItem[] = [
  { id: "defaults", title: "What the evidence supports" },
  {
    id: "acute",
    title: "Volume, fatigue, and later-set quality",
  },
  {
    id: "chronic",
    title: "Hypertrophy, strength, and muscle preservation",
  },
  { id: "compare", title: "Comparing 1, 2, and 3 minutes" },
  { id: "programming", title: "Practical programming" },
  { id: "faq", title: "Frequently Asked Questions" },
  { id: "references", title: "References" },
] as const;

export const REST_INTERVALS_FAQ: readonly { q: string; a: string }[] = [
  {
    q: "How long should I rest between sets for muscle growth?",
    a: "A practical default for healthy adults around 18-40 is about 2 minutes between most working sets. Extend to about 3 minutes for demanding compound lifts, heavy strength work, or any set where 2 minutes does not restore performance. About 1 minute can work for low-fatigue isolation work or local muscular endurance, but it is more likely to cut repetitions, load, or velocity on later sets. Hypertrophy still occurs across rest categories; the best current meta-analysis found a small advantage to resting longer than 60 seconds and no appreciable extra growth benefit beyond roughly 90 seconds.",
  },
  {
    q: "Is a 1-minute rest better because it burns more?",
    a: "No. Short rest often raises lactate, rating of perceived exertion, and transient hormone responses, but those signals have not translated into superior hypertrophy. In one training study, a larger early hormonal response at 1 minute faded and did not produce better strength or lean-tissue results than 2.5 minutes. In an acute study, 1-minute rest blunted the early post-exercise myofibrillar protein-synthesis response compared with 5 minutes, despite higher testosterone and lactate. Extra metabolic stress is not a reliable reason to choose rest duration.",
  },
  {
    q: "Do I need 3 minutes on every exercise?",
    a: "No. Three minutes is a strong choice for heavy compounds, maximal strength, and power work when force or velocity quality matters. Two minutes is an excellent general default for hypertrophy and preservation when later-set performance is already recovered. One to 2 minutes is often enough for smaller isolation exercises if repetitions stay productive. Rest is an exercise-level variable, not a program-wide constant.",
  },
  {
    q: "Can shorter rest still maintain muscle?",
    a: "There are no long-term trials that randomize healthy adults to 1 versus 2 versus 3 minutes specifically to prevent muscle loss. Preservation is inferred from hypertrophy, volume, and reduced-dose maintenance research. Young adults can often keep previously gained muscle on a much smaller weekly training dose if load and effort stay meaningful. A practical inferred default is still 2 minutes on most work and 3 minutes on demanding compounds, because those intervals make limited maintenance volume easier to perform well. Rest interval was not manipulated in the main long-term maintenance experiment cited on this page.",
  },
  {
    q: "Does this apply to older adults?",
    a: "The rest-interval hypertrophy literature is mostly young adults, often men, and often untrained. Older adults should not simply inherit a young-adult default. A 32-week maintenance experiment found that young adults preserved acquired hypertrophy at one-third or one-ninth of the prior training dose, while older adults did not preserve hypertrophy as successfully. The National Strength and Conditioning Association has a position statement on resistance training for older adults, but it is not a rest-specific 1-versus-2-versus-3-minute statement for healthy young adults. Individualize with a licensed clinician, especially with medical conditions.",
  },
  {
    q: "Does this apply if I am using a glucagon-like peptide-1 medication?",
    a: "Resistance training and adequate protein are commonly discussed as lifestyle strategies during weight loss, including medically assisted weight loss. This page is general education on rest between sets for healthy adults. It is not a claim that any medication preserves muscle, and it is not a training prescription. Trial findings for branded glucagon-like peptide-1 products approved by the United States Food and Drug Administration are summarized in our companion guide and do not apply to compounded products. Whether a training plan is appropriate for you is a decision to make with a licensed clinician. Beema Health does not sell dietary supplements or training programs.",
  },
];

export type RestIntervalsReference = {
  /** Citation text shown on the page. */
  label: string;
  /** External URL opened in a new tab. Prefer DOI or official primary sources. */
  href: string;
};

export const REST_INTERVALS_REFERENCES: readonly RestIntervalsReference[] = [
  {
    label:
      "Singer A, Wolf M, Generoso L, et al. Give it a rest: a systematic review with Bayesian meta-analysis on the effect of inter-set rest interval duration on muscle hypertrophy. Frontiers in Sports and Active Living. 2024;6:1429789.",
    href: "https://doi.org/10.3389/fspor.2024.1429789",
  },
  {
    label:
      "Currier BS, D'Souza AC, Fiatarone Singh MA, et al. American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews. Medicine and Science in Sports and Exercise. 2026;58(4):851-872.",
    href: "https://doi.org/10.1249/MSS.0000000000003897",
  },
  {
    label:
      "Longo AR, Silva-Batista C, Pedroso K, et al. Volume Load Rather Than Resting Interval Influences Muscle Hypertrophy During High-Intensity Resistance Training. Journal of Strength and Conditioning Research. 2022;36(6):1554-1559.",
    href: "https://doi.org/10.1519/JSC.0000000000003668",
  },
  {
    label:
      "Schoenfeld BJ, Pope ZK, Benik FM, et al. Longer Interset Rest Periods Enhance Muscle Strength and Hypertrophy in Resistance-Trained Men. Journal of Strength and Conditioning Research. 2016;30(7):1805-1812.",
    href: "https://doi.org/10.1519/JSC.0000000000001272",
  },
  {
    label:
      "Buresh R, Berg K, French J. The effect of resistive exercise rest interval on hormonal response, strength, and hypertrophy with training. Journal of Strength and Conditioning Research. 2009;23(1):62-71.",
    href: "https://doi.org/10.1519/JSC.0b013e318185f14a",
  },
  {
    label:
      "McKendry J, et al. Short inter-set rest blunts resistance exercise-induced increases in myofibrillar protein synthesis and intracellular signalling in young males. Experimental Physiology. 2016.",
    href: "https://doi.org/10.1113/EP085647",
  },
  {
    label:
      "Hernandez Davo JL, Sabido Solana R, Sarabia Marin JM, Fernandez Fernandez J, Moya Ramon M. Rest Interval Required for Power Training With Power Load in the Bench Press Throw Exercise. Journal of Strength and Conditioning Research. 2016;30(5):1265-1274.",
    href: "https://doi.org/10.1519/JSC.0000000000001214",
  },
  {
    label:
      "Ahtiainen JP, Pakarinen A, Alen M, Kraemer WJ, Hakkinen K. Short versus long rest period between the sets in hypertrophic resistance training: Influence on muscle strength, size, and hormonal adaptations in trained men. Journal of Strength and Conditioning Research. 2005;19(3):572-582.",
    href: "https://doi.org/10.1519/15604.1",
  },
  {
    label:
      "Willardson JM, Burkett LN. A comparison of 3 different rest intervals on the exercise volume completed during a workout. Journal of Strength and Conditioning Research. 2005;19(1):23-26.",
    href: "https://doi.org/10.1519/R-13853.1",
  },
  {
    label:
      "Bickel CS, Cross JM, Bamman MM. Exercise Dosing to Retain Resistance Training Adaptations in Young and Older Adults. Medicine and Science in Sports and Exercise. 2011;43(7):1177-1187.",
    href: "https://doi.org/10.1249/MSS.0b013e318207c15d",
  },
  {
    label:
      "Grgic J, Schoenfeld BJ, Skrepnik M, Davies TB, Mikulic P. Effects of Rest Interval Duration in Resistance Training on Measures of Muscular Strength: A Systematic Review. Sports Medicine. 2018;48(1):137-151.",
    href: "https://doi.org/10.1007/s40279-017-0788-x",
  },
  {
    label:
      "de Salles BF, Simao R, Miranda F, Novaes JS, Lemos A, Willardson JM. Rest Interval between Sets in Strength Training. Sports Medicine. 2009;39(9):765-777.",
    href: "https://doi.org/10.2165/11315230-000000000-00000",
  },
  {
    label:
      "American College of Sports Medicine. Progression models in resistance training for healthy adults. Medicine and Science in Sports and Exercise. 2009;41(3):687-708.",
    href: "https://doi.org/10.1249/MSS.0b013e3181915670",
  },
  {
    label:
      "Fragala MS, Cadore EL, Dorgo S, et al. Resistance Training for Older Adults: Position Statement From the National Strength and Conditioning Association. Journal of Strength and Conditioning Research. 2019;33(8):2019-2052.",
    href: "https://doi.org/10.1519/JSC.0000000000003230",
  },
  {
    label:
      "Senna GW, et al. Higher Muscle Damage Triggered by Shorter Inter-Set Rest Periods in Volume-Equated Resistance Exercise. Frontiers in Physiology. 2022;13:827847.",
    href: "https://doi.org/10.3389/fphys.2022.827847",
  },
  {
    label:
      "Schoenfeld BJ, Grgic J, Van Every DW, Plotkin DL. Loading Recommendations for Muscle Strength, Hypertrophy, and Local Endurance: A Re-Examination of the Repetition Continuum. Sports (Basel). 2021;9(2):32.",
    href: "https://doi.org/10.3390/sports9020032",
  },
  {
    label:
      "Grgic J, Lazinica B, Mikulic P, Krieger JW, Schoenfeld BJ. The effects of short versus long inter-set rest intervals in resistance training on measures of muscle hypertrophy: A systematic review. European Journal of Sport Science. 2017;17(8):983-993.",
    href: "https://doi.org/10.1080/17461391.2017.1340524",
  },
];
