-- translations: public can read. Admin CRUD.

alter table public.translations enable row level security;

create policy "translations_select_anon" on public.translations
  for select to anon
  using (true);

create policy "translations_select_authenticated" on public.translations
  for select to authenticated
  using (tenant_id = public.current_tenant_id());

create policy "translations_insert" on public.translations
  for insert to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_user_role() in ('secretary', 'mayor', 'vice_mayor', 'sb_member')
  );

create policy "translations_update" on public.translations
  for update to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_user_role() in ('secretary', 'mayor', 'vice_mayor', 'sb_member')
  )
  with check (tenant_id = public.current_tenant_id());

create policy "translations_delete_secretary" on public.translations
  for delete to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_user_role() = 'secretary'
  );
