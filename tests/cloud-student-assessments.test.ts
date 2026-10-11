import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({ rpc: rpcMock })),
}));

import {
  getCloudStudentQuiz,
  listCloudStudentQuizzes,
  startCloudStudentQuizAttempt,
} from "@/lib/services/cloud-student-assessments";

const quizId = "123e4567-e89b-42d3-a456-426614174000";

beforeEach(() => rpcMock.mockReset());

describe("cloud assessment RPC adapter", () => {
  it("maps the assigned quiz list", async () => {
    rpcMock.mockResolvedValue({ data: [{ id: quizId, title: "Python", instructions: "", durationMinutes: 10, attemptLimit: 2, questionCount: 4, attemptsUsed: 1 }], error: null });
    const result = await listCloudStudentQuizzes();
    expect(result[0]).toMatchObject({ id: quizId, title: "Python", questionCount: 4, attemptsUsed: 1 });
    expect(rpcMock).toHaveBeenCalledWith("list_assigned_quizzes");
  });

  it("returns only question fields supplied by the safe quiz RPC", async () => {
    rpcMock.mockResolvedValue({ data: { id: quizId, title: "Python", instructions: "", durationMinutes: 10, attemptLimit: 1, questions: [{ id: "q1", prompt: "Question", options: ["A", "B"], concept: "Basics" }] }, error: null });
    const result = await getCloudStudentQuiz(quizId);
    expect(result?.questions[0]).toEqual({ id: "q1", prompt: "Question", options: ["A", "B"], concept: "Basics" });
    expect(rpcMock).toHaveBeenCalledWith("get_assigned_quiz", { p_quiz_id: quizId });
  });

  it("rejects invalid quiz identifiers without a remote call", async () => {
    await expect(getCloudStudentQuiz("invalid")).resolves.toBeNull();
    await expect(startCloudStudentQuizAttempt("invalid")).rejects.toMatchObject({ message: "QUIZ_NOT_AVAILABLE" });
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
