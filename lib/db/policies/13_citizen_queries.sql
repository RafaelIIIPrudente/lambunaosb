-- citizen_queries: anonymous citizens may INSERT (gated by Turnstile + rate limit at action layer).
-- No anonymous SELECT under any condition (PII protected).
-- Authenticated: Secretary/Mayor/Vice Mayor see all; SB members see only assigned.

alter table public.citizen_queries enable row level security;

create policy "citizen_queries_anon_insert" on public.citizen_queries
  for insert to anon
  with check (true);

create policy "citizen_queries_select_admin" on public.citizen_queries
  for select to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and (
      public.current_user_role() in ('secretary', 'mayor', 'vice_mayor')
      or assigned_to = auth.uid()
    )
  );

create policy "citizen_queries_update_admin" on public.citizen_queries
  for update to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and (
      public.current_user_role() in ('secretary', 'mayor', 'vice_mayor')
      or assigned_to = auth.uid()
    )
  )
  with check (tenant_id = public.current_tenant_id());

create policy "citizen_queries_delete_secretary" on public.citizen_queries
  for delete to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_user_role() = 'secretary'
  );
