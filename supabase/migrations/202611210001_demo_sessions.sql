create table if not exists public.demo_sessions (
  id uuid primary key,
  version integer not null check (version >= 0),
  expires_at timestamptz not null,
  state jsonb not null
);

create index if not exists demo_sessions_expiry on public.demo_sessions (expires_at);
alter table public.demo_sessions enable row level security;
revoke all on public.demo_sessions from public, anon, authenticated;
grant select, insert, update, delete on public.demo_sessions to service_role;
