-- ClinicaLog OMFS — fix RLS recursion in the workspace-membership helper
--
-- is_workspace_member() reads workspace_members, and the RLS policy on
-- workspace_members calls is_workspace_member(). Because the function was
-- SECURITY INVOKER, the policy was re-entered for every row it read and the
-- recursion exhausted the Postgres stack:
--
--   ERROR 54001: stack depth limit exceeded
--
-- This surfaced as a failed workspace load for any user who was not already
-- a member of the workspace being queried.
--
-- Marking the helper SECURITY DEFINER lets it read workspace_members without
-- re-entering RLS. search_path is pinned so the function cannot be hijacked
-- by a shadowing object in another schema.
--
-- Safe to re-run (idempotent).

create or replace function public.is_workspace_member(w_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = w_id and user_id = auth.uid()
  );
$$;
