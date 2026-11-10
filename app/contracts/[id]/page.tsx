import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getContract, listEvents, money, prettyDate, reminderPlan, type Decision,
} from "@/lib/contracts";
import { requireLogin, baseUrl, emailConfigured } from "@/lib/site";
import { Header, Flash, UrgencyBadge, DecisionChip, SourceTag, ContractForm } from "@/components/ui";
import { CopyButton, ConfirmButton } from "@/components/client";
import {
  saveContractAction, setDecisionAction, deleteContractAction, sendReminderAction,
} from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function ContractPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string }>;
}) {
  await requireLogin();
  const { id } = await params;
  const { msg } = await searchParams;
  const c = await getContract(Number(id));
  if (!c) notFound();
  const events = await listEvents(c.id);
  const ownerLink = `${await baseUrl()}/o/${c.owner_token}`;
  const plan = reminderPlan(c);
  const decide = (d: Decision) => setDecisionAction.bind(null, c.id, d);

  return (
    <>
      <Header loggedIn />
      <main className="page">
        <div className="page-head">
          <div>
            <Link href="/" className="muted" style={{ textDecoration: "none", fontSize: 14 }}>← All contracts</Link>
            <h1 style={{ marginTop: 8 }}>
              {c.vendor} {c.product && <span className="muted" style={{ fontWeight: 400 }}>{c.product}</span>}
            </h1>
            <p className="row">
              <SourceTag source={c.source} /> <DecisionChip c={c} />
            </p>
          </div>
        </div>
        <Flash msg={msg} />

        <div className="detail">
          <ContractForm c={c} action={saveContractAction.bind(null, c.id)} submitLabel="Save changes" />

          <aside className="stack">
            <div className="card">
              <small>LAST DAY TO CANCEL OR CHANGE</small>
              <div className="big-date">{prettyDate(c.cancel_by)}</div>
              <UrgencyBadge c={c} />
              <dl className="kv" style={{ marginTop: 14 }}>
                <dt>Renews on</dt><dd>{prettyDate(c.renewal_date)}</dd>
                <dt>Notice</dt><dd>{c.notice_days} days</dd>
                <dt>Yearly cost</dt><dd>{money(c.annual_cost, c.currency)}</dd>
                {c.savings > 0 && (<><dt>Savings</dt><dd style={{ color: "var(--green)", fontWeight: 600 }}>{money(c.savings, c.currency)} a year</dd></>)}
              </dl>
              {c.unused_seats > 0 && (
                <p className="warn-box" style={{ marginTop: 14 }}>
                  {c.unused_seats} of {c.seats} seats unused: about <b>{money(c.unused_seat_cost, c.currency)}</b> a year.
                </p>
              )}
            </div>

            <div className="card">
              <h3>Decide</h3>
              <div className="decision-row" style={{ marginTop: 10 }}>
                <form action={decide("keep")}><button className={`btn btn-keep ${c.decision === "keep" ? "is-on" : ""}`}>Keep</button></form>
                <form action={decide("cancel")}><button className={`btn btn-cancel ${c.decision === "cancel" ? "is-on" : ""}`}>Cancel</button></form>
                <form action={decide("renegotiate")}><button className={`btn btn-reneg ${c.decision === "renegotiate" ? "is-on" : ""}`}>Renegotiate</button></form>
              </div>
              <small style={{ display: "block", marginTop: 8 }}>For renegotiate, set a target yearly price in the form.</small>
            </div>

            <div className="card">
              <h3>Owner link</h3>
              <p className="muted" style={{ fontSize: 14, margin: "6px 0 10px" }}>
                {c.owner_name || "The owner"} can open this and decide. No login or Claude needed.
              </p>
              <div className="row">
                <CopyButton value={ownerLink} label="Copy owner link" />
                <a className="btn btn-small" href={ownerLink} target="_blank">Open</a>
              </div>
            </div>

            <div className="card">
              <h3>Reminders</h3>
              <ul className="list-plain">
                {plan.map((p) => (
                  <li key={p.before} className={p.past ? "muted" : ""}>
                    {prettyDate(p.date)} · {p.before} {p.before === 1 ? "day" : "days"} before
                    {p.past ? " (passed)" : ""}
                  </li>
                ))}
              </ul>
              <form action={sendReminderAction.bind(null, c.id)} style={{ marginTop: 10 }}>
                <button className="btn btn-small" type="submit">Send reminder now</button>
              </form>
              {!emailConfigured() && (
                <small style={{ display: "block", marginTop: 6 }}>Email sending is off until an email key is added.</small>
              )}
            </div>

            <div className="card">
              <h3>Activity</h3>
              <ul className="list-plain">
                {events.map((e, i) => (
                  <li key={i}>
                    <b>{e.actor}</b> {e.action.charAt(0).toLowerCase() + e.action.slice(1)}
                    <div className="muted" style={{ fontSize: 12 }}>
                      {new Date(e.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <form action={deleteContractAction.bind(null, c.id)}>
              <ConfirmButton className="btn btn-danger btn-small" label="Delete contract" message="Delete this contract?" />
            </form>
          </aside>
        </div>
      </main>
    </>
  );
}
