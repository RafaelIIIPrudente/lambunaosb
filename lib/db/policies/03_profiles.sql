-- profiles: tenant peers can see one another. Self-edits go through
-- server actions (Drizzle bypasses RLS as the privileged DB role) so we
-- intentionally do NOT expose a self-update RLS policy — that would let
-- a user self-promote via direct supabase.from('profiles').update() from
-- the browser. Secretary can CRUD any profile in their tenant.
-- No public read (PII).

alter table public.profiles enable row level security;

create policy "profiles_select_self_or_tenant" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or tenant_id = public.current_tenant_id()
  );

create policy "profiles_insert_secretary" on public.profiles
  for insert to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_user_role() = 'secretary'
  );

create policy "profiles_update_secretary" on public.profiles
  for update to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_user_role() = 'secretary'
  )
  with check (tenant_id = public.current_tenant_id());

create policy "profiles_delete_secretary" on public.profiles
  for delete to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_user_role() = 'secretary'
  );
