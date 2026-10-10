import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { closeDemoDatabase } from "@/lib/db/demo-store";
import { GET } from "@/app/api/teacher/analytics/export/route";
import { createTeacherQuiz, publishTeacherQuiz, type QuizInput } from "@/lib/services/teacher-quizzes";
import { submitStudentQuizAttempt } from "@/lib/services/student-quizzes";

const input: QuizInput = {
  title: 'Python, "Core"',
  instructions: "Choose one answer.",
  durationMinutes: 15,
  availableFrom: null,
  availableUntil: null,
  attemptLimit: 2,
  questions: [
    { prompt: "Which type, if any, stores an ordered sequence?", options: ["dict", "set", "list", "bool"], correctOptionIndex: 2, explanation: "Lists are ordered.", concept: "Collections" },
  ],
};

beforeEach(() => {
  closeDemoDatabase();
  process.env.DEMO_MODE = "true";
  process.env.DEMO_DB_PATH = ":memory:";
});
afterEach(() => closeDemoDatabase());

describe("teacher analytics CSV export", () => {
  it("exports actual assessment and question metrics with valid CSV escaping", async () => {
    const quiz = createTeacherQuiz(input);
    publishTeacherQuiz(quiz.id);
    submitStudentQuizAttempt(quiz.id, { [quiz.questions[0]!.id]: 2 });

    const response = await GET(new Request("http://localhost/api/teacher/analytics/export"));
    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(response.headers.get("content-disposition")).toContain("learnloop-assessment-analytics.csv");
    expect(csv).toContain('"Python, ""Core"""');
    expect(csv).toContain('"Which type, if any, stores an ordered sequence?"');
    expect(csv).toContain("100");
  });

  it("filters to one assessment and returns 404 for an unknown assessment", async () => {
    const quiz = createTeacherQuiz(input);
    const filtered = await GET(new Request(`http://localhost/api/teacher/analytics/export?quizId=${quiz.id}`));
    const csv = await filtered.text();
    expect(filtered.status).toBe(200);
    expect(csv).toContain('"Python, ""Core"""');

    const missing = await GET(new Request("http://localhost/api/teacher/analytics/export?quizId=missing"));
    expect(missing.status).toBe(404);
  });
});
