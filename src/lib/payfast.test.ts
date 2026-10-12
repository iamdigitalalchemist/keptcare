import { describe, it, expect } from "vitest";
import {
  buildSignature,
  buildApiSignature,
  itnParamString,
  validSignature,
  validAmount,
  PLAN_PRICES_ZAR,
  planPriceCents,
} from "./payfast";

// Fixed reference params used across signature tests. The expected hashes are
// computed from the exact encoding rules PayFast documents (spaces -> "+",
// uppercase percent-encoding, params in given order, MD5).
const REF_PARAMS = {
  merchant_id: "10000100",
  merchant_key: "46f0cd694581a",
  return_url: "https://example.com/return",
  cancel_url: "https://example.com/cancel",
  notify_url: "https://example.com/notify",
  amount: "79.00",
  item_name: "Growth plan",
};
describe("buildSignature", () => {
  it("produces a stable MD5 without a passphrase", () => {
    expect(buildSignature(REF_PARAMS)).toBe("f6fdf755fa6b34fc9881a98f438d69dd");
  });

  it("changes when a passphrase is appended", () => {
    expect(buildSignature(REF_PARAMS, "jt7NOE43FZPn")).toBe(
      "28bc55734dd50207e411446a995d7c2d",
    );
  });

  it("ignores empty/undefined values", () => {
    const withEmpty = { ...REF_PARAMS, email_address: "", cell_number: undefined };
    expect(buildSignature(withEmpty)).toBe(buildSignature(REF_PARAMS));
  });

  it("excludes the signature field itself", () => {
    const withSig = { ...REF_PARAMS, signature: "deadbeef" };
    expect(buildSignature(withSig)).toBe(buildSignature(REF_PARAMS));
  });
});

// A real KeptCare subscription checkout. The expected hash was computed
// independently (PHP urlencode semantics, PayFast's documented attribute
// order), not from buildSignature itself.
const CHECKOUT_FIELDS = {
  merchant_id: "10000100",
  merchant_key: "46f0cd694581a",
  return_url: "https://example.com/pricing/success",
  cancel_url: "https://example.com/pricing/cancelled",
  notify_url: "https://example.com/api/payfast/notify",
  m_payment_id: "org-1:starter",
  amount: "0.00",
  item_name: "KeptCare Starter plan",
  custom_str1: "org-1",
  custom_str2: "starter",
  subscription_type: "1",
  recurring_amount: "3500.00",
  frequency: "3",
  cycles: "0",
};

describe("buildSignature (checkout)", () => {
  it("matches PayFast's expected signature for a subscription checkout", () => {
    expect(buildSignature(CHECKOUT_FIELDS, "jt7NOE43FZPn")).toBe("efdc2b31ff9b70fd938731d76ea3f4cf");
  });

  it("signs in PayFast's documented order, not object order", () => {
    // Regression: custom_str* used to be posted (and signed) after the
    // subscription fields, which PayFast rejects as a signature mismatch.
    const { custom_str1, custom_str2, ...rest } = CHECKOUT_FIELDS;
    const reordered = { ...rest, custom_str1, custom_str2 };
    expect(buildSignature(reordered, "jt7NOE43FZPn")).toBe("efdc2b31ff9b70fd938731d76ea3f4cf");
  });

  it("encodes like PHP urlencode, including ! ' ( ) * ~", () => {
    expect(buildSignature({ ...REF_PARAMS, item_name: "Dr O'Neil ~ (Growth)*!" })).toBe(
      "e280025a0d39c0203899cca2b543bad5",
    );
  });
});

// ITN payloads arrive with blank fields that PayFast DOES sign. Expected hash
// computed independently from PayFast's ITN rules.
const ITN_FIELDS: Record<string, string> = {
  m_payment_id: "org-1:starter",
  pf_payment_id: "1089250",
  payment_status: "COMPLETE",
  item_name: "KeptCare Starter plan",
  item_description: "",
  amount_gross: "0.00",
  amount_fee: "0.00",
  amount_net: "0.00",
  custom_str1: "org-1",
  custom_str2: "starter",
  custom_str3: "",
  custom_str4: "",
  custom_str5: "",
  custom_int1: "",
  name_first: "Test",
  name_last: "User",
  email_address: "test@example.com",
  merchant_id: "10000100",
  token: "dc0521d3-55fe-269b-fa00-b647310d760f",
  billing_date: "2026-10-12",
};

describe("validSignature (ITN)", () => {
  it("accepts a genuine ITN that includes blank fields", () => {
    const signed = { ...ITN_FIELDS, signature: "fbcd2cce22db00433ae84ed57979cdac" };
    expect(validSignature(signed, "jt7NOE43FZPn")).toBe(true);
  });

  it("rejects it with the wrong passphrase", () => {
    const signed = { ...ITN_FIELDS, signature: "fbcd2cce22db00433ae84ed57979cdac" };
    expect(validSignature(signed, "wrong")).toBe(false);
  });

  it("builds the postback body from the same fields, blanks included", () => {
    expect(itnParamString({ a: "x y", b: "", signature: "s", c: "ignored" })).toBe("a=x+y&b=");
  });
});

describe("buildApiSignature", () => {
  it("signs headers + body + passphrase sorted by key", () => {
    expect(
      buildApiSignature(
        { "merchant-id": "10000100", version: "v1", timestamp: "2026-10-12T08:30:00+0000", run_date: "2026-10-26" },
        "jt7NOE43FZPn",
      ),
    ).toBe("6149d39bbca7e4ade89c4b72a1becfaf");
  });
});

describe("validSignature", () => {
  it("accepts a correctly signed payload", () => {
    const signature = buildSignature(REF_PARAMS, "jt7NOE43FZPn");
    expect(validSignature({ ...REF_PARAMS, signature }, "jt7NOE43FZPn")).toBe(true);
  });

  it("rejects a tampered payload", () => {
    const signature = buildSignature(REF_PARAMS, "jt7NOE43FZPn");
    const tampered = { ...REF_PARAMS, amount: "1.00", signature };
    expect(validSignature(tampered, "jt7NOE43FZPn")).toBe(false);
  });

  it("rejects when signature is missing", () => {
    expect(validSignature(REF_PARAMS as Record<string, string>, "x")).toBe(false);
  });
});

describe("validAmount", () => {
  it("accepts the exact plan price", () => {
    expect(validAmount(PLAN_PRICES_ZAR.starter.toFixed(2), PLAN_PRICES_ZAR.starter)).toBe(true);
    expect(validAmount(PLAN_PRICES_ZAR.growth, PLAN_PRICES_ZAR.growth)).toBe(true);
    expect(validAmount(PLAN_PRICES_ZAR.pro.toFixed(2), PLAN_PRICES_ZAR.pro)).toBe(true);
  });

  it("rejects a mismatched amount", () => {
    expect(validAmount("1.00", PLAN_PRICES_ZAR.growth)).toBe(false);
  });

  it("accepts R0.00 only for a trial setup", () => {
    expect(validAmount("0.00", PLAN_PRICES_ZAR.starter, { isTrialSetup: true })).toBe(true);
    expect(validAmount("0.00", PLAN_PRICES_ZAR.starter)).toBe(false);
  });

  it("rejects a non-numeric amount", () => {
    expect(validAmount("abc", PLAN_PRICES_ZAR.pro)).toBe(false);
  });
});

describe("planPriceCents", () => {
  it("converts ZAR prices to cents for the PayFast API", () => {
    expect(planPriceCents("starter")).toBe(350000);
    expect(planPriceCents("growth")).toBe(500000);
    expect(planPriceCents("pro")).toBe(700000);
  });
});
