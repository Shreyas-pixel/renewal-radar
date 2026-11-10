# Renewal Radar

**Claude reads the fine print. Renewal Radar remembers it.**

Companies lose money when software and vendor contracts renew automatically because nobody remembered the cancel-by date. With Renewal Radar, you attach a contract in Claude and say "Add this contract to Renewal Radar". Claude reads it; Renewal Radar saves it, works out the last day to cancel, shows it on a live dashboard, and lets the owner decide to keep, cancel or renegotiate.

**No AI inside.** There are no OpenAI, Anthropic or other AI keys in this app. The customer's own Claude does the reading through MCP.

## How it works

1. Claude reads the contract and calls the app's MCP tools (`/api/mcp`):
   - `add_contract`: save a contract (vendor, yearly cost, renewal date, notice period, seats, owner, key terms)
   - `list_contracts`: list contracts, deadlines, decisions and savings
   - `update_contract`: change details or record a decision
2. The app (plain code) works out `cancel-by = renewal date − notice period`, colours it red (under 3 weeks), amber (under 2 months) or green, and tracks savings and unused seats.
3. People edit everything in the web app. Each contract has an owner link that works without login.
4. Optional: daily reminder emails (30, 7 and 1 days before the cancel-by date) when an email key is added.

## Test login

- Username: `demo@renewalradar.app`
- Password: `radar2026`

(Change them with the `DEMO_USERNAME` and `DEMO_PASSWORD` environment variables.)

## Connect to Claude

1. In Claude, go to **Customize → Connectors**, click **+**, then **Add custom connector**.
2. Name: `Renewal Radar`. URL: `https://<your-app>.vercel.app/api/mcp`. Click **Add** (no sign-in needed).
3. Start a new chat, attach `sample-contract-pixelboard.pdf` (download it from the app's Connect page) and type: **"Add this contract to Renewal Radar."**

## Deploy on Vercel

1. Upload this folder to a new GitHub repository.
2. In Vercel: **Add New → Project**, import the repository, click **Deploy**.
3. In the project, open **Storage → Create Database → Neon (Postgres)**, connect it to the project, then **Deployments → ⋯ → Redeploy**.
4. Tables and 3 example contracts are created automatically on first visit.

### Optional environment variables

| Name | What it does |
| --- | --- |
| `DEMO_USERNAME`, `DEMO_PASSWORD` | Change the test login |
| `SESSION_SECRET` | Any random text, makes login cookies unique to your app |
| `RESEND_API_KEY` | Turns on reminder emails (free account at resend.com) |
| `REMINDER_FROM` | Sender address for reminders (needs a verified domain on Resend) |
| `CRON_SECRET` | Protects the daily reminder job |
| `APP_URL` | Your app's public address, if you use a custom domain |

## Run on your computer

```bash
npm install
npm run dev
```

Open http://localhost:3000. Without a database URL it uses a temporary in-memory database.

## Tech

Next.js 16, Postgres (Neon), `mcp-handler` + MCP TypeScript SDK v2. Hosting cost per company is a few rupees a month.
