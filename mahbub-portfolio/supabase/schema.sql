-- =====================================================================
-- Mahbub Miah Portfolio: complete Supabase setup
-- Run this whole file once in: Supabase Dashboard > SQL Editor > New query.
-- It is safe to run again (it uses "if not exists" / "drop policy if exists"
-- and never deletes your content).
-- =====================================================================

-- ---------- 1. Admin allowlist ----------
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- SECURITY DEFINER lets this function read admin_users even though
-- visitors cannot. That also avoids RLS recursion.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- 2. Content tables ----------
create table if not exists public.profiles (
  id                  smallint primary key default 1 check (id = 1),   -- exactly one profile row
  name                text not null default '',
  titles              text[] not null default '{}',
  bio                 text,
  phone               text,
  email               text,
  location            text,
  profile_photo       text,            -- path inside bucket "profile-media"
  skills              text[] not null default '{}',
  experience          text,            -- one item per line
  education           text,            -- one item per line
  show_social_in_hero boolean not null default true,
  updated_at          timestamptz not null default now()
);

create table if not exists public.portfolio_items (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  category      text not null check (category in ('Graphic Design','Logo Design','Poster Design','Banner Design','YouTube Thumbnail','Social Media Design','UI/UX Design','Photo Editing','AI Image Creation','Other Creative Works')),
  description   text,
  image_path    text,                  -- path inside bucket "portfolio-images"
  image_url     text,                  -- optional external image link (not used by the dashboard)
  featured      boolean not null default false,
  published     boolean not null default false,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.videos (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  category       text not null check (category in ('Video Editing','Promotional Videos','Motion Graphics','Animation','AI Videos','Social Media Videos','Other Video Projects')),
  description    text,
  video_path     text,                 -- path inside bucket "portfolio-videos"
  external_url   text check (external_url is null or external_url ~* '^https?://'),
  thumbnail_path text,                 -- path inside bucket "portfolio-thumbnails"
  published      boolean not null default false,
  display_order  integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint video_has_source check (video_path is not null or external_url is not null)
);

create table if not exists public.projects (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  description      text,
  technology       text[] not null default '{}',
  live_url         text check (live_url is null or live_url ~* '^https?://'),
  source_url       text check (source_url is null or source_url ~* '^https?://'),
  cover_path       text,               -- bucket "portfolio-images"
  screenshot_paths text[] not null default '{}',   -- bucket "portfolio-images" (several screenshots)
  status           text not null default 'Live' check (status in ('Live','In progress','Concept','Archived')),
  published        boolean not null default false,
  display_order    integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.social_links (
  id            uuid primary key default gen_random_uuid(),
  platform      text not null check (platform in ('facebook','youtube','instagram','linkedin','behance','dribbble','tiktok','x','github','whatsapp','pinterest','website','custom')),
  display_name  text,
  profile_url   text not null check (profile_url ~* '^https?://'),
  icon          text,
  visible       boolean not null default true,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.featured_clients (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  platform         text,
  role             text,
  description      text,
  description_bn   text,
  external_url     text check (external_url is null or external_url ~* '^https?://'),
  cover_image_path text,
  published        boolean not null default false,
  display_order    integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.featured_client_items (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.featured_clients(id) on delete cascade,
  title         text not null,
  description   text,
  category      text not null default 'Social Media Design' check (category in ('Graphic Design','Logo Design','Poster Design','Banner Design','YouTube Thumbnail','Social Media Design','UI/UX Design','Photo Editing','AI Image Creation','Other Creative Works')),
  image_path    text,
  published     boolean not null default false,
  display_order integer not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists portfolio_items_pub_idx on public.portfolio_items (published, display_order);
create index if not exists videos_pub_idx          on public.videos (published, display_order);
create index if not exists projects_pub_idx        on public.projects (published, display_order);
create index if not exists social_links_vis_idx    on public.social_links (visible, display_order);
create index if not exists featured_clients_pub_idx on public.featured_clients (published, display_order);
create index if not exists client_items_client_idx on public.featured_client_items (client_id, display_order);

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['profiles','portfolio_items','videos','projects','social_links','featured_clients'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------- 3. Row Level Security ----------
alter table public.admin_users            enable row level security;
alter table public.profiles               enable row level security;
alter table public.portfolio_items        enable row level security;
alter table public.videos                 enable row level security;
alter table public.projects               enable row level security;
alter table public.social_links           enable row level security;
alter table public.featured_clients       enable row level security;
alter table public.featured_client_items  enable row level security;

-- admin_users: a signed-in user may only see their OWN row (the dashboard uses this to check access).
-- There is no insert/update/delete policy, so nobody can change the allowlist from the website.
drop policy if exists "read own admin row" on public.admin_users;
create policy "read own admin row" on public.admin_users
  for select to authenticated using (user_id = (select auth.uid()));

-- Public (anonymous) read access: published / visible content only.
drop policy if exists "public read profile" on public.profiles;
create policy "public read profile" on public.profiles for select to anon, authenticated using (true);

drop policy if exists "public read published designs" on public.portfolio_items;
create policy "public read published designs" on public.portfolio_items for select to anon, authenticated using (published);

drop policy if exists "public read published videos" on public.videos;
create policy "public read published videos" on public.videos for select to anon, authenticated using (published);

drop policy if exists "public read published projects" on public.projects;
create policy "public read published projects" on public.projects for select to anon, authenticated using (published);

drop policy if exists "public read visible social links" on public.social_links;
create policy "public read visible social links" on public.social_links for select to anon, authenticated using (visible);

drop policy if exists "public read published clients" on public.featured_clients;
create policy "public read published clients" on public.featured_clients for select to anon, authenticated using (published);

drop policy if exists "public read published client items" on public.featured_client_items;
create policy "public read published client items" on public.featured_client_items for select to anon, authenticated
  using (published and exists (select 1 from public.featured_clients c where c.id = client_id and c.published));

-- Administrator: full access (read drafts, insert, update, delete) on content tables.
do $$
declare t text;
begin
  foreach t in array array['profiles','portfolio_items','videos','projects','social_links','featured_clients','featured_client_items'] loop
    execute format('drop policy if exists "admin full access" on public.%I', t);
    execute format('create policy "admin full access" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- ---------- 4. Storage ----------
-- Public buckets: files are served to visitors through public URLs (fast, CDN cached).
-- File names are random UUIDs, and anonymous users have NO permission to list bucket contents.
-- Videos have no per-file limit here, so your Supabase plan's global limit applies (see README).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('portfolio-images',     'portfolio-images',     true, 26214400, array['image/jpeg','image/png','image/webp']),
  ('portfolio-videos',     'portfolio-videos',     true, null,     array['video/mp4','video/webm']),
  ('portfolio-thumbnails', 'portfolio-thumbnails', true, 26214400, array['image/jpeg','image/png','image/webp']),
  ('profile-media',        'profile-media',        true, 26214400, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Only the administrator can upload, replace, list or delete files.
drop policy if exists "admin manage portfolio media" on storage.objects;
create policy "admin manage portfolio media" on storage.objects
  for all to authenticated
  using      (bucket_id in ('portfolio-images','portfolio-videos','portfolio-thumbnails','profile-media') and public.is_admin())
  with check (bucket_id in ('portfolio-images','portfolio-videos','portfolio-thumbnails','profile-media') and public.is_admin());

-- ---------- 5. Create the first administrator (run AFTER creating the user) ----------
-- 1) Dashboard > Authentication > Users > Add user > Create new user (email + password, tick "Auto Confirm User").
-- 2) Replace the email below with that user's email and run ONLY this statement:
--
-- insert into public.admin_users (user_id)
-- select id from auth.users where email = 'YOUR-ADMIN-EMAIL@example.com'
-- on conflict do nothing;
