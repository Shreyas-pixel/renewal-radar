import { randomBytes } from "crypto";

type Runner = (text: string, params?: unknown[]) => Promise<Record<string, any>[]>;

// Three example contracts so the dashboard never looks empty.
const DEMO = [
  {
    vendor: "HubSpot",
    product: "Sales Hub Professional",
    category: "Sales & CRM",
    annual_cost: 960000,
    billing_cycle: "Annual",
    start_date: "2026-02-15",
    renewal_date: "2027-02-15",
    notice_days: 60,
    seats: 20,
    seats_used: 17,
    owner_name: "Rahul (Sales head)",
    decision: "pending",
    target: null,
    key_terms: "Auto-renews for 12 months. Price may rise up to 10% at renewal.",
  },
  {
    vendor: "Slack",
    product: "Business+",
    category: "Collaboration",
    annual_cost: 420000,
    billing_cycle: "Annual",
    start_date: "2026-03-01",
    renewal_date: "2027-03-01",
    notice_days: 30,
    seats: 50,
    seats_used: 38,
    owner_name: "Ananya (Operations)",
    decision: "renegotiate",
    target: 300000,
    key_terms: "Seats can only be reduced at renewal.",
  },
  {
    vendor: "Zoom",
    product: "Workplace Business",
    category: "Collaboration",
    annual_cost: 180000,
    billing_cycle: "Annual",
    start_date: "2026-07-01",
    renewal_date: "2027-07-01",
    notice_days: 30,
    seats: 25,
    seats_used: 24,
    owner_name: "Ananya (Operations)",
    decision: "keep",
    target: null,
    key_terms: "Auto-renews yearly at list price.",
  },
];

export async function seedDemoData(run: Runner) {
  for (const d of DEMO) {
    const rows = await run(
      `INSERT INTO contracts (vendor, product, category, annual_cost, currency, billing_cycle, start_date,
        renewal_date, notice_days, auto_renew, seats, seats_used, owner_name, decision, target_annual_cost,
        key_terms, source, owner_token)
       VALUES ($1,$2,$3,$4,'INR',$5,$6,$7,$8,TRUE,$9,$10,$11,$12,$13,$14,'example',$15) RETURNING id`,
      [
        d.vendor, d.product, d.category, d.annual_cost, d.billing_cycle, d.start_date, d.renewal_date,
        d.notice_days, d.seats, d.seats_used, d.owner_name, d.decision, d.target, d.key_terms,
        randomBytes(12).toString("hex"),
      ]
    );
    await run(`INSERT INTO events (contract_id, actor, action) VALUES ($1, 'Renewal Radar', 'Added as an example contract')`, [
      rows[0].id,
    ]);
  }
}
