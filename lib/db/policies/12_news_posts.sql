-- news_posts: public read of published+public. Authors create. Publish gate: Secretary, Vice Mayor, Mayor.

alter table public.news_posts enable row level security;

create policy "news_posts_select_public" on public.news_posts
  for select to anon
  using (
    status = 'published'
    and visibility = 'public'
    and deleted_at is null
  );

create policy "news_posts_select_authenticated" on public.news_posts
  for select to authenticated
  using (tenant_id = public.current_tenant_id());

create policy "news_posts_insert" on public.news_posts
  for insert to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_user_role() in ('secretary', 'mayor', 'vice_mayor', 'sb_member')
  );

create policy "news_posts_update" on public.news_posts
  for update to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and (
      public.current_user_role() in ('secretary', 'mayor', 'vice_mayor')
      or (public.current_user_role() = 'sb_member' and author_id = auth.uid())
    )
  )
  with check (
    tenant_id = public.current_tenant_id()
    -- Publish-gate: only Secretary, Vice Mayor, or Mayor can flip status to 'published'
    and (status <> 'published' or public.current_user_role() in ('secretary', 'vice_mayor', 'mayor'))
  );

create policy "news_posts_delete_secretary" on public.news_posts
  for delete to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.current_user_role() = 'secretary'
  );
