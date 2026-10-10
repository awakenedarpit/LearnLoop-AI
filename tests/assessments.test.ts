import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { closeDemoDatabase } from "@/lib/db/demo-store";
import { createTeacherQuiz, publishTeacherQuiz, type QuizInput } from "@/lib/services/teacher-quizzes";
import { createAssessmentAttempt, finalizeAssessmentAttempt, getAssessmentAttempt, saveAssessmentAnswer } from "@/lib/services/assessments";
const input: QuizInput = { title: "Assessment flow", instructions: "Choose one.", durationMinutes: 10, availableFrom: null, availableUntil: null, attemptLimit: 1, questions: [{ prompt: "Which keyword defines a function?", options: ["func", "def", "make", "run"], correctOptionIndex: 1, explanation: "def defines functions.", concept: "Functions" }] };
beforeEach(() => { process.env.DEMO_MODE = "true"; process.env.DEMO_DB_PATH = ":memory:"; closeDemoDatabase(); });
afterEach(() => closeDemoDatabase());
describe("local assessment attempts", () => {
  it("does not expose the answer key before finalization and autosaves server-side", () => {
    const quiz = publishTeacherQuiz(createTeacherQuiz(input).id)!;
    const attempt = createAssessmentAttempt(quiz.id, new Date("2026-10-11T00:00:00.000Z"));
    expect(attempt.questions[0]?.correctOptionIndex).toBeUndefined();
    saveAssessmentAnswer(attempt.id, attempt.questions[0]!.id, 1, new Date("2026-10-11T00:01:00.000Z"));
    expect(getAssessmentAttempt(attempt.id, new Date("2026-10-11T00:02:00.000Z")).questions[0]?.selectedOptionIndex).toBe(1);
  });
  it("finalizes once, scores saved answers, and remains immutable", () => {
    const quiz = publishTeacherQuiz(createTeacherQuiz(input).id)!;
    const attempt = createAssessmentAttempt(quiz.id, new Date("2026-10-11T00:00:00.000Z"));
    saveAssessmentAnswer(attempt.id, attempt.questions[0]!.id, 1, new Date("2026-10-11T00:01:00.000Z"));
    const finalized = finalizeAssessmentAttempt(attempt.id, new Date("2026-10-11T00:02:00.000Z"));
    expect(finalized.status).toBe("submitted"); expect(finalized.scorePercent).toBe(100); expect(finalized.questions[0]?.correctOptionIndex).toBe(1);
    expect(finalizeAssessmentAttempt(attempt.id, new Date("2026-10-11T00:03:00.000Z")).submittedAt).toBe(finalized.submittedAt);
    expect(() => saveAssessmentAnswer(attempt.id, attempt.questions[0]!.id, 0, new Date("2026-10-11T00:03:00.000Z"))).toThrow("already finalized");
  });
  it("expires at the server deadline using the latest saved answer", () => {
    const quiz = publishTeacherQuiz(createTeacherQuiz({ ...input, durationMinutes: 1 }).id)!;
    const attempt = createAssessmentAttempt(quiz.id, new Date("2026-10-11T00:00:00.000Z"));
    saveAssessmentAnswer(attempt.id, attempt.questions[0]!.id, 0, new Date("2026-10-11T00:00:30.000Z"));
    const expired = getAssessmentAttempt(attempt.id, new Date("2026-10-11T00:01:01.000Z"));
    expect(expired.status).toBe("expired"); expect(expired.scorePercent).toBe(0); expect(expired.finalizationReason).toBe("deadline");
  });
});
