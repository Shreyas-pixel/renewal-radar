import { neon } from "@neondatabase/serverless";

// A tiny database layer.
// On Vercel it uses the Postgres database you connect (DATABASE_URL / POSTGRES_URL).
// On your own computer, with no database set, it uses a throwaway in-memory Postgres.

export type Row = Record<string, any>;
type Runner = (text: string, params?: unknown[]) => Promise<Row[]>;

let runner: Runner | null = null;
let ready: Promise<void> | null = null;

export function databaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
}

async function getRunner(): Promise<Runner> {
  if (runner) return runner;
  const url = databaseUrl();
  if (url) {
    const sql = neon(url);
    runner = async (text, params = []) => (await sql.query(text, params as any[])) as Row[];
  } else {
    if (process.env.VERCEL) {
      throw new Error(
        "No database connected. In Vercel, open Storage, add a Postgres database to this project, then redeploy."
      );
    }
    const g = globalThis as any;
    if (!g.__renewalRadarPglite) {
      const { PGlite } = await import("@electric-sql/pglite");
      g.__renewalRadarPglite = new PGlite();
    }
    const db = g.__renewalRadarPglite;
    runner = async (text, params = []) => (await db.query(text, params)).rows as Row[];
  }
  return runner;
}

export async function q(text: string, params: unknown[] = []): Promise<Row[]> {
  const run = await getRunner();
  if (!ready) {
    ready = setup(run).catch((err) => {
      ready = null;
      throw err;
    });
  }
  await ready;
  return run(text, params);
}

async function setup(run: Runner) {
  await run(`CREATE TABLE IF NOT EXISTS contracts (
    id SERIAL PRIMARY KEY,
    vendor TEXT NOT NULL,
    product TEXT,
    category TEXT,
    annual_cost NUMERIC NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'INR',
    billing_cycle TEXT,
    start_date TEXT,
    renewal_date TEXT NOT NULL,
    notice_days INTEGER NOT NULL DEFAULT 30,
    auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
    seats INTEGER,
    seats_used INTEGER,
    owner_name TEXT,
    owner_email TEXT,
    decision TEXT NOT NULL DEFAULT 'pending',
    target_annual_cost NUMERIC,
    key_terms TEXT,
    notes TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    owner_token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await run(`CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await run(`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY)`);
  const first = await run(
    `INSERT INTO meta (key) VALUES ('seeded') ON CONFLICT (key) DO NOTHING RETURNING key`
  );
  if (first.length > 0) {
    const { seedDemoData } = await import("./seed");
    await seedDemoData(run);
  }
}
