import { notFound } from "next/navigation";
import { getContractByToken, money, prettyDate, DECISION_LABEL } from "@/lib/contracts";
import { Flash, RadarMark, UrgencyBadge } from "@/components/ui";
import { ownerDecisionAction } from "@/app/actions";

export const dynamic = "force-dynamic";

// The page a contract owner opens from their reminder. No login, no Claude.
export default async function OwnerPage({
  params, searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ msg?: string }>;
}) {
  const { token } = await params;
  const { msg } = await searchParams;
  const c = await getContractByToken(token);
  if (!c) notFound();

  return (
    <main className="page page-narrow">
      <div className="row" style={{ color: "var(--accent)", marginBottom: 18 }}>
        <RadarMark /> <b style={{ color: "var(--ink)" }}>Renewal Radar</b>
      </div>
      <Flash msg={msg} />
      <div className="card stack">
        <div>
          <small>DECISION NEEDED{c.owner_name ? ` FROM ${c.owner_name.toUpperCase()}` : ""}</small>
          <h1 style={{ marginTop: 6 }}>
            {c.vendor} {c.product && <span className="muted" style={{ fontWeight: 400 }}>{c.product}</span>}
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: 16 }}>
          Renews on <b>{prettyDate(c.renewal_date)}</b> for <b>{money(c.annual_cost, c.currency)}</b> a year.
          The last day to cancel or change it is <b>{prettyDate(c.cancel_by)}</b>.
        </p>
        <div><UrgencyBadge c={c} /></div>
        {c.unused_seats > 0 && (
          <p className="warn-box" style={{ margin: 0 }}>
            {c.unused_seats} of {c.seats} seats look unused, about {money(c.unused_seat_cost, c.currency)} a year.
          </p>
        )}
        {c.key_terms && <p className="muted" style={{ margin: 0 }}>Key terms: {c.key_terms}</p>}
        <p style={{ margin: 0 }}>Current status: <b>{DECISION_LABEL[c.decision]}</b></p>

        <form action={ownerDecisionAction.bind(null, token)} className="stack">
          <label>
            <span>Target yearly price (only if renegotiating)</span>
            <input name="target_annual_cost" type="number" step="any" placeholder="e.g. 450000" />
          </label>
          <label>
            <span>Note (optional)</span>
            <input name="note" placeholder="e.g. We only need 25 seats" />
          </label>
          <div className="decision-row">
            <button className="btn btn-keep" name="decision" value="keep" type="submit">Keep</button>
            <button className="btn btn-cancel" name="decision" value="cancel" type="submit">Cancel</button>
            <button className="btn btn-reneg" name="decision" value="renegotiate" type="submit">Renegotiate</button>
          </div>
        </form>
      </div>
    </main>
  );
}
