-- The Ria Collection: database schema, privacy rules and image storage.
-- Paste this whole file into Supabase → SQL Editor → New query → Run. It is safe to re-run.
--
-- Privacy model
--   * The base tables are readable and writable ONLY by the site owner (rows in site_owner).
--     Visitors (the "anon" role) have no access to them at all.
--   * Visitors read the collection through the public_* views below. Each view filters to
--     visibility = 'public' AND status = 'published' AND NOT archived, and never includes
--     private notes, private reflections, share tokens or links to non-public works.
--   * Unlisted works are reachable only through get_shared_artwork(token), which needs the
--     random share token from the work's private link.
--   * Every new artwork defaults to visibility 'private' and status 'draft'.


-- ---------- Owner ----------

create table if not exists public.site_owner (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.site_owner where user_id = auth.uid());
$$;

-- ---------- Tables ----------

create table if not exists public.artworks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  artist text not null default '',
  year_text text not null default '',          -- as written, e.g. "1890" or "c. 1665"
  year_sort integer,                           -- for sorting by creation year
  medium text not null default '',
  dimensions text not null default '',
  movement text not null default '',
  period text not null default '',
  current_collection text not null default '', -- museum or current collection
  credit text not null default '',             -- image credit / rights line
  image_url text not null default '',
  image_thumb text not null default '',        -- smaller copy for the gallery (falls back to image_url)
  image_width integer,
  image_height integer,
  image_alt text not null default '',
  observation text not null default '',        -- short personal observation under the title
  excerpt text not null default '',            -- shown when the work is featured
  first_encounter text not null default '',    -- I.   rich text (HTML)
  behind_canvas text not null default '',      -- II.  documented history, cited in sources
  behind_interpretation text not null default '', -- II. interpretations, shown apart from the facts
  looking_closer text not null default '',     -- III.
  what_i_see text not null default '',         -- IV.
  conversations text not null default '',      -- V.   prose; related works are linked below
  marginalia jsonb not null default '[]',      -- VI.  [{kind, body, src?}]
  sources jsonb not null default '[]',         -- numbered references: [{text, url}]
  themes text[] not null default '{}',
  tags text[] not null default '{}',
  related uuid[] not null default '{}',
  discovered_on date,
  status text not null default 'draft' check (status in ('draft', 'published')),
  visibility text not null default 'private' check (visibility in ('private', 'unlisted', 'public')),
  share_token uuid not null default gen_random_uuid(),
  featured boolean not null default false,
  archived boolean not null default false,
  is_sample boolean not null default false,
  position integer not null default 0,
  last_contemplated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.artworks add column if not exists image_thumb text not null default '';
alter table public.artworks add column if not exists behind_interpretation text not null default '';

-- Private journal content lives in its own table so it can never ride along with a public row.
create table if not exists public.artwork_private (
  artwork_id uuid primary key references public.artworks (id) on delete cascade,
  notes text not null default '',
  updated_at timestamptz not null default now()
);

