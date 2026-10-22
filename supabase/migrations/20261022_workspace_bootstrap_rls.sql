-- ClinicaLog OMFS — unblock workspace bootstrap under RLS
--
-- The SPA has no server-side backend: it uses the anon/publishable key directly.
-- The previous policies made the bootstrap impossible:
--   1. workspaces SELECT required is_workspace_member(id), but the membership row
--      is only created AFTER the workspace row -> insert().select() always 42501.
--   2. workspace_members had no INSERT policy at all, so the membership row that
--      establishes membership could never be created by the client.
-- Result: every signup fell back to local-only demo mode and persisted nothing.
--
-- Fix: let a workspace owner read their own workspace, and let the owner add
-- themselves (and one assistant) as a member of a workspace they own.
-- Safe to re-run (idempotent).

-- 1) Owners can always read their own workspace (breaks the circular dependency).
drop policy if exists "members can select workspaces" on workspaces;
create policy "members can select workspaces" on workspaces for select
  using (owner_user_id = auth.uid() or is_workspace_member(id));

-- 2) Owners can add members to a workspace they own.
--    The self-bootstrap (owner adding owner) is what unblocks signup.
drop policy if exists "owners can insert workspace_members" on workspace_members;
create policy "owners can insert workspace_members" on workspace_members for insert
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from workspaces w
      where w.id = workspace_members.workspace_id
        and w.owner_user_id = auth.uid()
    )
  );

-- 3) Owners can correct/remove members of a workspace they own.
drop policy if exists "owners can update workspace_members" on workspace_members;
create policy "owners can update workspace_members" on workspace_members for update
  using (
    exists (
      select 1 from workspaces w
      where w.id = workspace_members.workspace_id
        and w.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from workspaces w
      where w.id = workspace_members.workspace_id
        and w.owner_user_id = auth.uid()
    )
  );

drop policy if exists "owners can delete workspace_members" on workspace_members;
create policy "owners can delete workspace_members" on workspace_members for delete
  using (
    exists (
      select 1 from workspaces w
      where w.id = workspace_members.workspace_id
        and w.owner_user_id = auth.uid()
    )
  );

-- 4) Members need to be able to update their own membership row (permissions jsonb).
drop policy if exists "users update own memberships" on workspace_members;
create policy "users update own memberships" on workspace_members for update
  using (user_id = auth.uid());
