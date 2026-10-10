import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, FileSearch } from "lucide-react";
import { TeacherAnalyticsDashboard } from "@/components/teacher-analytics-dashboard";
import "../builder.css";
import "./analytics.css";

export const metadata: Metadata = { title: "Teacher Results & Analytics" };

export default function TeacherAnalyticsPage() {
  return <>
    <div className="page-heading analytics-page-heading">
      <div>
        <p className="eyebrow"><span className="eyebrow-mark" />TEACHER WORKSPACE</p>
        <h1 className="page-title">Turn results into next steps.</h1>
        <p className="page-subtitle">See how each assessment is performing, spot difficult questions, and review recent submissions.</p>
      </div>
      <div className="analytics-toolbar"><Link className="button button-secondary" href="/teacher/review"><FileSearch size={14} /> Review submissions</Link><Link className="button button-primary" href="/teacher">Quiz builder <ArrowUpRight size={14} /></Link></div>
    </div>
    <TeacherAnalyticsDashboard />
  </>;
}
