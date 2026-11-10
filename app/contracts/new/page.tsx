import Link from "next/link";
import { requireLogin } from "@/lib/site";
import { Header, Flash, ContractForm } from "@/components/ui";
import { createContractAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function NewContract({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  await requireLogin();
  const { msg } = await searchParams;
  return (
    <>
      <Header loggedIn />
      <main className="page page-narrow">
        <div className="page-head">
          <div>
            <Link href="/" className="muted" style={{ textDecoration: "none", fontSize: 14 }}>← All contracts</Link>
            <h1 style={{ marginTop: 8 }}>Add a contract</h1>
            <p>Faster way: attach the contract in Claude and say &ldquo;Add this contract to Renewal Radar.&rdquo;</p>
          </div>
        </div>
        <Flash msg={msg} />
        <ContractForm action={createContractAction} submitLabel="Save contract" />
      </main>
    </>
  );
}
