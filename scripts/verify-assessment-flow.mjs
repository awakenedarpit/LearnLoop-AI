import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";

const baseUrl = process.env.LEARNLOOP_BASE_URL ?? "http://127.0.0.1:3000";

async function request(path, method = "GET", body) {
  const response = await fetch(new URL(path, baseUrl), {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  return { response, payload };
}

function assertStatus(result, status, description) {
  assert.equal(result.response.status, status, `${description}: ${JSON.stringify(result.payload)}`);
}

const quizInput = {
  title: "=Integration assessment",
  instructions: "Choose one answer for each question.",
  durationMinutes: 15,
  availableFrom: null,
  availableUntil: null,
  attemptLimit: 1,
  questions: [
    {
      prompt: "Which keyword defines a function in Python?",
      options: ["func", "def", "function", "lambda"],
      correctOptionIndex: 1,
      explanation: "Use def to define a function.",
      concept: "Functions",
    },
    {
      prompt: '=HYPERLINK("https://example.invalid","click")',
      options: ["dict", "set", "list", "bool"],
      correctOptionIndex: 2,
      explanation: "Lists store ordered items.",
      concept: "Collections",
    },
  ],
};

// Authoring rejects malformed data, saves a draft, and hides it from students.
const invalid = await request("/api/teacher/quizzes", "POST", { ...quizInput, durationMinutes: 0 });
assertStatus(invalid, 422, "invalid quiz input is rejected");
const created = await request("/api/teacher/quizzes", "POST", quizInput);
assertStatus(created, 201, "teacher creates a quiz draft");
assert.equal(created.payload.mode, "fictional_demo");
const quiz = created.payload.data;
assert.ok(quiz?.id);
assert.equal(quiz.status, "draft");
assert.equal(quiz.questions.length, 2);

let studentList = await request("/api/student/quizzes");
assertStatus(studentList, 200, "student quiz list is available");
assert.equal(studentList.payload.data.some((item) => item.id === quiz.id), false, "draft is hidden from student");
const draftDetail = await request(`/api/student/quizzes/${quiz.id}`);
assertStatus(draftDetail, 404, "student cannot retrieve a draft");

const published = await request(`/api/teacher/quizzes/${quiz.id}/publish`, "POST", {});
assertStatus(published, 200, "teacher publishes a complete draft");
assert.equal(published.payload.data.status, "published");
const locked = await request(`/api/teacher/quizzes/${quiz.id}`, "PATCH", quizInput);
assertStatus(locked, 409, "published quiz cannot be edited");

studentList = await request("/api/student/quizzes");
assertStatus(studentList, 200, "student sees published assessment");
assert.equal(studentList.payload.data.some((item) => item.id === quiz.id), true);
const studentView = await request(`/api/student/quizzes/${quiz.id}`);
assertStatus(studentView, 200, "student opens published assessment");
assert.equal(studentView.payload.data.questions.length, 2);
for (const question of studentView.payload.data.questions) {
  assert.equal(Object.hasOwn(question, "correctOptionIndex"), false, "correct answer is hidden before grading");
  assert.equal(Object.hasOwn(question, "explanation"), false, "explanation is hidden before grading");
}

const started = await request(`/api/student/quizzes/${quiz.id}/attempts/start`, "POST", {});
assertStatus(started, 200, "student starts timed attempt");
const attempt = started.payload.data;
assert.ok(attempt.attemptId);
assert.ok(Date.parse(attempt.expiresAt) > Date.parse(attempt.startedAt));
const answers = Object.fromEntries(quiz.questions.map((question) => [question.id, question.correctOptionIndex]));
const saved = await request(`/api/student/quizzes/${quiz.id}/attempts/${attempt.attemptId}`, "PATCH", { answers });
assertStatus(saved, 200, "student autosaves answers");
assert.deepEqual(saved.payload.data.answers, answers);
const resumed = await request(`/api/student/quizzes/${quiz.id}/attempts/start`, "POST", {});
assertStatus(resumed, 200, "attempt can be recovered after refresh");
assert.equal(resumed.payload.data.attemptId, attempt.attemptId);
assert.deepEqual(resumed.payload.data.answers, answers);
const invalidAnswer = await request(`/api/student/quizzes/${quiz.id}/attempts/${attempt.attemptId}`, "PATCH", { answers: { unassigned_question: 0 } });
assertStatus(invalidAnswer, 422, "answers for unassigned questions are rejected");

const submitted = await request(`/api/student/quizzes/${quiz.id}/attempts`, "POST", { attemptId: attempt.attemptId, answers });
assertStatus(submitted, 201, "student finalizes attempt");
assert.equal(submitted.payload.data.scorePercent, 100);
assert.equal(submitted.payload.data.correctCount, 2);
assert.ok(submitted.payload.data.answers[0].explanation);
const repeatedSubmit = await request(`/api/student/quizzes/${quiz.id}/attempts`, "POST", { attemptId: attempt.attemptId, answers: {} });
assertStatus(repeatedSubmit, 201, "duplicate finalization is idempotent");
assert.deepEqual(repeatedSubmit.payload.data, submitted.payload.data);
const editFinalized = await request(`/api/student/quizzes/${quiz.id}/attempts/${attempt.attemptId}`, "PATCH", { answers });
assertStatus(editFinalized, 409, "finalized attempt rejects answer changes");
const overLimit = await request(`/api/student/quizzes/${quiz.id}/attempts/start`, "POST", {});
assertStatus(overLimit, 409, "attempt limit is enforced");

const reviewList = await request(`/api/teacher/review?quizId=${encodeURIComponent(quiz.id)}`);
assertStatus(reviewList, 200, "teacher sees finalized submission summary");
assert.equal(reviewList.payload.data.length, 1);
assert.equal(reviewList.payload.data[0].attemptId, attempt.attemptId);
const reviewDetail = await request(`/api/teacher/review?attemptId=${encodeURIComponent(attempt.attemptId)}`);
assertStatus(reviewDetail, 200, "teacher sees question-by-question review");
assert.equal(reviewDetail.payload.data.answers.length, 2);
assert.equal(reviewDetail.payload.data.unansweredCount, 0);

const analytics = await request("/api/teacher/analytics");
assertStatus(analytics, 200, "teacher analytics route responds");
const quizAnalytics = analytics.payload.data.quizzes.find((item) => item.id === quiz.id);
assert.ok(quizAnalytics);
assert.equal(quizAnalytics.submissionCount, 1);
assert.equal(quizAnalytics.averageScore, 100);
assert.equal(quizAnalytics.questionStats[1].accuracyPercent, 100);
const csv = await request(`/api/teacher/analytics/export?quizId=${encodeURIComponent(quiz.id)}`);
assertStatus(csv, 200, "teacher can export filtered analytics");
assert.match(csv.response.headers.get("content-type") ?? "", /text\/csv/i);
assert.ok(csv.payload.includes("'=Integration assessment"), "formula-like quiz title is neutralized in CSV");
assert.ok(csv.payload.includes("'=HYPERLINK("), "formula-like question prompt is neutralized in CSV");

// Exercise the expired-attempt HTTP path deterministically by advancing only
// this isolated integration database's server-side deadline.
const expiryQuizInput = {
  ...quizInput,
  title: "Deadline integration assessment",
  questions: [quizInput.questions[0]],
};
const expiryCreated = await request("/api/teacher/quizzes", "POST", expiryQuizInput);
assertStatus(expiryCreated, 201, "teacher creates deadline test quiz");
const expiryQuiz = expiryCreated.payload.data;
const expiryPublished = await request(`/api/teacher/quizzes/${expiryQuiz.id}/publish`, "POST", {});
assertStatus(expiryPublished, 200, "teacher publishes deadline test quiz");
const expiryStarted = await request(`/api/student/quizzes/${expiryQuiz.id}/attempts/start`, "POST", {});
assertStatus(expiryStarted, 200, "student starts deadline test attempt");
const expiryAttempt = expiryStarted.payload.data;
const expiryAnswers = { [expiryQuiz.questions[0].id]: expiryQuiz.questions[0].correctOptionIndex };
const expirySave = await request(`/api/student/quizzes/${expiryQuiz.id}/attempts/${expiryAttempt.attemptId}`, "PATCH", { answers: expiryAnswers });
assertStatus(expirySave, 200, "student saves answer before deadline");
const dbPath = process.env.DEMO_DB_PATH;
assert.ok(dbPath && dbPath !== ":memory:", "integration runner must use an isolated file-backed SQLite database");
const db = new DatabaseSync(dbPath);
try {
  db.prepare("UPDATE student_quiz_active_attempts SET expires_at = ? WHERE id = ?")
    .run(new Date(Date.now() - 1000).toISOString(), expiryAttempt.attemptId);
} finally {
  db.close();
}
const lateSave = await request(`/api/student/quizzes/${expiryQuiz.id}/attempts/${expiryAttempt.attemptId}`, "PATCH", { answers: { [expiryQuiz.questions[0].id]: 0 } });
assertStatus(lateSave, 409, "expired attempt rejects late answer changes");
const expiredFinal = await request(`/api/student/quizzes/${expiryQuiz.id}/attempts`, "POST", {
  attemptId: expiryAttempt.attemptId,
  answers: { [expiryQuiz.questions[0].id]: 0 },
});
assertStatus(expiredFinal, 201, "expired attempt can be finalized from saved answers");
assert.equal(expiredFinal.payload.data.answers[0].selectedOptionIndex, expiryQuiz.questions[0].correctOptionIndex);
assert.equal(expiredFinal.payload.data.scorePercent, 100);

console.log(JSON.stringify({
  result: "PASS",
  mode: "local_demo",
  lifecycle: "draft → publish → answer-key withholding → timed attempt → autosave/recovery → idempotent finalization → review/analytics/CSV",
  securityChecks: ["input validation", "draft visibility", "answer-key withholding", "foreign question rejection", "published edit lock", "post-finalization write rejection", "attempt limits", "CSV formula neutralization"],
  deadline: "late answer rejected; expired attempt finalized from saved answer",
  syntheticSubmissionScore: submitted.payload.data.scorePercent,
}, null, 2));
