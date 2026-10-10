import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { closeDemoDatabase } from "@/lib/db/demo-store";
import { getTeacherReviewDetail, listTeacherReviewSummaries } from "@/lib/services/teacher-review";
import { createTeacherQuiz, publishTeacherQuiz, type QuizInput } from "@/lib/services/teacher-quizzes";
import { submitStudentQuizAttempt } from "@/lib/services/student-quizzes";

const input: QuizInput = {
  title: "Python response review",
  instructions: "Choose one answer.",
  durationMinutes: 10,
  availableFrom: null,
  availableUntil: null,
  attemptLimit: 3,
  questions: [
    { prompt: "Which keyword defines a function?", options: ["func", "def", "function", "lambda"], correctOptionIndex: 1, explanation: "Use def to define a function.", concept: "Functions" },
    { prompt: "Which type stores an ordered sequence?", options: ["dict", "set", "list", "bool"], correctOptionIndex: 2, explanation: "Lists preserve item order.", concept: "Collections" },
  ],
};

beforeEach(() => {
  closeDemoDatabase();
  process.env.DEMO_MODE = "true";
  process.env.DEMO_DB_PATH = ":memory:";
});
afterEach(() => closeDemoDatabase());

describe("teacher submission review demo service", () => {
  it("lists only finalized attempts and filters by quiz", () => {
    const first = createTeacherQuiz(input);
    const second = createTeacherQuiz({ ...input, title: "Another Python check" });
    publishTeacherQuiz(first.id);
    publishTeacherQuiz(second.id);
    const attempt = submitStudentQuizAttempt(first.id, { [first.questions[0]!.id]: 1 });
    expect(attempt).not.toBeNull();

    expect(listTeacherReviewSummaries()).toHaveLength(1);
    expect(listTeacherReviewSummaries(first.id)).toHaveLength(1);
    expect(listTeacherReviewSummaries(second.id)).toHaveLength(0);
    expect(listTeacherReviewSummaries(first.id)[0]?.unansweredCount).toBe(1);
  });

  it("returns answer-by-answer details without changing the saved score", () => {
    const quiz = createTeacherQuiz(input);
    publishTeacherQuiz(quiz.id);
    const attempt = submitStudentQuizAttempt(quiz.id, {
      [quiz.questions[0]!.id]: 1,
      [quiz.questions[1]!.id]: 0,
    });
    expect(attempt).not.toBeNull();

    const review = getTeacherReviewDetail(attempt!.attemptId);
    expect(review?.scorePercent).toBe(50);
    expect(review?.correctCount).toBe(1);
    expect(review?.answers[0]).toMatchObject({
      selectedAnswer: "def",
      correctAnswer: "def",
      isCorrect: true,
      explanation: "Use def to define a function.",
    });
    expect(review?.answers[1]).toMatchObject({
      selectedAnswer: "dict",
      correctAnswer: "list",
      isCorrect: false,
    });
    expect(getTeacherReviewDetail("missing-attempt")).toBeNull();
  });
});
