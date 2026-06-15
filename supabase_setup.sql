create extension if not exists "pgcrypto";

create table if not exists settings(key text primary key, value jsonb);
create table if not exists directors(id uuid primary key default gen_random_uuid(), role text, name text, sort_order int default 0);
create table if not exists sponsors(id uuid primary key default gen_random_uuid(), name text, url text, sort_order int default 0);
create table if not exists fixture_images(id uuid primary key default gen_random_uuid(), title text, image text, sort_order int default 0);
create table if not exists results(id uuid primary key default gen_random_uuid(), date_text text, match text, score text, scorers text, sort_order int default 0);
create table if not exists news(id uuid primary key default gen_random_uuid(), title text, text text, image text, date_text text, sort_order int default 0);
create table if not exists gallery(id uuid primary key default gen_random_uuid(), title text, type text, url text, sort_order int default 0);
create table if not exists presidents(id uuid primary key default gen_random_uuid(), name text, period text, image text, sort_order int default 0);
create table if not exists standings(id uuid primary key default gen_random_uuid(), serie text, team text, pj int default 0, pg int default 0, pe int default 0, pp int default 0, gf int default 0, gc int default 0, dg int default 0, pts int default 0, sort_order int default 0);
create table if not exists member_requests(id uuid primary key default gen_random_uuid(), name text, rut text, phone text, type text, status text default 'pendiente', created_at timestamptz default now());

-- Compatibilidad si alguna tabla fue creada con nombres de columna nuevos o antiguos
alter table fixture_images add column if not exists image text;
alter table fixture_images add column if not exists image_url text;
alter table results add column if not exists date_text text;
alter table results add column if not exists date text;
alter table news add column if not exists text text;
alter table news add column if not exists body text;
alter table news add column if not exists image text;
alter table news add column if not exists image_url text;
alter table news add column if not exists date_text text;
alter table news add column if not exists date text;
alter table presidents add column if not exists image text;
alter table presidents add column if not exists image_url text;

insert into settings(key,value) values ('site','"ready"'::jsonb) on conflict (key) do nothing;

alter table settings enable row level security;
alter table directors enable row level security;
alter table sponsors enable row level security;
alter table fixture_images enable row level security;
alter table results enable row level security;
alter table news enable row level security;
alter table gallery enable row level security;
alter table presidents enable row level security;
alter table standings enable row level security;
alter table member_requests enable row level security;

do $$
declare t text;
begin
  foreach t in array array['settings','directors','sponsors','fixture_images','results','news','gallery','presidents','standings','member_requests'] loop
    execute format('drop policy if exists "public all %s" on %I', t, t);
    execute format('create policy "public all %s" on %I for all using (true) with check (true)', t, t);
  end loop;
end $$;

insert into storage.buckets(id,name,public) values('club-assets','club-assets',true) on conflict (id) do update set public=true;
drop policy if exists "public club assets" on storage.objects;
create policy "public club assets" on storage.objects for all using (bucket_id='club-assets') with check (bucket_id='club-assets');


alter table member_requests add column if not exists email text;
create table if not exists backups(id uuid primary key default gen_random_uuid(), created_at timestamptz default now(), data jsonb);
alter table backups enable row level security;
drop policy if exists "public all backups" on backups;
create policy "public all backups" on backups for all using (true) with check (true);
