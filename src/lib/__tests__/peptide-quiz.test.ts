import { describe, expect, it } from "vitest";
import {
  EMAIL_STEP,
  GOAL_CATEGORIES,
  HEARD_FROM_OPTIONS,
  INITIAL_QUIZ_STATE,
  NEXT_STEP_OPTIONS,
  PRIORITY_OPTIONS,
  QUIZ_LENGTH,
  QUIZ_QUESTIONS,
  RESULTS_STEP,
  TRIED_OPTIONS,
  getQuizResult,
  quizReducer,
  type QuizAnswers,
  type QuizState,
} from "../peptide-quiz";
import {
  CATEGORY_CONTENT,
  flagNotes,
  showIntakeCta,
  suggestedStep,
} from "../peptide-quiz-content";

const BASE: QuizAnswers = {
  goal: "weight_metabolic",
  tried: "nothing_yet",
  heardFrom: "clinician",
  priority: "evidence",
  nextStep: "learn_basics",
};

function run(state: QuizState, ...values: string[]): QuizState {
  let s = state;
  for (const value of values) {
    s = quizReducer(s, { type: "select", value });
    s = quizReducer(s, { type: "next" });
  }
  return s;
}

describe("question definitions", () => {
  it("has five questions whose options match the answer unions", () => {
    expect(QUIZ_LENGTH).toBe(5);
    const byId = Object.fromEntries(
      QUIZ_QUESTIONS.map((q) => [q.id, q.options.map((o) => o.value)]),
    );
    expect(byId.goal).toEqual([...GOAL_CATEGORIES]);
    expect(byId.tried).toEqual([...TRIED_OPTIONS]);
    expect(byId.heardFrom).toEqual([...HEARD_FROM_OPTIONS]);
    expect(byId.priority).toEqual([...PRIORITY_OPTIONS]);
    expect(byId.nextStep).toEqual([...NEXT_STEP_OPTIONS]);
  });
});

describe("getQuizResult", () => {
  it("returns null until every question is answered", () => {
    expect(getQuizResult({})).toBeNull();
    const { nextStep: _omit, ...partial } = BASE;
    expect(getQuizResult(partial)).toBeNull();
  });

  it.each(GOAL_CATEGORIES)("maps goal %s to its category", (goal) => {
    expect(getQuizResult({ ...BASE, goal })?.category).toBe(goal);
  });

  it("sets isUnsureOfGoal only for the unsure goal", () => {
    for (const goal of GOAL_CATEGORIES) {
      expect(getQuizResult({ ...BASE, goal })?.flags.isUnsureOfGoal).toBe(
        goal === "unsure",
      );
    }
  });

  it("sets usedUnsupervisedProducts only for unsupervised products", () => {
    for (const tried of TRIED_OPTIONS) {
      expect(
        getQuizResult({ ...BASE, tried })?.flags.usedUnsupervisedProducts,
      ).toBe(tried === "unsupervised_products");
    }
  });

  it("sets wantsClinician for talk_first or prepare_questions", () => {
    for (const priority of PRIORITY_OPTIONS) {
      for (const nextStep of NEXT_STEP_OPTIONS) {
        const flags = getQuizResult({ ...BASE, priority, nextStep })?.flags;
        expect(flags?.wantsClinician).toBe(
          priority === "talk_first" || nextStep === "prepare_questions",
        );
        expect(flags?.hasClinician).toBe(nextStep === "have_clinician");
      }
    }
  });

  it("sets heardFromMarketing for social and ad sources only", () => {
    for (const heardFrom of HEARD_FROM_OPTIONS) {
      expect(
        getQuizResult({ ...BASE, heardFrom })?.flags.heardFromMarketing,
      ).toBe(heardFrom === "social_creator" || heardFrom === "ad_or_store");
    }
  });

  it("is deterministic and exposes no numeric score", () => {
    const a = getQuizResult(BASE);
    expect(getQuizResult(BASE)).toEqual(a);
    expect(JSON.stringify(a)).not.toMatch(/score|rank|match|percent/i);
  });

  it("has content for every category and a valid suggested step", () => {
    for (const goal of GOAL_CATEGORIES) {
      expect(CATEGORY_CONTENT[goal].clinicianQuestions.length).toBeGreaterThan(
        2,
      );
      for (const priority of PRIORITY_OPTIONS) {
        const result = getQuizResult({ ...BASE, goal, priority });
        if (!result) throw new Error("expected result");
        const step = suggestedStep(result);
        expect(step).toBeGreaterThanOrEqual(1);
        expect(step).toBeLessThanOrEqual(6);
        expect(Array.isArray(flagNotes(result))).toBe(true);
      }
    }
  });

  it("shows the intake CTA only for weight goals without a clinician", () => {
    const yes = getQuizResult(BASE);
    const noClinician = getQuizResult({ ...BASE, nextStep: "have_clinician" });
    const otherGoal = getQuizResult({ ...BASE, goal: "skin_appearance" });
    expect(yes && showIntakeCta(yes)).toBe(true);
    expect(noClinician && showIntakeCta(noClinician)).toBe(false);
    expect(otherGoal && showIntakeCta(otherGoal)).toBe(false);
  });
});

