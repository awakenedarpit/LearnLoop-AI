import { describe, expect, it } from "vitest";
import { CONCEPTS, QUESTION_BANK } from "@/lib/learning/catalog";
import { calculateLearningScore } from "@/lib/learning/scoring";

describe("Python Fundamentals question bank", () => {
  it("covers each concept with three unique, valid question variants", () => {
    const ids = new Set(QUESTION_BANK.map((question) => question.id));
    expect(ids.size).toBe(QUESTION_BANK.length);
    for (const concept of CONCEPTS) {
      const questions = QUESTION_BANK.filter((question) => question.concept === concept.id);
      expect(questions).toHaveLength(3);
      for (const question of questions) {
        expect(question.options.map((option) => option.id)).toContain(question.correctOptionId);
        expect(new Set(question.options.map((option) => option.id)).size).toBe(question.options.length);
        expect(question.hint.trim()).not.toBe("");
        expect(question.explanation.trim()).not.toBe("");
      }
    }
  });
});

describe("calculateLearningScore", () => {
  const baselineQuestions = CONCEPTS.map((concept) => {
    const question = QUESTION_BANK.find((item) => item.concept === concept.id && item.order === 1)!;
    return { id: question.id, concept: question.concept, correctOptionId: question.correctOptionId };
  });

  it("scores only the six supplied questions and identifies missed concepts", () => {
    const answers = baselineQuestions.slice(0, 2).map((question) => ({ questionId: question.id, selectedOptionId: question.correctOptionId }));
    const result = calculateLearningScore(baselineQuestions, answers, "2026-10-10T00:00:00.000Z");
    expect(result.scorePercent).toBe(33);
    expect(result.correctCount).toBe(2);
    expect(result.answeredCount).toBe(2);
    expect(result.unansweredCount).toBe(4);
    expect(result.concepts).toHaveLength(6);
    expect(result.gaps).toEqual(["conditionals", "loops", "functions", "lists"]);
    expect(result.completedAt).toBe("2026-10-10T00:00:00.000Z");
  });

  it("does not call an untested concept a gap", () => {
    const question = baselineQuestions[0]!;
    const result = calculateLearningScore([question], [], "2026-10-10T00:00:00.000Z");
    expect(result.concepts).toHaveLength(1);
    expect(result.concepts[0]?.accuracy).toBe(0);
    expect(result.gaps).toEqual(["variables"]);
  });

  it("does not count answers for questions outside the session", () => {
    const question = baselineQuestions[0]!;
    const result = calculateLearningScore([question], [{ questionId: "not-in-this-session", selectedOptionId: "a" }], "2026-10-10T00:00:00.000Z");
    expect(result.correctCount).toBe(0);
    expect(result.answeredCount).toBe(0);
    expect(result.unansweredCount).toBe(1);
  });
});
