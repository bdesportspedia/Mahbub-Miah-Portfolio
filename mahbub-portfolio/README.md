# Mahbub Miah — Creative Portfolio (Supabase + Netlify)

One public website for everyone, plus a private admin dashboard you can use from your Android phone or computer.
Content lives in **Supabase** (database, login, file storage). The website reads it live, so **uploading new work never needs a new deploy**.

```
Public site   https://YOUR-SITE.netlify.app/          (anyone, no login)
Admin         https://YOUR-SITE.netlify.app/admin     (your login only)
```

## What is inside

| Path | Purpose |
|---|---|
| `index.html`, `src/public/` | Public portfolio (reads only published content) |
| `admin/index.html`, `src/admin/` | Admin login + dashboard |
| `supabase/schema.sql` | Tables, security rules (RLS), storage buckets and policies |
| `public/import/` | Data and photo from your old Claude page, used by the Import tool |
| `netlify.toml` | Build settings and `/admin` routing for Netlify |
| `.env.example` | The two settings the site needs |
| `tests/logic.test.mjs` | Automatic checks (`node tests/logic.test.mjs`) |

---

## Step 1: Create the Supabase project

1. Go to https://supabase.com, sign up, click **New project**.
2. Choose a name, a strong database password (save it somewhere safe; you will not need it in this website) and a region near your visitors. Click **Create**. Wait a minute.
3. Open **Project Settings > API** (or **API Keys**). Copy two things:
   - **Project URL** (looks like `https://abcdxyz.supabase.co`)
   - **anon / publishable key** (the long public key)
   
   Do **not** copy the `service_role` / secret key anywhere. This website never uses it.

## Step 2: Run the database setup

1. In Supabase open **SQL Editor > New query**.
2. Open `supabase/schema.sql` from this project, copy everything, paste it, press **Run**.
3. You should see "Success". (It is safe to run again later; it does not delete your content.)

This creates all tables, turns on Row Level Security, creates the four storage buckets and the storage rules.

## Step 3: Create your admin account (no public signup)

1. **Authentication > Users > Add user > Create new user.** Enter your email and a strong password. Tick **Auto Confirm User**.
2. **Turn off public signups:** Authentication > **Sign In / Providers** (older dashboards: Settings) and switch **off** "Allow new users to sign up". Also keep "Allow anonymous sign-ins" **off**.
3. Add yourself to the admin allowlist. In **SQL Editor**, run (use your email):

```sql
insert into public.admin_users (user_id)
select id from auth.users where email = 'YOUR-ADMIN-EMAIL@example.com'
on conflict do nothing;
```

Only people in `admin_users` can add, change or delete anything. Even if someone found the login page, a user who is not on this list cannot write data or files: the database itself refuses.

## Step 4: Put the code on GitHub

1. Create a free GitHub account and a **private** repository.
2. Upload all files of this project (keep the folder structure). Do not upload a `.env` file. `.gitignore` already blocks it.

## Step 5: Deploy on Netlify

1. https://app.netlify.com > **Add new site > Import an existing project > GitHub**, pick the repository.
2. Build settings are read from `netlify.toml` (build command `npm run build`, publish directory `dist`). Leave them.
3. **Before deploying**, click **Add environment variables** (or later: **Site configuration > Environment variables**) and add:

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | your Project URL |
| `VITE_SUPABASE_ANON_KEY` | your anon / publishable key |

4. Click **Deploy**. When it finishes, open the Netlify URL. You will see the site (empty until you add content).
5. If you add or change environment variables later, go to **Deploys > Trigger deploy > Clear cache and deploy site**, because the values are baked in at build time.
6. Optional: **Domain management** lets you rename the site or connect your own domain.

Refreshing `/admin` or `/admin/login` works because of the redirects in `netlify.toml`.

## Step 6: First sign-in and import your old content

1. Open `https://YOUR-SITE.netlify.app/admin` and sign in.
2. Go to the **Import** tab and press **Run import**. It copies your profile text, your profile photo and the Bangladesh Esports News featured client. It asks before overwriting anything.
3. The old Claude page currently had **no** designs, videos or projects saved, so there is nothing else to move. If you add items there later, those files cannot be copied automatically: download them from that page and upload them again in the dashboard.
4. Open **Profile** and fill in phone, email, location, experience, education. Open **Social Media** and add your real links.

## Using the admin from your Android phone

