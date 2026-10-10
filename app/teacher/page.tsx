import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { TeacherQuizBuilder } from "@/components/teacher-quiz-builder";
import "./builder.css";

export const metadata: Metadata = { title: "Teacher Quiz Builder" };

export default function TeacherPage() {
  return <>
    <div className="page-heading">
      <div>
        <p className="eyebrow"><span className="eyebrow-mark" />TEACHER WORKSPACE</p>
        <h1 className="page-title">Build assessments with purpose.</h1>
        <p className="page-subtitle">Create clear questions, set expectations, and review the student experience before publishing.</p>
      </div>
    </div>
    <TeacherQuizBuilder />
    <Link className="button button-secondary" href="/teacher/review" style={{ marginTop: 14 }}><ClipboardCheck size={14} /> Review saved submissions</Link>
  </>;
}
