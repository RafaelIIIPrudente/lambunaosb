-- citizen_query_replies: tenant-scoped admin only. No public.

alter table public.citizen_query_replies enable row level security;

create policy "citizen_query_replies_select_admin" on public.citizen_query_replies
  for select to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and (
      public.current_user_role() in ('secretary', 'mayor', 'vice_mayor')
      or exists (
        select 1 from public.citizen_queries q
        where q.id = citizen_query_replies.query_id and q.assigned_to = auth.uid()
      )
    )
  );

create policy "citizen_query_replies_insert_admin" on public.citizen_query_replies
  for insert to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and author_id = auth.uid()
    and public.current_user_role() in (
      'secretary', 'mayor', 'vice_mayor', 'sb_member', 'skmf_president', 'liga_president'
    )
  );

-- Replies are immutable once sent (audit trail).
revoke update, delete on public.citizen_query_replies from authenticated, anon;
