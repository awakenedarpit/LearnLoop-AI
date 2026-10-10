import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AssessmentReview } from "@/components/assessment-review";
export const metadata: Metadata = { title: "Submission Review" };
export default function TeacherReviewPage() { return <><div className="page-heading"><div><Link className="subtle-link" href="/teacher"><ArrowLeft size={13} /> Back to teacher space</Link><h1 className="page-title" style={{ marginTop: 12 }}>Review saved submissions.</h1><p className="page-subtitle">Inspect finalized answers from the local demo assessment flow.</p></div></div><AssessmentReview /></>; }