1. Open Chrome, go to `https://YOUR-SITE.netlify.app/admin`, sign in.
2. Chrome menu (⋮) > **Add to Home screen** to get an app-like shortcut.
3. The tabs at the top scroll sideways. Every button is large enough for touch.
4. When you tap a file field, Android offers the camera, gallery and files.

## Uploading and updating content

* **Designs:** Designs > **Upload many images** to add several at once (they start as *drafts*), or **+ Add design** for one with title, category, description, featured and publish. Press **Publish** when ready. Use ↑ ↓ to reorder.
* **Videos:** Videos > **+ Add video**. Either upload an MP4/WebM or paste a YouTube/Vimeo link. Add an optional thumbnail.
* **Projects:** Add cover, several screenshots, technology list, live and source links, status.
* **Featured Client:** Featured Client > **Designs** on the client card to upload the designs you made for that page.
* **Profile / Social Media:** edit and save. Hidden links never show publicly.
* **Drafts** are never shown on the public site. Changes appear for visitors as soon as you save (reload the public page). No redeploy.

Large images are shrunk to max 2400 px in your browser before upload. Uploads show a progress bar and use Supabase's resumable (TUS) protocol, which retries automatically if the connection drops.

## File size limits (important for videos)

* Images: 25 MB each (set in `supabase/schema.sql`; edit the number and re-run if needed).
* Videos: the project sets **no** per-file limit of its own, so Supabase's **global upload limit** applies. On the Free plan this is small (50 MB at the time of writing). Check **Project Settings > Storage** (or the Supabase pricing page) for your current limit, and raise it there if your plan allows.
* For long or very large videos, upload to YouTube or Vimeo and paste the link in the admin. They play inside your site.

## Security summary

* Only the public URL and anon key are in the website. No `service_role` key or password exists in the code.
* Row Level Security is on for every table. Visitors can only read published/visible rows. Only users in `admin_users` can write, via the `is_admin()` function.
* Storage rules allow only admins to upload, replace, list and delete. Buckets are public for reading so visitors can see published media quickly. File names are random, and nobody can list a bucket. **Trade-off:** a draft file's link would still open if someone somehow had its exact address. If you need drafts to be strictly private, tell your developer to switch buckets to private with signed URLs.
* Links from data are only rendered if they start with `http://` or `https://`, and all text is HTML-escaped.
* Login is email + password; sessions persist and refresh automatically, and an expired session returns you to the login page.

## Contact form

The form checks the fields and then opens the visitor's email app with the message filled in. It does **not** send anything by itself, and the page says so. For direct sending you would need an extra service (for example a form service or a Supabase Edge Function).

## Running on your own computer (optional)

```
npm install
cp .env.example .env     # then put your two values inside
npm run dev              # public site at http://localhost:5173 , admin at /admin/
npm run build
node tests/logic.test.mjs
```

## Troubleshooting

| Problem | Fix |
|---|---|
| Site says "could not be loaded" | Check both environment variables in Netlify, then **Clear cache and deploy**. Check that you ran `schema.sql`. |
| "Not configured" on /admin | Same as above: the two `VITE_` variables are missing at build time. |
| "Incorrect email or password" | Re-create the user in Authentication > Users and tick Auto Confirm. |
| "This account is not authorised" | Run the `insert into public.admin_users ...` statement in Step 3 with the exact email. |
| Upload error "new row violates row-level security" | Your user is not in `admin_users`, or your session expired: sign out and in. |
| Upload error about size or type | Image over 25 MB or not JPG/PNG/WebP; video not MP4/WebM; or above your plan's global limit (see above). |
| Image uploaded but not visible publicly | It is still a **Draft**: press Publish. |
| `/admin` shows 404 | Make sure `netlify.toml` was uploaded to GitHub, then redeploy. |
| Build fails on Netlify | Open the deploy log. Make sure `package.json` is at the repository root and Node 20 is used (set in `netlify.toml`). |

## Honest status of testing

Done in development: automatic checks for the pure logic and the page renderer (escaping, unsafe links, hidden/visible social links, sections, filters) and JavaScript syntax checks of all files.
**Not done** (no internet or Supabase/Netlify account available while building): installing packages, running `vite build`, running the SQL on a real database, testing RLS with real anonymous/admin sessions, real uploads and mobile browser testing. Please follow Steps 1 to 6 and use the troubleshooting table; if anything fails, send the exact error text.
