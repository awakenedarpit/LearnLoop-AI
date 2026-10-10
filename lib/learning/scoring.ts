import { CONCEPTS } from "@/lib/learning/catalog";

export type ScorableQuestion = { id: string; concept: string; correctOptionId: string };
export type ScorableAnswer = { questionId: string; selectedOptionId: string };
export type ScoredConcept = { concept: string; label: string; correct: number; total: number; accuracy: number; isGap: boolean };
export type ScoredSession = {
  scorePercent: number;
  correctCount: number;
  answeredCount: number;
  totalQuestions: number;
  unansweredCount: number;
  concepts: ScoredConcept[];
  gaps: string[];
  completedAt: string;
};

/** Score only the supplied session questions; unanswered responses count as incorrect. */
export function calculateLearningScore(
  questions: ScorableQuestion[],
  answers: ScorableAnswer[],
  completedAt: string,
): ScoredSession {
  const answerById = new Map(answers.map((answer) => [answer.questionId, answer.selectedOptionId]));
  const sessionIds = new Set(questions.map((question) => question.id));
  const validAnsweredCount = [...answerById.keys()].filter((questionId) => sessionIds.has(questionId)).length;
  const correctCount = questions.filter((question) => answerById.get(question.id) === question.correctOptionId).length;
  const concepts = CONCEPTS.map((concept) => {
    const conceptQuestions = questions.filter((question) => question.concept === concept.id);
    if (!conceptQuestions.length) return null;
    const correct = conceptQuestions.filter((question) => answerById.get(question.id) === question.correctOptionId).length;
    const total = conceptQuestions.length;
    const accuracy = Math.round((correct / total) * 100);
    return { concept: concept.id, label: concept.label, correct, total, accuracy, isGap: accuracy < 60 };
  }).filter((concept) => concept !== null);
  return {
    scorePercent: questions.length ? Math.round((correctCount / questions.length) * 100) : 0,
    correctCount,
    answeredCount: validAnsweredCount,
    totalQuestions: questions.length,
    unansweredCount: Math.max(questions.length - validAnsweredCount, 0),
    concepts,
    gaps: concepts.filter((concept) => concept.isGap).map((concept) => concept.concept),
    completedAt,
  };
}
