import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import {
  addContract, updateContract, listContracts, getContract, totals, money, prettyDate, urgencyText,
  DECISION_LABEL, type Contract,
} from "@/lib/contracts";
import { envBaseUrl } from "@/lib/site";

// The "plug" between Claude and Renewal Radar.
// Claude reads the contract and decides what to send. This file only checks and saves data. No AI here.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const decision = z.enum(["pending", "keep", "cancel", "renegotiate"]);

function line(c: Contract) {
  const parts = [
    `#${c.id} ${c.vendor}${c.product ? ` (${c.product})` : ""}`,
    `${money(c.annual_cost, c.currency)}/year`,
    `renews ${prettyDate(c.renewal_date)}`,
    `cancel by ${prettyDate(c.cancel_by)} (${urgencyText(c)})`,
    `decision: ${DECISION_LABEL[c.decision]}`,
    `owner: ${c.owner_name || "not set"}`,
  ];
  if (c.unused_seats) parts.push(`${c.unused_seats} unused seats ≈ ${money(c.unused_seat_cost, c.currency)}/year`);
  if (c.savings) parts.push(`savings ${money(c.savings, c.currency)}/year`);
  return parts.join(" · ");
}

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
const fail = (e: unknown) => ({
  content: [{ type: "text" as const, text: `Renewal Radar could not do that: ${e instanceof Error ? e.message : String(e)}` }],
  isError: true,
});

const contractFields = {
  product: z.string().optional().describe("Plan or product name, e.g. 'Team plan'"),
  category: z.string().optional().describe("Short category, e.g. 'Design', 'Sales & CRM', 'Office lease'"),
  annual_cost: z.coerce.number().min(0).optional()
    .describe("Total cost per year, before tax, in the contract's currency. Convert monthly prices to yearly (x12)."),
  currency: z.string().length(3).optional().describe("ISO currency code, default INR"),
  billing_cycle: z.string().optional().describe("e.g. Annual, Monthly, Quarterly"),
  start_date: date.optional().describe("When the current term started, YYYY-MM-DD"),
  notice_days: z.coerce.number().int().min(0).optional()
    .describe("Days of written notice needed before the renewal date to cancel or change. Default 30 if the contract says nothing."),
  auto_renew: z.boolean().optional().describe("True if the contract renews automatically unless cancelled"),
  seats: z.coerce.number().int().min(0).optional().describe("Number of seats or licences bought"),
  seats_used: z.coerce.number().int().min(0).optional().describe("Seats actually in use, only if the user says so"),
  owner_name: z.string().optional().describe("Person responsible for deciding about this contract"),
  owner_email: z.string().email().optional().describe("Owner's email for reminders"),
  key_terms: z.string().max(600).optional()
    .describe("One or two sentences on terms that matter at renewal: price increases, seat reduction rules, termination."),
  notes: z.string().max(1000).optional(),
};

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "add_contract",
      {
        title: "Add a contract to Renewal Radar",
        description:
          "Save a software, vendor or service contract into the user's Renewal Radar, so it can track the last day to cancel and remind the owner. " +
          "When the user shares a contract, invoice or order form, read it and extract the vendor, yearly cost, renewal date (the date the next term starts), " +
          "notice period in days and whether it auto-renews. If the renewal date is not written, work it out from the start date and term. " +
          "If you cannot find the renewal date or cost, ask the user instead of guessing. Renewal Radar works out the cancel-by date itself.",
        inputSchema: z.object({
          vendor: z.string().min(1).describe("Company you pay, e.g. 'PixelBoard'"),
          renewal_date: date.describe("Date the next term starts if not cancelled, YYYY-MM-DD"),
          ...contractFields,
        }),
      },
      async (args) => {
        try {
          const c = await addContract(args, "Claude", "claude");
          return text(
            `Saved to Renewal Radar.\n${line(c)}\n` +
              `Renewal Radar will remind the owner on the 30, 7 and 1 days before ${prettyDate(c.cancel_by)}.\n` +
              `Open it: ${envBaseUrl()}/contracts/${c.id}`
          );
        } catch (e) {
          return fail(e);
        }
      }
    );

    server.registerTool(
      "list_contracts",
      {
        title: "List contracts in Renewal Radar",
        description:
          "List the user's tracked contracts with renewal dates, cancel-by dates, days left, owners, decisions and savings. " +
          "Use this to answer questions like 'what do I need to act on this month?' or 'how much could we save?'. " +
          "The data includes any edits people made in the Renewal Radar app.",
        inputSchema: z.object({
          filter: z.enum(["all", "action_needed"]).optional()
            .describe("'action_needed' = no decision yet and cancel-by date within `within_days`. Default 'all'."),
          within_days: z.coerce.number().int().min(1).max(730).optional().describe("Window for action_needed, default 30"),
        }),
      },
      async ({ filter = "all", within_days = 30 }) => {
        try {
          const all = await listContracts();
          const list =
            filter === "action_needed"
              ? all.filter((c) => c.decision === "pending" && c.days_left >= 0 && c.days_left <= within_days)
              : all;
          const t = totals(all);
          const header =
            `Renewal Radar: ${t.count} contracts, ${money(t.yearlySpend)} a year in total. ` +
            `Savings secured so far: ${money(t.savings)}. Unused seats cost about ${money(t.unusedSeatCost)} a year.`;
          const body = list.length ? list.map(line).join("\n") : "No contracts match.";
          return text(`${header}\n\n${body}\n\nDashboard: ${envBaseUrl()}`);
        } catch (e) {
          return fail(e);
        }
      }
    );

    server.registerTool(
      "update_contract",
      {
        title: "Update a contract in Renewal Radar",
        description:
          "Change a tracked contract: fix extracted details, set the owner, record seats in use, or record a decision " +
          "(keep, cancel, renegotiate with a target yearly price). Use list_contracts first to find the contract id.",
        inputSchema: z.object({
          id: z.coerce.number().int().describe("Contract id from list_contracts"),
          vendor: z.string().optional(),
          renewal_date: date.optional(),
          decision: decision.optional(),
          target_annual_cost: z.coerce.number().min(0).optional()
            .describe("For 'renegotiate': the yearly price you are aiming for"),
          ...contractFields,
        }),
      },
      async ({ id, ...changes }) => {
        try {
          const before = await getContract(id);
          if (!before) return fail(new Error(`No contract with id ${id}. Use list_contracts to see ids.`));
          const c = await updateContract(id, changes, "Claude");
          return text(`Updated.\n${line(c)}\nOpen it: ${envBaseUrl()}/contracts/${c.id}`);
        } catch (e) {
          return fail(e);
        }
      }
    );
  },
  { serverInfo: { name: "renewal-radar", version: "1.0.0" } }
);

export { handler as GET, handler as POST, handler as DELETE };
