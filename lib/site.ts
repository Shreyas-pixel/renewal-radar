import { createHash } from "crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { type Contract, money, prettyDate, DECISION_LABEL } from "./contracts";

// ---------- test login ----------
export const DEMO_USERNAME = process.env.DEMO_USERNAME || "demo@renewalradar.app";
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "radar2026";
const COOKIE = "rr_session";

export function sessionValue() {
  return createHash("sha256")
    .update(`${DEMO_USERNAME}:${DEMO_PASSWORD}:${process.env.SESSION_SECRET || "renewal-radar"}`)
    .digest("hex");
}
export const SESSION_COOKIE = COOKIE;

export async function isLoggedIn() {
  const jar = await cookies();
  return jar.get(COOKIE)?.value === sessionValue();
}
export async function requireLogin() {
  if (!(await isLoggedIn())) redirect("/login");
}

// ---------- links ----------
export function envBaseUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}
export async function baseUrl() {
  if (process.env.APP_URL) return envBaseUrl();
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  if (!host) return envBaseUrl();
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// ---------- reminder emails (optional: only if RESEND_API_KEY is set) ----------
export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendReminderEmail(c: Contract, base: string): Promise<{ ok: boolean; message: string }> {
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, message: "Email isn't switched on yet, so copy the owner link and send it yourself." };
  }
  if (!c.owner_email) return { ok: false, message: "Add an owner email first." };
  const link = `${base}/o/${c.owner_token}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;color:#1c2024">
      <p>Hi ${escapeHtml(c.owner_name || "there")},</p>
      <p><b>${escapeHtml(c.vendor)}${c.product ? " " + escapeHtml(c.product) : ""}</b> renews on
      <b>${prettyDate(c.renewal_date)}</b> for <b>${money(c.annual_cost, c.currency)}</b> a year.</p>
      <p>The last day to cancel or change it is <b>${prettyDate(c.cancel_by)}</b>
      (${c.days_left} days from today). Current status: ${DECISION_LABEL[c.decision]}.</p>
      ${c.unused_seats ? `<p>${c.unused_seats} of ${c.seats} seats look unused (about ${money(c.unused_seat_cost, c.currency)} a year).</p>` : ""}
      <p><a href="${link}" style="background:#0f5e57;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Keep, cancel or renegotiate</a></p>
      <p style="color:#6b7280;font-size:12px">Sent by Renewal Radar</p>
    </div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.REMINDER_FROM || "Renewal Radar <onboarding@resend.dev>",
      to: [c.owner_email],
      subject: `Decide by ${prettyDate(c.cancel_by)}: ${c.vendor} renews on ${prettyDate(c.renewal_date)}`,
      html,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, message: `The email service said no: ${text.slice(0, 160)}` };
  }
  return { ok: true, message: `Reminder emailed to ${c.owner_email}.` };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
}
