-- Safe Place chat: audit + hardening for public.chat_messages
-- Run in the Supabase dashboard of the account that owns the chat project
-- (SQL Editor). Run PART 1 alone first and look at the results.

-- ════════════════════════════════════════════════════════════════════
-- PART 1 — AUDIT (read-only, safe to run any time)
-- ════════════════════════════════════════════════════════════════════

-- Is row-level security on? (want: true)
select relrowsecurity as rls_enabled
from pg_class where oid = 'public.chat_messages'::regclass;

-- Existing policies. Red flags: an INSERT policy whose with_check is just
-- "true", or any UPDATE / DELETE policy for anon or authenticated.
select policyname, cmd, roles, qual as using_expr, with_check
from pg_policies
where schemaname = 'public' and tablename = 'chat_messages';

-- Column types (the script below assumes user_id, display_name, content, created_at)
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'chat_messages'
order by ordinal_position;

-- Existing triggers (rate limit / server-set fields)
select tgname from pg_trigger
where tgrelid = 'public.chat_messages'::regclass and not tgisinternal;

-- How many rows are older than 10 minutes? (want: 0 if expiry is really enforced)
select count(*) as expired_rows_still_stored
from public.chat_messages
where created_at < now() - interval '10 minutes';


-- ════════════════════════════════════════════════════════════════════
-- PART 2 — HARDENING (changes the database; run after reviewing Part 1)
-- ════════════════════════════════════════════════════════════════════

-- 1. Turn on RLS.
alter table public.chat_messages enable row level security;

-- 2. Remove existing policies on this table. Postgres ORs policies together,
--    so one old permissive policy would cancel out the strict ones below.
do $$
declare p record;
begin
  for p in select policyname from pg_policies
           where schemaname = 'public' and tablename = 'chat_messages'
  loop
    execute format('drop policy %I on public.chat_messages', p.policyname);
  end loop;
end $$;

-- 3. Signed-in (incl. anonymous) visitors can read the last 10 minutes only.
create policy chat_read_recent on public.chat_messages
  for select to authenticated
  using (created_at > now() - interval '10 minutes');

-- 4. Visitors can insert only as themselves, within the app's length limits.
--    No UPDATE or DELETE policies = nobody can edit or delete others' messages.
create policy chat_insert_own on public.chat_messages
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and char_length(btrim(content)) between 1 and 300
    and char_length(coalesce(display_name, '')) <= 40
  );

-- 5. Server sets user_id and created_at (so clients can't fake or backdate them)
--    and enforces the 3-second cooldown. The app already shows
--    "Slow down" when the error contains "Rate limit".
create index if not exists chat_messages_user_created_idx
  on public.chat_messages (user_id, created_at desc);

create or replace function public.chat_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id    := auth.uid();
  new.created_at := now();
  if exists (
    select 1 from public.chat_messages
    where user_id = new.user_id
      and created_at > now() - interval '3 seconds'
  ) then
    raise exception 'Rate limit: wait a few seconds before sending again'
      using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists chat_before_insert on public.chat_messages;
create trigger chat_before_insert
  before insert on public.chat_messages
  for each row execute function public.chat_before_insert();

-- 6. Actually delete messages after 10 minutes (every minute, via pg_cron).
--    The app already listens for DELETE events and removes them live.
create extension if not exists pg_cron;
select cron.unschedule('chat-expiry')
where exists (select 1 from cron.job where jobname = 'chat-expiry');
select cron.schedule(
  'chat-expiry', '* * * * *',
  $$delete from public.chat_messages where created_at < now() - interval '10 minutes'$$
);

-- 7. Not SQL — do in the dashboard:
--    Authentication → Attack Protection → enable CAPTCHA (Cloudflare Turnstile)
--    with your Turnstile SECRET key, then add VITE_TURNSTILE_SITE_KEY as a
--    GitHub repo secret and pass it in .github/workflows/deploy.yml.
