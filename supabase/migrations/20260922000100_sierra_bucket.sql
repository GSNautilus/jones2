-- The private bucket for the original game's audio (assets/README.md).
-- Not public: every read goes through the storage API with the caller's
-- session, and this policy lets it through only when that session holds a
-- seat. A bare anonymous sign-in is not enough. Uploads use the secret key,
-- which bypasses these policies, so no insert/update/delete policy exists.

insert into storage.buckets (id, name, public)
values ('sierra', 'sierra', false)
on conflict (id) do update set public = false;

create policy "seated players read the sierra bucket" on storage.objects
  for select to authenticated
  using (bucket_id = 'sierra' and public.has_seat());
