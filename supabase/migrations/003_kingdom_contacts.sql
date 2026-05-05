-- Kingdom contact form submissions
create table kingdom_contacts (
  id bigint generated always as identity primary key,
  email text not null,
  created_at timestamptz not null default now()
);

-- RLS: only service role can insert (API route uses service client)
alter table kingdom_contacts enable row level security;
