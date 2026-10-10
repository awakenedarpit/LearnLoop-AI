import type { Metadata } from "next";
import { StudentQuizExperience } from "@/components/student-quiz-experience";
import "./student-quizzes.css";

export const metadata: Metadata = { title: "Student Quizzes" };

export default function StudentQuizzesPage() {
  return (
    <section className="student-quizzes-page">
      <div className="student-quizzes-heading">
        <p className="eyebrow"><span className="eyebrow-mark" />STUDENT WORKSPACE</p>
        <h1>Practice that moves you forward.</h1>
        <p>Take a published quiz, check your understanding, and learn from every answer.</p>
      </div>
      <StudentQuizExperience />
      <p className="student-demo-note">Demo workspace · progress uses fictional demo data and may reset.</p>
    </section>
  );
}
