import Link from "next/link";
import { listContracts, totals, money, prettyDate } from "@/lib/contracts";
import { requireLogin, baseUrl } from "@/lib/site";
import { Header, Flash, UrgencyBadge, DecisionChip, SourceTag } from "@/components/ui";
import { AutoRefresh, CopyButton, ConfirmButton } from "@/components/client";
import { resetDemoAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  await requireLogin();
  const { msg } = await searchParams;
  const contracts = await listContracts();
  const t = totals(contracts);
  const mcpUrl = `${await baseUrl()}/api/mcp`;
  const now = Date.now();

  return (
    <>
      <Header loggedIn />
      <main className="page">
        <div className="page-head">
          <div>
            <h1>Your contracts</h1>
            <p>Sorted by the last day you can cancel. Ask Claude to add a contract and it appears here.</p>
          </div>
          <div className="row">
            <AutoRefresh />
            <Link href="/contracts/new" className="btn">Add manually</Link>
          </div>
        </div>

        <Flash msg={msg} />

        <div className="connect-strip">
          <span>
            Claude connector link: <code>{mcpUrl}</code>
          </span>
          <span className="row">
            <CopyButton value={mcpUrl} label="Copy link" />
            <Link href="/connect" className="btn btn-small">How to connect</Link>
          </span>
        </div>

        <section className="stats">
          <div className="stat">
            <div className="label">Yearly contract spend</div>
            <div className="value">{money(t.yearlySpend)}</div>
          </div>
          <div className="stat">
            <div className="label">Decide in next 30 days</div>
            <div className={`value ${t.actSoon ? "warn" : ""}`}>{t.actSoon}</div>
          </div>
          <div className="stat">
            <div className="label">Savings secured</div>
            <div className="value good">{money(t.savings)}</div>
          </div>
          <div className="stat">
            <div className="label">Spent on unused seats</div>
            <div className="value">{money(t.unusedSeatCost)}</div>
          </div>
        </section>

        <div className="card table-card">
          {contracts.length === 0 ? (
            <div className="empty">
              <h2>No contracts yet</h2>
              <p>
                In Claude, attach a contract and type <b>&ldquo;Add this contract to Renewal Radar.&rdquo;</b>
              </p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Contract</th>
                  <th>Yearly cost</th>
                  <th className="hide-sm">Renews</th>
                  <th>Cancel by</th>
                  <th className="hide-sm">Owner</th>
                  <th>Decision</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => {
                  const isNew = now - new Date(c.created_at).getTime() < 3 * 60 * 1000 && c.source === "claude";
                  return (
                    <tr key={c.id} className={isNew ? "is-new" : ""}>
                      <td>
                        <Link href={`/contracts/${c.id}`} className="rowlink">{c.vendor}</Link>
                        <div className="sub">
                          {c.product || c.category || ""} {c.product || c.category ? "· " : ""}
                          <SourceTag source={c.source} />
                        </div>
                      </td>
                      <td className="num">{money(c.annual_cost, c.currency)}</td>
                      <td className="num hide-sm">{prettyDate(c.renewal_date)}</td>
                      <td>
                        <div className="num">{prettyDate(c.cancel_by)}</div>
                        <UrgencyBadge c={c} />
                      </td>
                      <td className="hide-sm">{c.owner_name || <span className="muted">Not set</span>}</td>
                      <td><DecisionChip c={c} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="row" style={{ justifyContent: "space-between", marginTop: 16 }}>
          <small>
            Red: under 3 weeks to cancel. Amber: under 2 months. Cancel-by date = renewal date minus notice period.
          </small>
          <form action={resetDemoAction}>
            <ConfirmButton
              className="btn btn-small"
              label="Reset demo data"
              message="Delete every contract and restore the 3 examples?"
            />
          </form>
        </div>
      </main>
    </>
  );
}
