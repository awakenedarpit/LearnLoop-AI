-- Authorization predicates and the auth signup trigger are internal implementation details.
-- Keep them outside the exposed public Data API schema; retain only the safe quiz DTO RPC in public.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA private TO authenticated;
ALTER FUNCTION public.handle_new_user() SET SCHEMA private;
ALTER FUNCTION public.is_org_member(uuid,public.app_role[]) SET SCHEMA private;
ALTER FUNCTION public.teaches_class(uuid) SET SCHEMA private;
ALTER FUNCTION public.can_review_assignment(uuid) SET SCHEMA private;
REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.is_org_member(uuid,public.app_role[]) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION private.teaches_class(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION private.can_review_assignment(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.is_org_member(uuid,public.app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION private.teaches_class(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_review_assignment(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.get_assigned_quiz(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_assigned_quiz(uuid) TO authenticated;
