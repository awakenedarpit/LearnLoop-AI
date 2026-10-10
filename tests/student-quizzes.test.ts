import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { closeDemoDatabase, getDemoDatabase } from "@/lib/db/demo-store";
import { finalizeStudentQuizAttempt, saveStudentQuizAttemptAnswers, startOrResumeStudentQuizAttempt } from "@/lib/services/student-quiz-attempts";
import { createTeacherQuiz, publishTeacherQuiz, type QuizInput } from "@/lib/services/teacher-quizzes";
import { getStudentQuiz, listStudentQuizzes, submitStudentQuizAttempt } from "@/lib/services/student-quizzes";

const input: QuizInput = {
  title: "Python basics check",
  instructions: "Choose one answer.",
  durationMinutes: 15,
  availableFrom: null,
  availableUntil: null,
  attemptLimit: 1,
  questions: [
    { prompt: "Which keyword defines a function in Python?", options: ["func", "def", "function", "lambda"], correctOptionIndex: 1, explanation: "Use def to define a function.", concept: "Functions" },
    { prompt: "Which type stores an ordered sequence?", options: ["dict", "set", "list", "bool"], correctOptionIndex: 2, explanation: "Lists store ordered items.", concept: "Collections" },
  ],
};

beforeEach(() => {
  closeDemoDatabase();
  process.env.DEMO_MODE = "true";
  process.env.DEMO_DB_PATH = ":memory:";
});
afterEach(() => closeDemoDatabase());

describe("student quiz attempts demo service", () => {
  it("lists published quizzes and never exposes answer keys before submission", () => {
    const quiz = createTeacherQuiz(input);
    publishTeacherQuiz(quiz.id);
    expect(listStudentQuizzes().map((item) => item.id)).toContain(quiz.id);
    const studentQuiz = getStudentQuiz(quiz.id);
    expect(studentQuiz?.questions[0]).not.toHaveProperty("correctOptionIndex");
    expect(studentQuiz?.questions[0]).not.toHaveProperty("explanation");
  });

  it("grades on the server, returns explanations, and enforces the attempt limit", () => {
    const quiz = createTeacherQuiz(input);
    publishTeacherQuiz(quiz.id);
    const result = submitStudentQuizAttempt(quiz.id, { [quiz.questions[0]!.id]: 1 });
    expect(result?.scorePercent).toBe(50);
    expect(result?.answers[0]?.explanation).toContain("def");
    expect(() => submitStudentQuizAttempt(quiz.id, {})).toThrow("ATTEMPT_LIMIT_REACHED");
  });

  it("does not expose draft quizzes", () => {
    const quiz = createTeacherQuiz(input);
    expect(getStudentQuiz(quiz.id)).toBeNull();
    expect(listStudentQuizzes().some((item) => item.id === quiz.id)).toBe(false);
  });

  it("rejects answer IDs that do not belong to the quiz", () => {
    const quiz = createTeacherQuiz(input);
    publishTeacherQuiz(quiz.id);
    expect(() => submitStudentQuizAttempt(quiz.id, { "not-a-question": 0 })).toThrow("INVALID_ANSWERS");
  });
  it("autosaves and resumes the same active attempt after a simulated refresh", () => {
    const quiz = createTeacherQuiz(input);
    publishTeacherQuiz(quiz.id);
    const started = startOrResumeStudentQuizAttempt(quiz.id);
    saveStudentQuizAttemptAnswers(started.attemptId, quiz.id, { [quiz.questions[0]!.id]: 1 });
    const resumed = startOrResumeStudentQuizAttempt(quiz.id);
    expect(resumed.attemptId).toBe(started.attemptId);
    expect(resumed.answers[quiz.questions[0]!.id]).toBe(1);
  });

  it("uses only server-saved answers after the deadline", () => {
    const quiz = createTeacherQuiz(input);
    publishTeacherQuiz(quiz.id);
    const started = startOrResumeStudentQuizAttempt(quiz.id);
    saveStudentQuizAttemptAnswers(started.attemptId, quiz.id, { [quiz.questions[0]!.id]: 1 });
    getDemoDatabase().prepare("UPDATE student_quiz_active_attempts SET expires_at = ? WHERE id = ?").run(new Date(Date.now() - 1000).toISOString(), started.attemptId);
    const result = finalizeStudentQuizAttempt(started.attemptId, quiz.id, { [quiz.questions[0]!.id]: 0 });
    expect(result.scorePercent).toBe(50);
    expect(result.answers[0]!.selectedOptionIndex).toBe(1);
  });

});
