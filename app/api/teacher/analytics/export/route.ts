import { DemoModeUnavailableError } from "@/lib/db/demo-store";
import { getTeacherAnalytics } from "@/lib/services/teacher-analytics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const columns = [
  "assessment_id",
  "assessment_title",
  "status",
  "question_count",
  "duration_minutes",
  "attempt_limit",
  "submission_count",
  "average_score_percent",
  "highest_score_percent",
  "pass_rate_percent",
  "last_submitted_at",
  "question_id",
  "question_prompt",
  "concept",
  "question_submissions",
  "correct_count",
  "accuracy_percent",
] as const;

function csvCell(value: string | number | null): string {
  if (value === null) return "";
  let text = String(value);
  // Prevent spreadsheet formula execution when opening user-authored labels/prompts.
  if (typeof value === "string" && /^[=+@\t\r-]/.test(text)) text = "'" + text;
  if (/[",\r\n]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
  return text;
}

export async function GET(request: Request): Promise<Response> {
  try {
    const analytics = getTeacherAnalytics();
    const requestedQuizId = new URL(request.url).searchParams.get("quizId");
    const quizzes = requestedQuizId
      ? analytics.quizzes.filter((quiz) => quiz.id === requestedQuizId)
      : analytics.quizzes;

    if (requestedQuizId && quizzes.length === 0) {
      return Response.json(
        { error: { code: "QUIZ_NOT_FOUND", message: "That assessment could not be found." } },
        { status: 404 },
      );
    }

    const rows: Array<Array<string | number | null>> = [Array.from(columns)];
    for (const quiz of quizzes) {
      const questions = quiz.questionStats.length ? quiz.questionStats : [null];
      for (const question of questions) {
        rows.push([
          quiz.id,
          quiz.title,
          quiz.status,
          quiz.questionCount,
          quiz.durationMinutes,
          quiz.attemptLimit,
          quiz.submissionCount,
          quiz.averageScore,
          quiz.highestScore,
          quiz.passRate,
          quiz.lastSubmittedAt,
          question?.questionId ?? null,
          question?.prompt ?? null,
          question?.concept ?? null,
          question?.submissions ?? null,
          question?.correctCount ?? null,
          question?.accuracyPercent ?? null,
        ]);
      }
    }

    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="learnloop-assessment-analytics.csv"',
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof DemoModeUnavailableError) {
      return Response.json(
        { error: { code: "DEMO_MODE_UNAVAILABLE", message: "Teacher analytics demo mode is not enabled." } },
        { status: 503 },
      );
    }
    console.error("Teacher analytics export failed", error instanceof Error ? error.message : "unknown error");
    return Response.json(
      { error: { code: "INTERNAL_ERROR", message: "Could not export assessment analytics." } },
      { status: 500 },
    );
  }
}
