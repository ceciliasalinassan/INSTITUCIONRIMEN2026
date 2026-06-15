
-- Ejecutar solo si necesitas políticas para Storage.
-- Primero crea manualmente un bucket público llamado: media

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists "public read media" on storage.objects;
create policy "public read media"
on storage.objects for select
using (bucket_id = 'media');

drop policy if exists "public insert media" on storage.objects;
create policy "public insert media"
on storage.objects for insert
with check (bucket_id = 'media');

drop policy if exists "public update media" on storage.objects;
create policy "public update media"
on storage.objects for update
using (bucket_id = 'media')
with check (bucket_id = 'media');

drop policy if exists "public delete media" on storage.objects;
create policy "public delete media"
on storage.objects for delete
using (bucket_id = 'media');
