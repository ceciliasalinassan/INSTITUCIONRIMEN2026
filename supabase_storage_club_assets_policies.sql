
insert into storage.buckets (id, name, public)
values ('club-assets', 'club-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "public read club assets" on storage.objects;
create policy "public read club assets"
on storage.objects for select
using (bucket_id = 'club-assets');

drop policy if exists "public insert club assets" on storage.objects;
create policy "public insert club assets"
on storage.objects for insert
with check (bucket_id = 'club-assets');

drop policy if exists "public update club assets" on storage.objects;
create policy "public update club assets"
on storage.objects for update
using (bucket_id = 'club-assets')
with check (bucket_id = 'club-assets');

drop policy if exists "public delete club assets" on storage.objects;
create policy "public delete club assets"
on storage.objects for delete
using (bucket_id = 'club-assets');
