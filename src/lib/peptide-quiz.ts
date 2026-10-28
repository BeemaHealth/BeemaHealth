/**
 * "Which peptide fits your goal?" quiz: questions, answer types and the pure
 * result mapper.
 *
 * Educational reading list only. There is no numeric scoring, no ranking of
 * products, and no output that names a medication as right for the reader.
 * Answers live in component state only (never storage, analytics, or an API).
 */

export const GOAL_CATEGORIES = [
  "weight_metabolic",
  "recovery_injury",
  "growth_hormone",
  "skin_appearance",
  "healthy_aging",
  "unsure",
] as const;
export type GoalCategory = (typeof GOAL_CATEGORIES)[number];

export const TRIED_OPTIONS = [
  "lifestyle_only",
  "prescribed_medication",
  "unsupervised_products",
  "nothing_yet",
] as const;
export type Tried = (typeof TRIED_OPTIONS)[number];

export const HEARD_FROM_OPTIONS = [
  "clinician",
  "friend_family",
  "social_creator",
  "ad_or_store",
] as const;
export type HeardFrom = (typeof HEARD_FROM_OPTIONS)[number];

export const PRIORITY_OPTIONS = [
  "evidence",
  "safety_legal",
  "cost_commitment",
  "convenience",
  "talk_first",
] as const;
export type Priority = (typeof PRIORITY_OPTIONS)[number];

export const NEXT_STEP_OPTIONS = [
  "learn_basics",
  "compare_options",
  "prepare_questions",
  "have_clinician",
] as const;
export type NextStep = (typeof NEXT_STEP_OPTIONS)[number];

export type QuizAnswers = {
  goal: GoalCategory;
  tried: Tried;
  heardFrom: HeardFrom;
  priority: Priority;
  nextStep: NextStep;
};

export type QuizQuestionId = keyof QuizAnswers;

export type QuizOption = { value: string; label: string };
export type QuizQuestion = {
  id: QuizQuestionId;
  prompt: string;
  options: readonly QuizOption[];
};

export const QUIZ_QUESTIONS: readonly QuizQuestion[] = [
  {
    id: "goal",
    prompt: "What are you hoping to address?",
    options: [
      { value: "weight_metabolic", label: "Weight and metabolic health" },
      { value: "recovery_injury", label: "Muscle recovery or an injury" },
      {
        value: "growth_hormone",
        label: "Growth hormone signaling or body composition",
      },
      { value: "skin_appearance", label: "Skin and appearance" },
      { value: "healthy_aging", label: "Healthy aging" },
      { value: "unsure", label: "I am not sure yet" },
    ],
  },
  {
    id: "tried",
    prompt: "What have you already tried?",
    options: [
      { value: "lifestyle_only", label: "Diet and exercise only" },
      { value: "prescribed_medication", label: "A prescribed medication" },
      {
        value: "unsupervised_products",
        label: "Supplements or products without a clinician",
      },
      { value: "nothing_yet", label: "Nothing yet" },
    ],
  },
  {
    id: "heardFrom",
    prompt: "Where did you first hear about it?",
    options: [
      { value: "clinician", label: "A clinician" },
      { value: "friend_family", label: "A friend or family member" },
      { value: "social_creator", label: "Social media or a creator" },
      { value: "ad_or_store", label: "An online ad or a store" },
    ],
  },
  {
    id: "priority",
    prompt: "What matters most to you right now?",
    options: [
      { value: "evidence", label: "The strength of the evidence" },
      { value: "safety_legal", label: "Safety and legal status" },
      { value: "cost_commitment", label: "Cost and ongoing commitment" },
      { value: "convenience", label: "Convenience" },
      { value: "talk_first", label: "Talking to someone first" },
    ],
  },
  {
    id: "nextStep",
    prompt: "What is your next step?",
    options: [
      { value: "learn_basics", label: "Learn the basics" },
      { value: "compare_options", label: "Compare options" },
      {
        value: "prepare_questions",
        label: "Prepare questions for a clinician",
      },
      { value: "have_clinician", label: "I already have a clinician" },
    ],
  },
];

export const QUIZ_LENGTH = QUIZ_QUESTIONS.length;

export type QuizFlags = {
  /** Goal answer was "not sure yet": the reading list starts with goal-setting. */
  isUnsureOfGoal: boolean;
  /** Has used supplements or products without a clinician. */
  usedUnsupervisedProducts: boolean;
  /** Wants to talk to someone first, or is preparing questions for a clinician. */
  wantsClinician: boolean;
  /** Already works with a clinician. */
  hasClinician: boolean;
  /** First heard about it through social media, a creator, an ad, or a store. */
  heardFromMarketing: boolean;
};

export type QuizResult = {
  category: GoalCategory;
  flags: QuizFlags;
  /** Echoed so the results screen can adapt tone, never to rank anything. */
  priority: Priority;
  nextStep: NextStep;
};

export type PartialAnswers = Partial<QuizAnswers>;

function isComplete(answers: PartialAnswers): answers is QuizAnswers {
  return QUIZ_QUESTIONS.every((q) => answers[q.id] !== undefined);
}

/** Maps a full set of answers to a goal category plus flags. Null if incomplete. */
export function getQuizResult(answers: PartialAnswers): QuizResult | null {
  if (!isComplete(answers)) return null;
  return {
    category: answers.goal,
    flags: {
      isUnsureOfGoal: answers.goal === "unsure",
      usedUnsupervisedProducts: answers.tried === "unsupervised_products",
      wantsClinician:
        answers.priority === "talk_first" ||
        answers.nextStep === "prepare_questions",
      hasClinician: answers.nextStep === "have_clinician",
      heardFromMarketing:
        answers.heardFrom === "social_creator" ||
        answers.heardFrom === "ad_or_store",
    },
    priority: answers.priority,
    nextStep: answers.nextStep,
  };
}

/** Step index 0..QUIZ_LENGTH-1 is a question; QUIZ_LENGTH is the results screen. */
export type QuizState = { step: number; answers: PartialAnswers };

export type QuizAction =
  | { type: "select"; value: string }
  | { type: "next" }
  | { type: "back" }
  | { type: "restart" };

export const INITIAL_QUIZ_STATE: QuizState = { step: 0, answers: {} };

function isValidOption(question: QuizQuestion, value: string): boolean {
  return question.options.some((o) => o.value === value);
}

/**
 * Forward needs an answer for the current question; back keeps every answer so
 * the reader can change one and move on. Unknown option values are ignored.
 */
export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case "select": {
      const question = QUIZ_QUESTIONS[state.step];
      if (!question || !isValidOption(question, action.value)) return state;
      return {
        ...state,
        answers: { ...state.answers, [question.id]: action.value },
      };
    }
    case "next": {
      const question = QUIZ_QUESTIONS[state.step];
      if (!question || state.answers[question.id] === undefined) return state;
      return { ...state, step: state.step + 1 };
    }
    case "back":
      return state.step > 0 ? { ...state, step: state.step - 1 } : state;
    case "restart":
      return INITIAL_QUIZ_STATE;
  }
}
