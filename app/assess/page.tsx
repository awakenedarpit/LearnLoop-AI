import type { Metadata } from "next";
import { StudentQuizExperience } from "@/components/student-quiz-experience";

export const metadata: Metadata = { title: "Assessments" };

export default function AssessPage() { return <StudentQuizExperience />; }
