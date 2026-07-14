import { describe, it, expect } from "vitest";
import { buildSignature, validSignature, validAmount, PLAN_PRICES_ZAR } from "./payfast";

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
    expect(validAmount(PLAN_PRICES_ZAR.growth.toFixed(2), "growth")).toBe(true);
    expect(validAmount(PLAN_PRICES_ZAR.pro, "pro")).toBe(true);
  });

  it("rejects a mismatched amount", () => {
    expect(validAmount("1.00", "growth")).toBe(false);
  });

  it("rejects the non-paid starter tier", () => {
    expect(validAmount("0.00", "starter")).toBe(false);
  });

  it("rejects a non-numeric amount", () => {
    expect(validAmount("abc", "pro")).toBe(false);
  });
});
