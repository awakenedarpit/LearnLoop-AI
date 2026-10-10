import type { Metadata } from "next";
import { LearningLauncher } from "@/components/learning-launcher";

export const metadata: Metadata = { title: "Python Diagnostic" };

export default function DiagnosticPage() {
  return <LearningLauncher kind="diagnostic" />;
}
