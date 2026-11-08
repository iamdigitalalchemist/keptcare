// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// The ITN route with the database and PayFast's network checks replaced by
// stand-ins. The authenticity checks (signature, IP, postback) are covered in
// payfast.test.ts; here they always pass so the tests exercise what the route
// does with an authentic notification.

interface OrgRow {
  id: string;
  payfast_token: string | null;
  subscription_tier: "starter" | "growth" | "pro";
  pending_tier: "starter" | "growth" | "pro" | null;
  subscription_active: boolean;
  subscription_period_end: string | null;
  trial_ends_at: string | null;
}

const db = vi.hoisted(() => ({
  org: null as unknown as OrgRow,
  // What the route's initial SELECT sees, when it should differ from the row
  // the later UPDATE hits (simulates a concurrent ITN in between).
  readSnapshot: null as Partial<OrgRow> | null,
  paymentIds: new Set<string>(),
  payments: [] as Record<string, unknown>[],
  updates: [] as Record<string, unknown>[],
}));

const admin = vi.hoisted(() => {
  const from = (table: string) => {
    const filters: Array<(row: Record<string, unknown>) => boolean> = [];
    let updateValues: Record<string, unknown> | null = null;
    const builder = {
      select: () => builder,
      eq: (col: string, val: unknown) => {
        filters.push((row) => row[col] === val);
        return builder;
      },
      is: (col: string, val: unknown) => {
        filters.push((row) => row[col] === val);
        return builder;
      },
      maybeSingle: async () => {
        if (table === "payfast_payments") {
          return { data: db.payments.find((p) => filters.every((f) => f(p))) ?? null, error: null };
        }
        const row = { ...db.org, ...db.readSnapshot } as unknown as Record<string, unknown>;
        return { data: filters.every((f) => f(row)) ? row : null, error: null };
      },
      insert: async (row: Record<string, unknown>) => {
        const id = row.pf_payment_id as string | null;
        if (id && db.paymentIds.has(id)) return { error: { code: "23505" } };
        if (id) db.paymentIds.add(id);
        db.payments.push(row);
        return { error: null };
      },
      update: (values: Record<string, unknown>) => {
        updateValues = values;
        return builder;
      },
      then: (resolve: (r: unknown) => void) => {
        if (table !== "organisations" || !updateValues) return resolve({ data: null, error: null });
        const row = db.org as unknown as Record<string, unknown>;
        const matched = filters.every((f) => f(row));
        if (matched) {
          Object.assign(row, updateValues);
          db.updates.push(updateValues);
        }
        resolve({ data: matched ? [{ id: row.id }] : [], error: null });
      },
    };
    return builder;
  };
  return { from, rpc: vi.fn(async () => ({ error: null })) };
});

const gateway = vi.hoisted(() => ({
  cancelSubscription: vi.fn(async () => true),
  setSubscriptionNextRun: vi.fn(async () => true),
}));

vi.mock("@/integrations/supabase/admin", () => ({ supabaseAdmin: admin }));
vi.mock("@/lib/payfast-api", () => gateway);
vi.mock("@/lib/payfast", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/payfast")>()),
  validSignature: () => true,
  validSourceIp: async () => true,
  validServerConfirmation: async () => true,
}));

import { POST } from "../../app/api/payfast/notify/route";

const ORG_ID = "org-1";
const DAY = 24 * 60 * 60 * 1000;

