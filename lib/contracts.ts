import { randomBytes } from "crypto";
import { q, type Row } from "./db";

export type Decision = "pending" | "keep" | "cancel" | "renegotiate";
export const DECISIONS: Decision[] = ["pending", "keep", "cancel", "renegotiate"];
export const DECISION_LABEL: Record<Decision, string> = {
  pending: "Needs a decision",
  keep: "Keep",
  cancel: "Cancel",
  renegotiate: "Renegotiate",
};

export type Contract = {
  id: number;
  vendor: string;
  product: string | null;
  category: string | null;
  annual_cost: number;
  currency: string;
  billing_cycle: string | null;
  start_date: string | null;
  renewal_date: string;
  notice_days: number;
  auto_renew: boolean;
  seats: number | null;
  seats_used: number | null;
  owner_name: string | null;
  owner_email: string | null;
  decision: Decision;
  target_annual_cost: number | null;
  key_terms: string | null;
  notes: string | null;
  source: string;
  owner_token: string;
  created_at: string;
  updated_at: string;
  // Worked out by the app (no AI):
  cancel_by: string;
  days_left: number;
  urgency: "red" | "amber" | "green" | "closed";
  savings: number;
  unused_seats: number;
  unused_seat_cost: number;
};

export type ContractInput = Partial<{
  vendor: string;
  product: string | null;
  category: string | null;
  annual_cost: number;
  currency: string;
  billing_cycle: string | null;
  start_date: string | null;
  renewal_date: string;
  notice_days: number;
  auto_renew: boolean;
  seats: number | null;
  seats_used: number | null;
  owner_name: string | null;
  owner_email: string | null;
  decision: Decision;
  target_annual_cost: number | null;
  key_terms: string | null;
  notes: string | null;
}>;

const EDITABLE = [
  "vendor", "product", "category", "annual_cost", "currency", "billing_cycle", "start_date",
  "renewal_date", "notice_days", "auto_renew", "seats", "seats_used", "owner_name", "owner_email",
  "decision", "target_annual_cost", "key_terms", "notes",
] as const;

const FIELD_LABEL: Record<string, string> = {
  vendor: "vendor", product: "product", category: "category", annual_cost: "yearly cost",
  currency: "currency", billing_cycle: "billing cycle", start_date: "start date",
  renewal_date: "renewal date", notice_days: "notice period", auto_renew: "auto-renew",
  seats: "seats", seats_used: "seats used", owner_name: "owner", owner_email: "owner email",
  decision: "decision", target_annual_cost: "target price", key_terms: "key terms", notes: "notes",
};

// ---------- dates (all plain YYYY-MM-DD, Indian time) ----------
export function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}
export function addDays(date: string, days: number): string {
  const t = new Date(date + "T00:00:00Z");
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
}
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / 86400000);
}
export function isDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
}
export function prettyDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d + "T00:00:00Z").toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
}
export function money(n: number | null | undefined, currency = "INR"): string {
  if (n === null || n === undefined || isNaN(Number(n))) return "—";
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency", currency, maximumFractionDigits: 0,
    }).format(Number(n));
  } catch {
    return `${currency} ${Number(n).toLocaleString("en-IN")}`;
  }
}

// ---------- the rules (plain code, no AI) ----------
function enrich(r: Row): Contract {
  const c = {
    ...r,
    id: Number(r.id),
    annual_cost: Number(r.annual_cost ?? 0),
    notice_days: Number(r.notice_days ?? 0),
    seats: r.seats === null ? null : Number(r.seats),
    seats_used: r.seats_used === null ? null : Number(r.seats_used),
    target_annual_cost: r.target_annual_cost === null ? null : Number(r.target_annual_cost),
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  } as Contract;
  c.cancel_by = addDays(c.renewal_date, -c.notice_days);
  c.days_left = daysBetween(today(), c.cancel_by);
  c.urgency = c.days_left < 0 ? "closed" : c.days_left <= 21 ? "red" : c.days_left <= 60 ? "amber" : "green";
  c.savings =
    c.decision === "cancel"
      ? c.annual_cost
      : c.decision === "renegotiate" && c.target_annual_cost !== null
        ? Math.max(0, c.annual_cost - c.target_annual_cost)
        : 0;
  c.unused_seats = c.seats && c.seats_used !== null ? Math.max(0, c.seats - c.seats_used) : 0;
  c.unused_seat_cost = c.seats ? Math.round((c.annual_cost * c.unused_seats) / c.seats) : 0;
  return c;
}

export function urgencyText(c: Contract): string {
  if (c.urgency === "closed") return c.auto_renew ? "Notice window closed" : "Notice date passed";
  if (c.days_left === 0) return "Last day to cancel";
  if (c.days_left === 1) return "1 day left to cancel";
  return `${c.days_left} days left to cancel`;
}

export function reminderPlan(c: Contract) {
  return [30, 7, 1].map((before) => {
    const date = addDays(c.cancel_by, -before);
    return { before, date, past: daysBetween(today(), date) < 0 };
  });
}

// ---------- reading ----------
export async function listContracts(): Promise<Contract[]> {
  const rows = await q(`SELECT * FROM contracts`);
  return rows.map(enrich).sort((a, b) => {
    const aClosed = a.days_left < 0 ? 1 : 0;
    const bClosed = b.days_left < 0 ? 1 : 0;
    if (aClosed !== bClosed) return aClosed - bClosed;
    return a.days_left - b.days_left;
  });
}

