create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  category text not null default 'Guide',
  description text not null default '',
  body text not null default '',
  cta_label text not null default 'Build this for my business',
  cta_url text not null default 'https://mtnautomations.com/start',
  download_url text,
  download_label text,
  image_url text,
  published boolean not null default false,
  featured boolean not null default false,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.resources add column if not exists download_url text;
alter table public.resources add column if not exists download_label text;

alter table public.resources enable row level security;

revoke all on table public.resources from anon, authenticated;
grant select, insert, update, delete on table public.resources to anon;
grant select, insert, update, delete on table public.resources to authenticated;

drop policy if exists "Public can read published resources" on public.resources;
drop policy if exists "Public can read resources" on public.resources;
drop policy if exists "Signed in admin can read all resources" on public.resources;
create policy "Public can read resources"
on public.resources for select
to anon, authenticated
using (true);

drop policy if exists "Signed in admin can add resources" on public.resources;
drop policy if exists "Browser admin can add resources" on public.resources;
create policy "Browser admin can add resources"
on public.resources for insert
to anon, authenticated
with check (true);

drop policy if exists "Signed in admin can update resources" on public.resources;
drop policy if exists "Browser admin can update resources" on public.resources;
create policy "Browser admin can update resources"
on public.resources for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Signed in admin can delete resources" on public.resources;
drop policy if exists "Browser admin can delete resources" on public.resources;
create policy "Browser admin can delete resources"
on public.resources for delete
to anon, authenticated
using (true);

insert into storage.buckets (id, name, public)
values ('resource-images', 'resource-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can view resource images" on storage.objects;
create policy "Public can view resource images"
on storage.objects for select
using (bucket_id = 'resource-images');

drop policy if exists "Admin can upload resource images" on storage.objects;
drop policy if exists "Browser admin can upload resource images" on storage.objects;
create policy "Browser admin can upload resource images"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'resource-images');

drop policy if exists "Admin can update resource images" on storage.objects;
drop policy if exists "Browser admin can update resource images" on storage.objects;
create policy "Browser admin can update resource images"
on storage.objects for update
to anon, authenticated
using (bucket_id = 'resource-images');

drop policy if exists "Admin can delete resource images" on storage.objects;
drop policy if exists "Browser admin can delete resource images" on storage.objects;
create policy "Browser admin can delete resource images"
on storage.objects for delete
to anon, authenticated
using (bucket_id = 'resource-images');
