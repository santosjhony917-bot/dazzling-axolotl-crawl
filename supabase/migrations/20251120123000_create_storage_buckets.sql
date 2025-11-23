-- Create profiles bucket
insert into storage.buckets (id, name, public)
values ('profiles', 'profiles', true)
on conflict (id) do nothing;

-- Create restaurant-images bucket
insert into storage.buckets (id, name, public)
values ('restaurant-images', 'restaurant-images', true)
on conflict (id) do nothing;

-- Set up access policies for profiles
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Public Access Profiles' and tablename = 'objects' and schemaname = 'storage') then
    create policy "Public Access Profiles" on storage.objects for select using ( bucket_id = 'profiles' );
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Authenticated users can upload avatars' and tablename = 'objects' and schemaname = 'storage') then
    create policy "Authenticated users can upload avatars" on storage.objects for insert with check ( bucket_id = 'profiles' and auth.role() = 'authenticated' );
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can update their own avatars' and tablename = 'objects' and schemaname = 'storage') then
    create policy "Users can update their own avatars" on storage.objects for update using ( bucket_id = 'profiles' and auth.uid() = owner );
  end if;
end $$;

-- Set up access policies for restaurant-images
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Public Access Restaurant Images' and tablename = 'objects' and schemaname = 'storage') then
    create policy "Public Access Restaurant Images" on storage.objects for select using ( bucket_id = 'restaurant-images' );
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Authenticated users can upload restaurant images' and tablename = 'objects' and schemaname = 'storage') then
    create policy "Authenticated users can upload restaurant images" on storage.objects for insert with check ( bucket_id = 'restaurant-images' and auth.role() = 'authenticated' );
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can update restaurant images' and tablename = 'objects' and schemaname = 'storage') then
    create policy "Users can update restaurant images" on storage.objects for update using ( bucket_id = 'restaurant-images' and auth.role() = 'authenticated' );
  end if;
end $$;
