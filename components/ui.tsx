import Link from "next/link";
import { type Contract, DECISION_LABEL, urgencyText, DECISIONS } from "@/lib/contracts";
import { logout } from "@/app/actions";

export function Header({ loggedIn }: { loggedIn: boolean }) {
  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <RadarMark />
        <span>Renewal Radar</span>
      </Link>
      <nav>
        <Link href="/connect">Connect Claude</Link>
        {loggedIn && (
          <form action={logout}>
            <button className="linklike" type="submit">Log out</button>
          </form>
        )}
      </nav>
    </header>
  );
}

export function RadarMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
      <circle cx="13" cy="13" r="11.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="13" cy="13" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
      <path d="M13 13 L22 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="18.5" cy="16.5" r="2" fill="var(--red)" />
    </svg>
  );
}

export function Flash({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <div className="flash">{msg}</div>;
}

export function UrgencyBadge({ c }: { c: Contract }) {
  return <span className={`badge badge-${c.urgency}`}>{urgencyText(c)}</span>;
}

export function DecisionChip({ c }: { c: Contract }) {
  return <span className={`chip chip-${c.decision}`}>{DECISION_LABEL[c.decision]}</span>;
}

export function SourceTag({ source }: { source: string }) {
  const label = source === "claude" ? "Added by Claude" : source === "example" ? "Example" : "Added by you";
  return <span className={`source source-${source}`}>{label}</span>;
}

type Field = { name: string; label: string; type?: string; hint?: string; wide?: boolean; placeholder?: string };

const FIELDS: { title: string; fields: Field[] }[] = [
  {
    title: "What it is",
    fields: [
      { name: "vendor", label: "Vendor", placeholder: "PixelBoard" },
      { name: "product", label: "Plan / product", placeholder: "Team plan" },
      { name: "category", label: "Category", placeholder: "Design" },
      { name: "billing_cycle", label: "Billing", placeholder: "Annual" },
    ],
  },
  {
    title: "Money and dates",
    fields: [
      { name: "annual_cost", label: "Yearly cost", type: "number", placeholder: "600000" },
      { name: "currency", label: "Currency", placeholder: "INR" },
      { name: "start_date", label: "Current term started", type: "date" },
      { name: "renewal_date", label: "Renewal date", type: "date", hint: "When the next term starts" },
      { name: "notice_days", label: "Notice period (days)", type: "number", hint: "How early you must cancel" },
    ],
  },
  {
    title: "Seats and people",
    fields: [
      { name: "seats", label: "Seats bought", type: "number" },
      { name: "seats_used", label: "Seats actually used", type: "number" },
      { name: "owner_name", label: "Owner", placeholder: "Priya (Design lead)" },
      { name: "owner_email", label: "Owner email", type: "email" },
    ],
  },
];

export function ContractForm({
  c, action, submitLabel,
}: {
  c?: Contract | null;
  action: (fd: FormData) => Promise<void>;
  submitLabel: string;
}) {
  const val = (k: string) => {
    const v = c ? (c as Record<string, unknown>)[k] : undefined;
    return v === null || v === undefined ? "" : String(v);
  };
  return (
    <form action={action} className="card form">
      {FIELDS.map((group) => (
        <fieldset key={group.title}>
          <legend>{group.title}</legend>
          <div className="grid">
            {group.fields.map((f) => (
              <label key={f.name}>
                <span>{f.label}</span>
                <input
                  name={f.name}
                  type={f.type || "text"}
                  defaultValue={val(f.name) || (f.name === "currency" ? "INR" : f.name === "notice_days" && !c ? "30" : "")}
                  placeholder={f.placeholder}
                  required={f.name === "vendor" || f.name === "renewal_date"}
                  step={f.type === "number" ? "any" : undefined}
                />
                {f.hint && <small>{f.hint}</small>}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <fieldset>
        <legend>Decision</legend>
        <div className="grid">
          <label>
            <span>Decision</span>
            <select name="decision" defaultValue={c?.decision || "pending"}>
              {DECISIONS.map((d) => (
                <option key={d} value={d}>{DECISION_LABEL[d]}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Target yearly price</span>
            <input name="target_annual_cost" type="number" step="any" defaultValue={val("target_annual_cost")} />
            <small>If renegotiating</small>
          </label>
          <label className="check">
            <input name="auto_renew" type="checkbox" defaultChecked={c ? c.auto_renew : true} />
            <span>Renews automatically</span>
          </label>
        </div>
        <label className="wide">
          <span>Key terms</span>
          <textarea name="key_terms" rows={2} defaultValue={val("key_terms")} />
        </label>
        <label className="wide">
          <span>Notes</span>
          <textarea name="notes" rows={3} defaultValue={val("notes")} />
        </label>
      </fieldset>
      <div className="form-actions">
        <button className="btn btn-primary" type="submit">{submitLabel}</button>
      </div>
    </form>
  );
}