-- VII. Returning to the Artwork: dated reflections, never overwritten.
create table if not exists public.reflections (
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid not null references public.artworks (id) on delete cascade,
  written_on date not null default current_date,
  body text not null default '',
  is_private boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text not null default '',
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.artwork_rooms (
  artwork_id uuid references public.artworks (id) on delete cascade,
  room_id uuid references public.rooms (id) on delete cascade,
  position integer not null default 0,
  primary key (artwork_id, room_id)
);

-- Public exhibitions: a curated sequence of works with a curator's note per work.
create table if not exists public.exhibitions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  intro text not null default '',
  items jsonb not null default '[]',            -- [{artwork_id, note}]
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.favorites (
  artwork_id uuid primary key references public.artworks (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Homepage settings: { "sections": ["featured", "collection", ...], "hidden": [...] }
create table if not exists public.settings (
  key text primary key,
  value jsonb not null default '{}'
);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists artworks_touch on public.artworks;
create trigger artworks_touch before update on public.artworks for each row execute function public.touch_updated_at();
drop trigger if exists exhibitions_touch on public.exhibitions;
create trigger exhibitions_touch before update on public.exhibitions for each row execute function public.touch_updated_at();

-- Adding a reflection counts as revisiting the work ("Recently Contemplated").
create or replace function public.mark_contemplated() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.artworks set last_contemplated_at = greatest(coalesce(last_contemplated_at, '-infinity'), new.written_on::timestamptz)
  where id = new.artwork_id;
  return new;
end $$;
drop trigger if exists reflections_contemplated on public.reflections;
create trigger reflections_contemplated after insert on public.reflections for each row execute function public.mark_contemplated();

-- ---------- Row level security: owner only on every base table ----------

do $$
declare t text;
begin
  foreach t in array array['site_owner','artworks','artwork_private','reflections','rooms','artwork_rooms','exhibitions','favorites','settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists owner_all on public.%I', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

create policy owner_all on public.artworks        for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy owner_all on public.artwork_private for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy owner_all on public.reflections     for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy owner_all on public.rooms           for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy owner_all on public.artwork_rooms   for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy owner_all on public.exhibitions     for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy owner_all on public.favorites       for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy owner_all on public.settings        for all to authenticated using (public.is_owner()) with check (public.is_owner());
-- site_owner is read-only from the app (you add yourself once in the SQL editor).
create policy owner_all on public.site_owner      for select to authenticated using (user_id = auth.uid());

-- ---------- Public views (the only thing visitors can read) ----------

create or replace function public.is_public_work(a public.artworks) returns boolean
language sql stable as $$ select a.visibility = 'public' and a.status = 'published' and not a.archived $$;

drop view if exists public.public_artworks, public.public_reflections, public.public_rooms,
                     public.public_exhibitions, public.public_settings;

create or replace view public.public_artworks with (security_barrier) as
select a.id, a.slug, a.title, a.artist, a.year_text, a.year_sort, a.medium, a.dimensions, a.movement,
       a.period, a.current_collection, a.credit, a.image_url, a.image_thumb, a.image_width, a.image_height, a.image_alt,
       a.observation, a.excerpt, a.first_encounter, a.behind_canvas, a.behind_interpretation, a.looking_closer, a.what_i_see,
       a.conversations, a.marginalia, a.sources, a.themes, a.tags, a.discovered_on, a.featured,
       a.is_sample, a.position, a.last_contemplated_at, a.created_at, a.updated_at,
       array(select r from unnest(a.related) r
             where exists (select 1 from public.artworks b where b.id = r and public.is_public_work(b))) as related,
       array(select ar.room_id from public.artwork_rooms ar join public.rooms ro on ro.id = ar.room_id
             where ar.artwork_id = a.id and ro.visibility = 'public' order by ar.position) as rooms
from public.artworks a
where public.is_public_work(a);

create or replace view public.public_reflections with (security_barrier) as
select r.id, r.artwork_id, r.written_on, r.body
from public.reflections r join public.artworks a on a.id = r.artwork_id
where not r.is_private and public.is_public_work(a);

create or replace view public.public_rooms with (security_barrier) as
select ro.id, ro.slug, ro.name, ro.description, ro.position
from public.rooms ro where ro.visibility = 'public';

create or replace view public.public_exhibitions with (security_barrier) as
select e.id, e.slug, e.title, e.intro, e.updated_at,
       coalesce((select jsonb_agg(it order by ord) from jsonb_array_elements(e.items) with ordinality as x(it, ord)
                 where exists (select 1 from public.artworks b where b.id = (it->>'artwork_id')::uuid and public.is_public_work(b))), '[]') as items
from public.exhibitions e where e.visibility = 'public';

create or replace view public.public_settings with (security_barrier) as
select key, value from public.settings where key = 'homepage';

grant select on public.public_artworks, public.public_reflections, public.public_rooms,
               public.public_exhibitions, public.public_settings to anon, authenticated;

-- Unlisted (and public) works by private link. Returns only public-facing fields.
create or replace function public.get_shared_artwork(token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(x) from (
    select a.id, a.slug, a.title, a.artist, a.year_text, a.medium, a.dimensions, a.movement, a.period,
           a.current_collection, a.credit, a.image_url, a.image_thumb, a.image_width, a.image_height, a.image_alt,
           a.observation, a.first_encounter, a.behind_canvas, a.behind_interpretation, a.looking_closer, a.what_i_see,
           a.conversations, a.marginalia, a.sources, a.themes, a.tags, a.discovered_on, a.is_sample,
           coalesce((select jsonb_agg(jsonb_build_object('written_on', r.written_on, 'body', r.body) order by r.written_on)
                     from public.reflections r where r.artwork_id = a.id and not r.is_private), '[]') as reflections
    from public.artworks a
    where a.share_token = token and a.visibility in ('unlisted', 'public') and a.status = 'published' and not a.archived
  ) x;
$$;
revoke all on function public.get_shared_artwork(uuid) from public;
grant execute on function public.get_shared_artwork(uuid) to anon, authenticated;

-- ---------- Image storage ----------
-- Images are served from a public bucket under random file names. Anyone who has an image's
-- exact URL can load that image (nothing else), so keep sensitive images out of uploads.

insert into storage.buckets (id, name, public) values ('artworks', 'artworks', true)
on conflict (id) do update set public = true;

drop policy if exists "owner uploads" on storage.objects;
drop policy if exists "owner updates" on storage.objects;
drop policy if exists "owner deletes" on storage.objects;
create policy "owner uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'artworks' and public.is_owner());
create policy "owner updates" on storage.objects for update to authenticated
  using (bucket_id = 'artworks' and public.is_owner());
create policy "owner deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'artworks' and public.is_owner());
