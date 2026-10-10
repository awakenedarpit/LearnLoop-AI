import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { closeDemoDatabase } from "@/lib/db/demo-store";
import {
  createTeacherQuiz,
  listTeacherQuizzes,
  publishTeacherQuiz,
  updateTeacherQuiz,
  type QuizInput,
} from "@/lib/services/teacher-quizzes";

const quizInput: QuizInput = {
  title: "Python basics check",
  instructions: "Choose one answer.",
  durationMinutes: 15,
  availableFrom: null,
  availableUntil: null,
  attemptLimit: 2,
  questions: [{
    prompt: "Which keyword defines a function in Python?",
    options: ["func", "def", "function", "lambda"],
    correctOptionIndex: 1,
    explanation: "The def keyword begins a function definition.",
    concept: "Functions",
  }],
};

beforeEach(() => {
  closeDemoDatabase();
  process.env.DEMO_MODE = "true";
  process.env.DEMO_DB_PATH = ":memory:";
});

afterEach(() => {
  closeDemoDatabase();
});

describe("teacher quiz demo service", () => {
  it("creates a draft and lists the saved quiz", () => {
    const quiz = createTeacherQuiz(quizInput);
    expect(quiz.status).toBe("draft");
    expect(quiz.questions).toHaveLength(1);
    expect(quiz.questions[0]?.options[quiz.questions[0].correctOptionIndex]).toBe("def");
    expect(listTeacherQuizzes().map((item) => item.id)).toContain(quiz.id);
  });

  it("updates a draft while retaining question identity by position", () => {
    const quiz = createTeacherQuiz(quizInput);
    const originalQuestionId = quiz.questions[0]?.id;
    const updated = updateTeacherQuiz(quiz.id, { ...quizInput, title: "Python functions check" });
    expect(updated?.title).toBe("Python functions check");
    expect(updated?.status).toBe("draft");
    expect(updated?.questions[0]?.id).toBe(originalQuestionId);
  });

  it("publishes a saved draft and prevents later edits", () => {
    const quiz = createTeacherQuiz(quizInput);
    const published = publishTeacherQuiz(quiz.id);
    expect(published?.status).toBe("published");
    expect(publishTeacherQuiz(quiz.id)?.status).toBe("published");
    expect(() => updateTeacherQuiz(quiz.id, quizInput)).toThrow("PUBLISHED_QUIZ_LOCKED");
  });

  it("does not publish an empty quiz", () => {
    const quiz = createTeacherQuiz({ ...quizInput, questions: [] });
    expect(() => publishTeacherQuiz(quiz.id)).toThrow("QUIZ_NEEDS_QUESTIONS");
  });
});
