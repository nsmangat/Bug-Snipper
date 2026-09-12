# Bug-Snipper

A browser extension that lets anonymous visitors screenshot a region of an
organization's website and submit it as a bug report. A dashboard is also built-in and allows the organization to then manage these reports.

## How it works

1. An admin registers an organization, a workspace, and one or more allowlisted domains
   (hostname + optional path prefix i.e. hostname: github.com + optional path: /nsmangat) through the dashboard.
2. A visitor on one of those allowlisted sites clicks the extension icon, drags to select
   the region containing a bug using the cropping tool, adds a short description, and submits.
3. The extension uploads the screenshot to Supabase Storage and creates a report containing the HTML of the captured image, the image itself, and the description.
4. The organization reviews, labels, filters, and manages incoming reports from the dashboard.

<img width="1920" height="940" alt="extension-start" src="https://github.com/user-attachments/assets/e902aa0b-6c99-4907-9515-0bc387056f45" />

<img width="1920" height="955" alt="extension-crop" src="https://github.com/user-attachments/assets/8863cb59-fad3-491e-a1c9-54f0d2b61ee5" />

<img width="1890" height="590" alt="dashboard-reports-list" src="https://github.com/user-attachments/assets/8de29646-af6a-4848-a2de-15b8ea14c77b" />

<img width="1697" height="817" alt="dashboard-report-details" src="https://github.com/user-attachments/assets/b8d6d6ed-28ab-4f25-ba1e-84184fc48322" />



## Tech stack

- Extension Build - WXT
- Backend - TypeScript, Express, Supabase (Postgres + Storage)
- Dashboard - React, Vite, TypeScript, Tailwind CSS

## Repository Layout

```
bug-snipper/
  shared-types/          # @bug-snipper/shared-types — Report, Organization, Workspace,
                          # AllowlistedDomain, and the API request/response DTOs
  backend/                # @bug-snipper/backend — Express + Supabase
    src/{routes,services,config,middleware}/
    migrations/           # SQL updates, run manually in the Supabase SQL Editor
    seed/                 # dev seed script (init organization/workspace/domain)
  apps/
    dashboard/             # @bug-snipper/dashboard — React + Vite
    extension/             # @bug-snipper/extension — WXT
```

## Prerequisites

- Node.js 20+
- npm
- [Supabase](https://supabase.com/) project (free tier) or alternatives for storage and Postgres
- Google Chrome (the extension is only built/tested against Chrome for now, see
  [Future considerations](#future-considerations))

## Setup

### 1. Clone and Installing Dependencies

```bash
git clone <this-repo-url>
cd bug-snipper
npm install
```

This installs dependencies for every workspace (`backend`, `shared-types`,
`apps/dashboard`, `apps/extension`).

### 2. Create a Supabase project

Create a new project at [supabase.com](https://supabase.com/). Go to
**Project Settings → API** and retrieve:

- The **Project URL**
- The **`service_role` secret key** (the backend uses this to bypass RLS, since it's the only thing allowed to talk to the db until authentication is implemented)

Along with the above, in the project's **Storage** section, create a bucket named exactly
`report-screenshots` with these settings:

- **Public bucket**: off
- **Allowed MIME types**: `image/png`
- **File size limit**: about 4-8 MB (the extension only ever uses cropped images, so the file sizes should always be small)

### 3. Configure Environment Variables

```bash
cd backend
cp .env.example .env
```

Fill in `.env` with:

```
PORT=3000
SUPABASE_URL=your-project-url
SUPABASE_SECRET_KEY=your-service-role-secret-key
```

### 4. Run the Database Migrations

There's currently no migration CLI in the project, so run each file in `backend/migrations/` **in order** in your Supabase's SQL Editor:

1. `0001_create_organizations_workspaces_domains_reports.sql` — creates all four tables,
   enables RLS
2. `0002_bug_fix_path_prefix_null_uniqueness.sql` — fixes a bug where two hostname
   domain registrations could duplicate when both are NULL
3. `0003_rename_wontfix_status_to_abandoned.sql` — renames the `wontfix` report status to
   `abandoned` to be more clear
4. `0004_require_report_note.sql` — makes a report's `note` property required so that reports are distinguishable in the dashboard's list view

### 5. Seed the database (optional)

```bash
# cd backend/
npm run seed
```

This creates two organizations, three workspaces, and some allowlisted domains
(including `localhost`, so the extension can screenshot the dashboard for testing).
See `backend/seed/seed.ts` for the details and if you want to add/remove your own data.

## Running the Extension

### 1. Run the backend

```bash
# cd backend/
npm run dev
```

Starts the API on `http://localhost:3000` with `tsx watch`, so it restarts automatically
on file changes.

### 2. Run the Frontend/dashboard

```bash
# cd apps/dashboard/
npm run dev
```

Starts the Vite dev server on `http://localhost:5173`.

### 3. Load the extension in Chrome

```bash
# cd apps/extension/
npm run dev
```

This starts WXT's dev server and builds the extension to `apps/extension/.output/chrome-mv3-dev`.
Then, in Chrome:

1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select `apps/extension/.output/chrome-mv3-dev`

After any code change, WXT rebuilds automatically, but the reload icon on the extension's card in `chrome://extensions` then needs to be clicked for the changes to be picked up.

## Trying it end to end

1. With the backend, dashboard, and extension all running (and seeded), visit
   `http://localhost:3000` in Chrome. It's registered as an allowlisted domain by the seed
   script.
2. Click the Bug Snipper extension icon and then click **Start capture**.
3. Drag to select a region, add a description, and submit.
4. Open the dashboard at `http://localhost:5173`, pick the **Main Site** workspace, and the new report should appear in the list.

## API overview

Public endpoints are rate-limited for IP+hostname and CORS-restricted to allowlisted hostnames; dashboard endpoints are currently open (no authentication implemented yet).

**Public (used by the extension, anonymous):**

| Method | Path                    | Purpose                                                                            |
| ------ | ----------------------- | ---------------------------------------------------------------------------------- |
| GET    | `/public/domains/check` | Is this hostname+path allowlisted? Which workspace?                                |
| POST   | `/public/reports`       | Submit a bug report (workspace derived server-side, never trusted from the client) |

**Dashboard:**

| Method               | Path             | Purpose                                          |
| -------------------- | ---------------- | ------------------------------------------------ |
| GET / POST           | `/organizations` | List/create organizations                        |
| GET / POST           | `/workspaces`    | List/create workspaces                           |
| GET / POST / DELETE  | `/domains`       | List/register/remove an allowlisted domain       |
| GET                  | `/reports`       | List reports (filter by `workspaceId`, `status`) |
| GET / PATCH / DELETE | `/reports/:id`   | View/update status/delete a report               |

## Future Considerations/TODOs

- **Authentication** — Most likely using Supabase's built-in auth.
- **Cross-browser packaging** — WXT already generates a Firefox build, but only Chrome has been used to test so far.
- **Deployment** — Currently running on local dev servers.
