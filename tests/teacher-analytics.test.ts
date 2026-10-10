import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { closeDemoDatabase } from "@/lib/db/demo-store";
import { getTeacherAnalytics } from "@/lib/services/teacher-analytics";
import { createTeacherQuiz, publishTeacherQuiz, type QuizInput } from "@/lib/services/teacher-quizzes";
import { submitStudentQuizAttempt } from "@/lib/services/student-quizzes";

const input: QuizInput = {
  title: "Python basics check",
  instructions: "Choose one answer.",
  durationMinutes: 15,
  availableFrom: null,
  availableUntil: null,
  attemptLimit: 3,
  questions: [
    { prompt: "Which keyword defines a function in Python?", options: ["func", "def", "function", "lambda"], correctOptionIndex: 1, explanation: "Use def.", concept: "Functions" },
    { prompt: "Which type stores an ordered sequence?", options: ["dict", "set", "list", "bool"], correctOptionIndex: 2, explanation: "Lists are ordered.", concept: "Collections" },
  ],
};

beforeEach(() => {
  closeDemoDatabase();
  process.env.DEMO_MODE = "true";
  process.env.DEMO_DB_PATH = ":memory:";
});
afterEach(() => closeDemoDatabase());

describe("teacher analytics demo service", () => {
  it("returns honest empty-state metrics before any submission", () => {
    createTeacherQuiz(input);
    const analytics = getTeacherAnalytics();
    expect(analytics.totalQuizzes).toBe(1);
    expect(analytics.totalSubmissions).toBe(0);
    expect(analytics.overallAverageScore).toBeNull();
    expect(analytics.quizzes[0]?.averageScore).toBeNull();
    expect(analytics.quizzes[0]?.passRate).toBeNull();
  });

  it("aggregates actual scores and per-question correctness from finalized attempts", () => {
    const quiz = createTeacherQuiz(input);
    publishTeacherQuiz(quiz.id);
    submitStudentQuizAttempt(quiz.id, { [quiz.questions[0]!.id]: 1, [quiz.questions[1]!.id]: 2 });
    submitStudentQuizAttempt(quiz.id, { [quiz.questions[0]!.id]: 0, [quiz.questions[1]!.id]: 2 });

    const analytics = getTeacherAnalytics();
    expect(analytics.totalSubmissions).toBe(2);
    expect(analytics.overallAverageScore).toBe(75);
    expect(analytics.quizzes[0]?.averageScore).toBe(75);
    expect(analytics.quizzes[0]?.highestScore).toBe(100);
    expect(analytics.quizzes[0]?.passRate).toBe(100);
    expect(analytics.quizzes[0]?.questionStats[0]?.accuracyPercent).toBe(50);
    expect(analytics.quizzes[0]?.questionStats[1]?.accuracyPercent).toBe(100);
    expect(analytics.recentSubmissions).toHaveLength(2);
  });
});
