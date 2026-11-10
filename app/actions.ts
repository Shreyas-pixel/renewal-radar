"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  addContract, updateContract, deleteContract, getContract, getContractByToken, logEvent, resetDemo,
  type ContractInput, type Decision,
} from "@/lib/contracts";
import {
  DEMO_PASSWORD, DEMO_USERNAME, SESSION_COOKIE, sessionValue, requireLogin, baseUrl, sendReminderEmail,
} from "@/lib/site";

const back = (path: string, msg: string) => redirect(`${path}?msg=${encodeURIComponent(msg)}`);

export async function login(formData: FormData) {
  const user = String(formData.get("username") || "").trim().toLowerCase();
  const pass = String(formData.get("password") || "");
  if (user !== DEMO_USERNAME.toLowerCase() || pass !== DEMO_PASSWORD) {
    back("/login", "Wrong username or password.");
  }
  const jar = await cookies();
  jar.set(SESSION_COOKIE, sessionValue(), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/");
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}

function readForm(formData: FormData): ContractInput {
  const s = (k: string) => {
    const v = formData.get(k);
    if (v === null) return undefined;
    const t = String(v).trim();
    return t === "" ? null : t;
  };
  const n = (k: string) => {
    const v = s(k);
    if (v === undefined || v === null) return v;
    const num = Number(String(v).replace(/[,₹\s]/g, ""));
    if (isNaN(num)) throw new Error(`"${v}" is not a number`);
    return num;
  };
  return {
    vendor: s("vendor") ?? undefined,
    product: s("product"),
    category: s("category"),
    annual_cost: n("annual_cost") ?? 0,
    currency: s("currency") ?? "INR",
    billing_cycle: s("billing_cycle"),
    start_date: s("start_date"),
    renewal_date: s("renewal_date") ?? undefined,
    notice_days: n("notice_days") ?? 30,
    auto_renew: formData.get("auto_renew") === "on",
    seats: n("seats"),
    seats_used: n("seats_used"),
    owner_name: s("owner_name"),
    owner_email: s("owner_email"),
    decision: (s("decision") as Decision) ?? "pending",
    target_annual_cost: n("target_annual_cost"),
    key_terms: s("key_terms"),
    notes: s("notes"),
  };
}

export async function createContractAction(formData: FormData) {
  await requireLogin();
  let id: number;
  try {
    id = (await addContract(readForm(formData), "You", "manual")).id;
  } catch (e) {
    return back("/contracts/new", e instanceof Error ? e.message : "Could not save");
  }
  revalidatePath("/");
  back(`/contracts/${id}`, "Contract saved.");
}

export async function saveContractAction(id: number, formData: FormData) {
  await requireLogin();
  try {
    await updateContract(id, readForm(formData), "You");
  } catch (e) {
    return back(`/contracts/${id}`, e instanceof Error ? e.message : "Could not save");
  }
  revalidatePath("/");
  back(`/contracts/${id}`, "Changes saved.");
}

export async function setDecisionAction(id: number, decision: Decision) {
  await requireLogin();
  await updateContract(id, { decision }, "You");
  revalidatePath("/");
  back(`/contracts/${id}`, `Marked as ${decision}.`);
}

export async function deleteContractAction(id: number) {
  await requireLogin();
  await deleteContract(id);
  revalidatePath("/");
  back("/", "Contract deleted.");
}

export async function sendReminderAction(id: number) {
  await requireLogin();
  const c = await getContract(id);
  if (!c) return back("/", "Contract not found.");
  const result = await sendReminderEmail(c, await baseUrl());
  if (result.ok) await logEvent(id, "You", `Emailed a reminder to ${c.owner_email}`);
  back(`/contracts/${id}`, result.message);
}

export async function resetDemoAction() {
  await requireLogin();
  await resetDemo();
  revalidatePath("/");
  back("/", "Demo data reset.");
}

export async function ownerDecisionAction(token: string, formData: FormData) {
  const c = await getContractByToken(token);
  if (!c) return back(`/o/${token}`, "This link is no longer valid.");
  const decision = String(formData.get("decision") || "") as Decision;
  if (!["keep", "cancel", "renegotiate"].includes(decision)) return back(`/o/${token}`, "Pick an option.");
  const targetRaw = String(formData.get("target_annual_cost") || "").replace(/[,₹\s]/g, "");
  const note = String(formData.get("note") || "").trim();
  const changes: ContractInput = { decision };
  if (decision === "renegotiate" && targetRaw && !isNaN(Number(targetRaw))) {
    changes.target_annual_cost = Number(targetRaw);
  }
  if (note) changes.notes = c.notes ? `${c.notes}\n${c.owner_name || "Owner"}: ${note}` : `${c.owner_name || "Owner"}: ${note}`;
  await updateContract(c.id, changes, `${c.owner_name || "Owner"} (via owner link)`);
  revalidatePath("/");
  back(`/o/${token}`, "Thanks, your decision is saved.");
}
