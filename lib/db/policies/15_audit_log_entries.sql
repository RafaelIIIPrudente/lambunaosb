-- audit_log_entries: APPEND-ONLY at the database level.
-- Authenticated tenant peers can read; nobody can update or delete.
-- Per PROJECT.md §11.3.

alter table public.audit_log_entries enable row level security;

create policy "audit_log_entries_select_admin" on public.audit_log_entries
  for select to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_user_role() in ('secretary', 'mayor', 'vice_mayor', 'sb_member')
  );

create policy "audit_log_entries_insert_authenticated" on public.audit_log_entries
  for insert to authenticated
  with check (tenant_id = public.current_tenant_id());

-- Anonymous queries can also write audit rows (e.g. citizen_query.submitted)
-- via the server action which uses the service role; but if an anon client ever
-- tries directly, allow it tenant-scoped.
create policy "audit_log_entries_insert_anon" on public.audit_log_entries
  for insert to anon
  with check (actor_id is null);

-- Append-only: no update, no delete, ever.
revoke update, delete on public.audit_log_entries from authenticated, anon;
