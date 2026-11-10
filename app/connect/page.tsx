import Link from "next/link";
import { baseUrl, isLoggedIn } from "@/lib/site";
import { Header } from "@/components/ui";
import { CopyButton } from "@/components/client";

export const dynamic = "force-dynamic";

export default async function ConnectPage() {
  const mcpUrl = `${await baseUrl()}/api/mcp`;
  return (
    <>
      <Header loggedIn={await isLoggedIn()} />
      <main className="page page-narrow stack">
        <div>
          <h1>Connect Renewal Radar to Claude</h1>
          <p className="muted">Takes about a minute. Works on Claude Free, Pro, Max, Team and Enterprise.</p>
        </div>

        <div className="card">
          <h2>Your connector link</h2>
          <div className="row" style={{ marginTop: 10 }}>
            <code>{mcpUrl}</code>
            <CopyButton value={mcpUrl} label="Copy" />
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: 14 }}>Steps</h2>
          <ol className="steps">
            <li>Open <b>claude.ai</b> (or the Claude desktop app) and go to <b>Customize → Connectors</b>.</li>
            <li>Click <b>+</b>, then <b>Add custom connector</b>.</li>
            <li>Name it <b>Renewal Radar</b>, paste the link above as the server URL, and click <b>Add</b>. No sign-in is needed.</li>
            <li>In a new chat, make sure Renewal Radar is switched on in the tools menu.</li>
            <li>
              Attach a contract (try the <a href="/sample-contract-pixelboard.pdf" download>sample PixelBoard contract</a>) and type:{" "}
              <b>&ldquo;Add this contract to Renewal Radar.&rdquo;</b>
            </li>
            <li>Open the <Link href="/">dashboard</Link>. The contract appears within a few seconds.</li>
          </ol>
        </div>

        <div className="card">
          <h2>More things to ask Claude</h2>
          <ul className="list-plain" style={{ marginTop: 8 }}>
            <li>&ldquo;Which contracts do I need to act on this month, and how much could I save?&rdquo;</li>
            <li>&ldquo;We only use 25 PixelBoard seats. Update it and mark it for renegotiation at ₹4 lakh.&rdquo;</li>
            <li>&ldquo;Make Priya (priya@example.com) the owner of the PixelBoard contract.&rdquo;</li>
          </ul>
        </div>

        <p className="muted" style={{ fontSize: 13 }}>
          Renewal Radar has no AI inside. Your own Claude reads the contract; Renewal Radar stores it, works out the
          cancel-by date, and reminds the owner.
        </p>
      </main>
    </>
  );
}
