import type { Metadata } from "next";
import { LearningLauncher } from "@/components/learning-launcher";

export const metadata: Metadata = { title: "Fresh Reassessment" };

export default function ReassessmentPage() {
  return <LearningLauncher kind="reassessment" />;
}
