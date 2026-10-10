import type { Metadata } from "next";
import { LearningLauncher } from "@/components/learning-launcher";

export const metadata: Metadata = { title: "Targeted Practice" };

export default function PracticePage() {
  return <LearningLauncher kind="practice" />;
}
