-- Corrective hardening applied to the dedicated LearnLoop project after inspecting live grants/policies.
-- Remove inherited default API grants, restore the minimum allowlist, and fix policy references.
REVOKE ALL ON public.profiles,public.organizations,public.organization_memberships,public.classes,public.class_memberships,public.class_teachers,public.teacher_quizzes,public.quiz_questions,public.quiz_assignments,public.quiz_attempts,public.quiz_attempt_answers,public.submissions,public.access_denials,public.integrity_events FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.profiles,public.organizations,public.organization_memberships,public.classes,public.class_memberships,public.class_teachers,public.teacher_quizzes,public.quiz_assignments,public.quiz_attempts,public.submissions,public.access_denials,public.integrity_events TO authenticated;
GRANT INSERT,UPDATE,DELETE ON public.teacher_quizzes,public.quiz_questions,public.quiz_assignments TO authenticated;
GRANT INSERT ON public.quiz_attempts TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.quiz_attempt_answers TO authenticated;
GRANT INSERT ON public.access_denials,public.integrity_events TO authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC,anon,authenticated;
DROP POLICY "class members read assignments" ON public.quiz_assignments;
CREATE POLICY "class members read assignments" ON public.quiz_assignments FOR SELECT TO authenticated
USING(teaches_class(quiz_assignments.class_id) OR EXISTS(
  SELECT 1 FROM public.class_memberships cm
  WHERE cm.class_id=quiz_assignments.class_id AND cm.student_id=(SELECT auth.uid()) AND cm.status='active'
));
DROP POLICY "assigned students read published quiz metadata" ON public.teacher_quizzes;
CREATE POLICY "assigned students read published quiz metadata" ON public.teacher_quizzes FOR SELECT TO authenticated
USING(status='published' AND (available_from IS NULL OR available_from<=now())
  AND (available_until IS NULL OR available_until>=now())
  AND EXISTS(SELECT 1 FROM public.quiz_assignments a JOIN public.class_memberships cm ON cm.class_id=a.class_id
    WHERE a.quiz_id=teacher_quizzes.id AND cm.student_id=(SELECT auth.uid()) AND cm.status='active'));
CREATE INDEX IF NOT EXISTS access_denials_assignment_idx ON public.access_denials(assignment_id,occurred_at DESC);
CREATE INDEX IF NOT EXISTS classes_created_by_idx ON public.classes(created_by);
CREATE INDEX IF NOT EXISTS quiz_assignments_assigned_by_idx ON public.quiz_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS quiz_attempt_answers_question_idx ON public.quiz_attempt_answers(question_id);
CREATE INDEX IF NOT EXISTS submissions_student_idx ON public.submissions(student_id,submitted_at DESC);
CREATE INDEX IF NOT EXISTS teacher_quizzes_organization_idx ON public.teacher_quizzes(organization_id,status);