export async function getContract(id: number): Promise<Contract | null> {
  if (!Number.isInteger(id)) return null;
  const rows = await q(`SELECT * FROM contracts WHERE id = $1`, [id]);
  return rows[0] ? enrich(rows[0]) : null;
}

export async function getContractByToken(token: string): Promise<Contract | null> {
  const rows = await q(`SELECT * FROM contracts WHERE owner_token = $1`, [token]);
  return rows[0] ? enrich(rows[0]) : null;
}

export async function listEvents(contractId: number) {
  return q(`SELECT actor, action, created_at FROM events WHERE contract_id = $1 ORDER BY id DESC LIMIT 30`, [
    contractId,
  ]);
}

export function totals(list: Contract[]) {
  const inr = list.filter((c) => c.currency === "INR");
  return {
    count: list.length,
    yearlySpend: inr.reduce((s, c) => s + c.annual_cost, 0),
    actSoon: list.filter((c) => c.decision === "pending" && c.days_left >= 0 && c.days_left <= 30).length,
    savings: inr.reduce((s, c) => s + c.savings, 0),
    unusedSeatCost: inr.reduce((s, c) => s + c.unused_seat_cost, 0),
    otherCurrencies: list.length - inr.length,
  };
}

// ---------- writing ----------
function clean(input: ContractInput): ContractInput {
  const out: Record<string, unknown> = {};
  for (const key of EDITABLE) {
    const v = (input as Record<string, unknown>)[key];
    if (v === undefined) continue;
    out[key] = typeof v === "string" ? v.trim() : v;
  }
  if (out.decision !== undefined && !DECISIONS.includes(out.decision as Decision)) {
    throw new Error(`Decision must be one of: ${DECISIONS.join(", ")}`);
  }
  for (const d of ["renewal_date", "start_date"]) {
    if (out[d] !== undefined && out[d] !== null && out[d] !== "" && !isDate(out[d])) {
      throw new Error(`${FIELD_LABEL[d]} must look like 2027-01-30`);
    }
    if (out[d] === "") out[d] = null;
  }
  if (out.currency !== undefined) out.currency = String(out.currency || "INR").toUpperCase();
  return out as ContractInput;
}

export async function addContract(input: ContractInput, actor: string, source: string): Promise<Contract> {
  const c = clean(input);
  if (!c.vendor) throw new Error("Vendor name is required");
  if (!c.renewal_date) throw new Error("Renewal date is required");
  const rows = await q(
    `INSERT INTO contracts (vendor, product, category, annual_cost, currency, billing_cycle, start_date,
      renewal_date, notice_days, auto_renew, seats, seats_used, owner_name, owner_email, decision,
      target_annual_cost, key_terms, notes, source, owner_token)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,
    [
      c.vendor, c.product ?? null, c.category ?? null, c.annual_cost ?? 0, c.currency ?? "INR",
      c.billing_cycle ?? null, c.start_date ?? null, c.renewal_date, c.notice_days ?? 30,
      c.auto_renew ?? true, c.seats ?? null, c.seats_used ?? null, c.owner_name ?? null,
      c.owner_email ?? null, c.decision ?? "pending", c.target_annual_cost ?? null, c.key_terms ?? null,
      c.notes ?? null, source, randomBytes(12).toString("hex"),
    ]
  );
  const saved = enrich(rows[0]);
  await logEvent(saved.id, actor, "Added this contract");
  return saved;
}

export async function updateContract(id: number, input: ContractInput, actor: string): Promise<Contract> {
  const before = await getContract(id);
  if (!before) throw new Error(`No contract with id ${id}`);
  const c = clean(input) as Record<string, unknown>;
  const changed: string[] = [];
  for (const key of Object.keys(c)) {
    const a = (before as Record<string, unknown>)[key] ?? null;
    const b = c[key] ?? null;
    if (String(a) !== String(b)) changed.push(key);
  }
  if (changed.length === 0) return before;
  const sets = changed.map((k, i) => `${k} = $${i + 2}`).join(", ");
  const rows = await q(`UPDATE contracts SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`, [
    id,
    ...changed.map((k) => c[k] ?? null),
  ]);
  const after = enrich(rows[0]);
  const words = changed.map((k) =>
    k === "decision" ? `decision → ${DECISION_LABEL[after.decision]}` : FIELD_LABEL[k] ?? k
  );
  await logEvent(id, actor, `Changed ${words.join(", ")}`);
  return after;
}

export async function deleteContract(id: number) {
  await q(`DELETE FROM events WHERE contract_id = $1`, [id]);
  await q(`DELETE FROM contracts WHERE id = $1`, [id]);
}

export async function logEvent(contractId: number, actor: string, action: string) {
  await q(`INSERT INTO events (contract_id, actor, action) VALUES ($1, $2, $3)`, [contractId, actor, action]);
}

export async function resetDemo() {
  await q(`DELETE FROM events`);
  await q(`DELETE FROM contracts`);
  const { seedDemoData } = await import("./seed");
  await seedDemoData((text, params) => q(text, params));
}
