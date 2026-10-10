import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { TeacherSubmissionReview } from "@/components/teacher-submission-review";
import "../builder.css";
import "../analytics/analytics.css";
import "./review.css";

export const metadata: Metadata = { title: "Teacher Submission Review" };

export default function TeacherReviewPage() {
  return <>
    <div className="page-heading analytics-page-heading">
      <div>
        <p className="eyebrow"><span className="eyebrow-mark" />TEACHER WORKSPACE</p>
        <h1 className="page-title">Review every answer.</h1>
        <p className="page-subtitle">Inspect submitted responses, correct answers, explanations, and unanswered questions in one place.</p>
      </div>
      <Link className="button button-secondary" href="/teacher/analytics">Results & analytics <ArrowUpRight size={14} /></Link>
    </div>
    <TeacherSubmissionReview />
  </>;
}
