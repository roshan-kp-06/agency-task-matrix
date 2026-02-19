# Task Matrix

Prioritize tasks by **Leverage** (ROI) vs **Effort** — a visual 2×2 matrix that tells you exactly what to work on next.

Live at: **https://agency-task-matrix.vercel.app**

## Quadrants

| | Low Effort | High Effort |
|---|---|---|
| **High Leverage** | ✅ Quick Wins — do first | 📅 Big Bets — schedule |
| **Low Leverage** | 🕐 Fill-ins — if time | ❌ Eliminate — kill these |

## Setup

### 1. Supabase (database)

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase-schema.sql`
3. Go to **Settings → API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Environment variables

Fill in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Copy from Agency AI OS .env:
SLACK_BOT_TOKEN=xoxb-...
AIRTABLE_API_KEY=pat...
AIRTABLE_BASE_ID=app...
AIRTABLE_TABLE_NAME=Tasks
AIRTABLE_ASSIGNEE_FIELD=Assignee
AIRTABLE_ASSIGNEE_VALUE=Roshan
```

### 3. Run locally

```bash
npm install
npm run dev
# Opens at http://localhost:3000
```

### 4. Deploy to Vercel

Connect this GitHub repo at [vercel.com/new](https://vercel.com/new), then add all env vars in **Project → Settings → Environment Variables**.

## Usage

- **Add tasks** — click `+ Add Task`, set leverage and effort scores
- **Import from Slack** — pulls actionable messages from the last 7 days
- **Import from Airtable** — pulls tasks assigned to you from the PM base
- **Score tasks** — drag sliders on the matrix or list view; dots move in real-time
- **Matrix view** — scatter plot, top-left = do first
- **List view** — sorted by priority score (leverage ÷ effort)
- **Mark done** ✓ or **Kill** ✕ to remove tasks from the board