function itn(fields: Record<string, string>) {
  const body = new URLSearchParams({ custom_str1: ORG_ID, custom_str2: "starter", ...fields });
  return POST(
    new Request("https://www.kept-care.co.za/api/payfast/notify", {
      method: "POST",
      headers: { "x-forwarded-for": "197.97.145.144" },
      body: body.toString(),
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  db.readSnapshot = null;
  db.paymentIds.clear();
  db.payments = [];
  db.updates = [];
  db.org = {
    id: ORG_ID,
    payfast_token: null,
    subscription_tier: "starter",
    pending_tier: null,
    subscription_active: false,
    subscription_period_end: null,
    trial_ends_at: new Date(Date.now() + 14 * DAY).toISOString(),
  };
});

describe("PayFast ITN", () => {
  it("activates a Starter trial on the R0 setup and anchors the first charge to the trial end", async () => {
    const res = await itn({ pf_payment_id: "1", payment_status: "COMPLETE", token: "tok-A", amount_gross: "0.00" });

    expect(res.status).toBe(200);
    expect(db.org.payfast_token).toBe("tok-A");
    expect(db.org.subscription_active).toBe(true);
    expect(db.org.subscription_period_end).toBe(db.org.trial_ends_at);
    expect(gateway.setSubscriptionNextRun).toHaveBeenCalledWith("tok-A", db.org.trial_ends_at!.slice(0, 10));
    expect(gateway.cancelSubscription).not.toHaveBeenCalled();
  });

  it("applies a pending downgrade on renewal and pauses excess automations", async () => {
    const periodEnd = new Date(Date.now() + DAY);
    Object.assign(db.org, {
      payfast_token: "tok-A",
      subscription_tier: "growth",
      pending_tier: "starter",
      subscription_active: true,
      subscription_period_end: periodEnd.toISOString(),
      trial_ends_at: null,
    });

    await itn({ pf_payment_id: "2", payment_status: "COMPLETE", token: "tok-A", custom_str2: "growth", amount_gross: "3500.00" });

    expect(db.org.subscription_tier).toBe("starter");
    expect(db.org.pending_tier).toBeNull();
    const expectedEnd = new Date(periodEnd);
    expectedEnd.setMonth(expectedEnd.getMonth() + 1);
    expect(db.org.subscription_period_end).toBe(expectedEnd.toISOString());
    expect(admin.rpc).toHaveBeenCalledWith("pause_excess_automations", { _organisation_id: ORG_ID, _new_tier: "starter" });
  });

  it("rejects a renewal whose amount doesn't match the scheduled tier", async () => {
    Object.assign(db.org, { payfast_token: "tok-A", subscription_tier: "growth", subscription_active: true, trial_ends_at: null });

    await itn({ pf_payment_id: "3", payment_status: "COMPLETE", token: "tok-A", amount_gross: "3500.00" });

    expect(db.updates).toEqual([]);
    expect(db.payments).toEqual([]);
  });

  it("ignores a cancellation for a superseded token (mid-trial upgrade)", async () => {
    db.org.payfast_token = "tok-NEW";

    await itn({ pf_payment_id: "4", payment_status: "CANCELLED", token: "tok-OLD" });

    expect(db.org.payfast_token).toBe("tok-NEW");
    expect(db.updates).toEqual([]);
    expect(gateway.cancelSubscription).not.toHaveBeenCalled();
    expect(db.payments).toHaveLength(1);
  });

  it("clears the token when the current subscription is cancelled", async () => {
    Object.assign(db.org, { payfast_token: "tok-A", subscription_active: true });

    await itn({ pf_payment_id: "5", payment_status: "CANCELLED", token: "tok-A" });

    expect(db.org.payfast_token).toBeNull();
    expect(db.org.subscription_active).toBe(true);
  });

  it("cancels a duplicate subscription whose R0 setup arrives after another was saved (two tabs)", async () => {
    db.org.payfast_token = "tok-A";

    await itn({ pf_payment_id: "6", payment_status: "COMPLETE", token: "tok-B", amount_gross: "0.00" });

    expect(gateway.cancelSubscription).toHaveBeenCalledWith("tok-B");
    expect(db.org.payfast_token).toBe("tok-A");
    expect(db.updates).toEqual([]);
  });

  it("cancels the losing subscription when two creation ITNs race", async () => {
    // Both ITNs read an empty token; the other one saved tok-A first.
    db.org.payfast_token = "tok-A";
    db.readSnapshot = { payfast_token: null };

    await itn({ pf_payment_id: "7", payment_status: "COMPLETE", token: "tok-B", amount_gross: "0.00" });

    expect(db.org.payfast_token).toBe("tok-A");
    expect(gateway.cancelSubscription).toHaveBeenCalledWith("tok-B");
    expect(gateway.setSubscriptionNextRun).not.toHaveBeenCalled();
  });

  it("handles a retried ITN only once, without logging it as a bad amount", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const fields = { pf_payment_id: "8", payment_status: "COMPLETE", token: "tok-A", amount_gross: "0.00" };
    await itn(fields);
    await itn(fields);

    expect(errors).not.toHaveBeenCalled();
    expect(db.updates).toHaveLength(1);
    expect(gateway.setSubscriptionNextRun).toHaveBeenCalledTimes(1);
  });
});
