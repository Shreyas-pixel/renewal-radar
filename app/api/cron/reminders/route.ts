import { listContracts, logEvent } from "@/lib/contracts";
import { emailConfigured, envBaseUrl, sendReminderEmail } from "@/lib/site";

// Runs once a day on Vercel (see vercel.json). Emails owners 30, 7 and 1 days before the cancel-by date.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!emailConfigured()) return Response.json({ sent: 0, note: "RESEND_API_KEY not set" });

  const due = (await listContracts()).filter(
    (c) => c.decision === "pending" && c.owner_email && [30, 7, 1].includes(c.days_left)
  );
  let sent = 0;
  for (const c of due) {
    const r = await sendReminderEmail(c, envBaseUrl());
    if (r.ok) {
      sent++;
      await logEvent(c.id, "Renewal Radar", `Emailed reminder to ${c.owner_email} (${c.days_left} days left)`);
    }
  }
  return Response.json({ sent });
}