describe("quizReducer", () => {
  it("starts on question 1 with no answers", () => {
    expect(INITIAL_QUIZ_STATE).toEqual({
      step: 0,
      answers: {},
      unlocked: false,
    });
  });

  it("does not advance without an answer", () => {
    expect(quizReducer(INITIAL_QUIZ_STATE, { type: "next" })).toBe(
      INITIAL_QUIZ_STATE,
    );
  });

  it("ignores values that are not options of the current question", () => {
    expect(
      quizReducer(INITIAL_QUIZ_STATE, { type: "select", value: "nothing_yet" }),
    ).toBe(INITIAL_QUIZ_STATE);
    expect(
      quizReducer(INITIAL_QUIZ_STATE, { type: "select", value: "<script>" }),
    ).toBe(INITIAL_QUIZ_STATE);
  });

  it("walks forward through all questions to the email gate, then results after unlock", () => {
    const gate = run(
      INITIAL_QUIZ_STATE,
      "weight_metabolic",
      "nothing_yet",
      "clinician",
      "evidence",
      "learn_basics",
    );
    expect(gate.step).toBe(EMAIL_STEP);
    expect(gate.unlocked).toBe(false);
    const end = quizReducer(gate, { type: "unlock" });
    expect(end.step).toBe(RESULTS_STEP);
    expect(end.unlocked).toBe(true);
    expect(getQuizResult(end.answers)?.category).toBe("weight_metabolic");
  });

  it("cannot unlock before the email step or with missing answers", () => {
    expect(quizReducer(INITIAL_QUIZ_STATE, { type: "unlock" })).toBe(
      INITIAL_QUIZ_STATE,
    );
    const forced: QuizState = {
      step: EMAIL_STEP,
      answers: {},
      unlocked: false,
    };
    expect(quizReducer(forced, { type: "unlock" })).toBe(forced);
  });

  it("re-locks results when an answer changes after unlocking, but not when it is unchanged", () => {
    const unlocked = quizReducer(
      run(
        INITIAL_QUIZ_STATE,
        "unsure",
        "nothing_yet",
        "clinician",
        "evidence",
        "learn_basics",
      ),
      { type: "unlock" },
    );
    let s = quizReducer(unlocked, { type: "back" });
    expect(s.step).toBe(QUIZ_LENGTH - 1);
    s = quizReducer(s, { type: "select", value: "learn_basics" });
    expect(s.unlocked).toBe(true);
    expect(quizReducer(s, { type: "next" }).step).toBe(RESULTS_STEP);
    s = quizReducer(s, { type: "select", value: "compare_options" });
    expect(s.unlocked).toBe(false);
    expect(quizReducer(s, { type: "next" }).step).toBe(EMAIL_STEP);
  });

  it("goes back without losing answers and lets an answer change", () => {
    let s = run(INITIAL_QUIZ_STATE, "weight_metabolic", "nothing_yet");
    expect(s.step).toBe(2);
    s = quizReducer(s, { type: "back" });
    expect(s.step).toBe(1);
    expect(s.answers.tried).toBe("nothing_yet");
    s = quizReducer(s, { type: "select", value: "lifestyle_only" });
    expect(s.answers.tried).toBe("lifestyle_only");
    expect(s.answers.goal).toBe("weight_metabolic");
  });

  it("cannot go back before the first question", () => {
    expect(quizReducer(INITIAL_QUIZ_STATE, { type: "back" })).toBe(
      INITIAL_QUIZ_STATE,
    );
  });

  it("can go back from the email gate or results to the last question", () => {
    const gate = run(
      INITIAL_QUIZ_STATE,
      "unsure",
      "nothing_yet",
      "clinician",
      "evidence",
      "learn_basics",
    );
    const back = quizReducer(gate, { type: "back" });
    expect(back.step).toBe(QUIZ_LENGTH - 1);
    expect(back.answers.nextStep).toBe("learn_basics");
    const fromResults = quizReducer(quizReducer(gate, { type: "unlock" }), {
      type: "back",
    });
    expect(fromResults.step).toBe(QUIZ_LENGTH - 1);
  });

  it("restart clears everything", () => {
    const s = run(INITIAL_QUIZ_STATE, "unsure", "nothing_yet");
    expect(quizReducer(s, { type: "restart" })).toEqual(INITIAL_QUIZ_STATE);
  });
});
