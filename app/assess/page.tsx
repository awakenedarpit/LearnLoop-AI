import type { Metadata } from "next";
import { AssessmentRunner } from "@/components/assessment-runner";

export const metadata: Metadata = { title: "Assessments" };

export default function AssessPage() { return <AssessmentRunner />; }
