-- ClinicaLog OMFS — enforce invariants the client cannot guarantee
--
-- The SPA assigns patient numbers client-side from in-memory state, so two
-- records created in the same tick (e.g. a CSV import loop) were assigned the
-- same number and the second insert was rejected by the existing unique
-- constraint -- with the error only visible in the browser console. The rows
-- silently vanished on the next reload.
--
-- This migration adds the missing server-side invariants so a duplicate is
-- impossible rather than merely detected, and makes a prospective assistant
-- able to read the invite addressed to them.
-- Safe to re-run (idempotent).

-- 1) One workspace per owner. A concurrent double-bootstrap (React StrictMode
--    runs effects twice in dev) previously created two workspaces for the same
--    user, orphaning one along with its facilities.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'workspaces_owner_user_id_key'
  ) then
    alter table workspaces add constraint workspaces_owner_user_id_key unique (owner_user_id);
  end if;
end $$;

-- 2) Facility names unique per workspace, so re-seeding is idempotent.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'facilities_workspace_id_name_key'
  ) then
    alter table facilities add constraint facilities_workspace_id_name_key unique (workspace_id, name);
  end if;
end $$;

-- 3) A prospective assistant must be able to read the invite addressed to
--    their own email, otherwise they can never discover the workspace they
--    were invited to and end up creating a separate one.
drop policy if exists "members manage invites" on assistant_invites;
create policy "members manage invites" on assistant_invites for all
  using (
    is_workspace_member(workspace_id)
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  with check (is_workspace_member(workspace_id));
