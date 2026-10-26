# The Ria Collection: connecting the database

`/art/collection/` works right away from `assets/collection/seed.json`. Connecting a free
Supabase project turns on the private dashboard at `/art/collection/admin/`, where you
add and edit entries, upload images, keep private notes, and choose what is public.

You only do this once. It takes about 15 minutes.

## 1. Create the project

1. Go to <https://supabase.com>, sign in, and choose **New project**.
2. Name it (e.g. `ria-collection`), set a strong database password (save it in your
   password manager) and pick the region closest to you.

## 2. Create the tables and privacy rules

1. In the project, open **SQL Editor → New query**.
2. Paste the whole of [`schema.sql`](schema.sql) and click **Run**. It is safe to run again
   later (for example after an update to this file).

## 3. Lock down sign-ups and create your account

1. **Authentication → Sign In / Providers → Email**: keep Email enabled, and turn
   **Allow new users to sign up** off. Nobody can create an account on the site.
2. **Authentication → Users → Add user → Create new user**: enter your email and a strong
   password, and tick **Auto Confirm User**.
3. **Authentication → URL Configuration**: set **Site URL** to `https://riasunwooan.com`
   and add `https://riasunwooan.com/art/collection/admin/` under **Redirect URLs**
   (needed for the "Email me a sign-in link" button).

## 4. Make that account the owner

Back in **SQL Editor**, run this with your email in place of the example:

```sql
insert into public.site_owner (user_id)
select id from auth.users where email = 'you@example.com';
```

Only accounts listed in `site_owner` can read or change anything private.

## 5. Connect the website

1. **Project Settings → API** (or **Data API**): copy the **Project URL** and the
   **anon / public** key.
2. Paste them into [`assets/collection/config.js`](../assets/collection/config.js), commit
   and push.

The anon key is designed to be public: it only allows what the database rules allow
(reading the `public_*` views). **Never** put the `service_role` key, or your database
password, in the website.

## 6. Bring in your first entry

Open `https://riasunwooan.com/art/collection/admin/`, sign in, go to **Backup → Add starter
entry**. *On the Yacht "Namouna," Venice* arrives as a **private draft**. Write in it, then
set it to **Published** and **Public** when you want it on the public collection.

Note: once Supabase is connected, the public collection reads only from the database, so
it stays empty until you publish something there.

## How privacy works

| Visibility | Who can see it |
| --- | --- |
| **Private** (default) | Only you, signed in. |
| **Unlisted** | Anyone with its private link (`/art/collection/share/?t=…`). Not in the collection, search, related works, rooms, exhibitions, the timeline or search engines. You can replace the link at any time, which turns the old one off. |
| **Public** | Everyone, in the public collection. |

- Drafts are never visible to anyone but you, whatever their visibility.
- Private notes live in a separate owner-only table and are never sent to visitors.
  Reflections start private; you choose which ones appear publicly.
- Visitors can only read database *views* that already filter out private, draft and
  archived entries, so a private entry can't leak into a gallery, search, related works,
  rooms or exhibitions.
- Uploaded images are stored under random file names in a public bucket. Someone who has
  an image's exact address can open that image, so don't upload anything sensitive.

## Backups

**Backup → Export everything** downloads one JSON file with every entry, room, exhibition,
reflection and private note. Keep it somewhere private. **Restore** brings an export back.
Supabase's free plan also keeps its own daily backups.

## Rebuilding the browser bundles (rarely needed)

`assets/collection/vendor/` holds pre-built copies of the Supabase client and the Tiptap
editor. To update them: `cd tools/collection && npm install && npm run build`.
After editing the page templates in `tools/collection/pages.py`, run `python3 tools/collection/pages.py`.
