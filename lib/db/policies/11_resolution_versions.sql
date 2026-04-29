-- resolution_versions: tenant-scoped admin read. Append-only for the version trail.

alter table public.resolution_versions enable row level security;

create policy "resolution_versions_select_authenticated" on public.resolution_versions
  for select to authenticated
  using (tenant_id = public.current_tenant_id());

create policy "resolution_versions_insert" on public.resolution_versions
  for insert to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_user_role() in ('secretary', 'mayor', 'vice_mayor')
  );

-- Versions are immutable.
revoke update, delete on public.resolution_versions from authenticated, anon;
