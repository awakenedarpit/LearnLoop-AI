import { LearningSession } from "@/components/learning-session";
import { getLearningSession, type LearningSessionView } from "@/lib/services/learning";

type PageProps = { params: Promise<{ sessionId: string }> };
export const dynamic = "force-dynamic";

export default async function PracticeSessionPage({ params }: PageProps) {
  const { sessionId } = await params;
  let initialSession: LearningSessionView | null = null;
  let initialError = "";
  try {
    const session = getLearningSession(sessionId);
    if (session.kind !== "practice") throw new Error("This session does not match the requested activity.");
    initialSession = session;
  } catch (error) { initialError = error instanceof Error ? error.message : "This session could not be opened."; }
  return <LearningSession sessionId={sessionId} expectedKind="practice" initialSession={initialSession} initialError={initialError} />;
}
