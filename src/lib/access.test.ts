import { describe, it, expect } from "vitest";
import { canSendSms, hasAccess, hasPaidAccess, isTrialActive, PERIOD_END_GRACE_MS, type BillingState } from "./access";

const NOW = Date.parse("2026-10-12T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const iso = (ms: number) => new Date(ms).toISOString();

const paid = (over: Partial<BillingState> = {}): BillingState => ({
  subscription_tier: "growth",
  subscription_active: true,
  subscription_period_end: iso(NOW + 10 * DAY),
  trial_ends_at: iso(NOW - 30 * DAY),
  status: "active",
  ...over,
});

describe("hasPaidAccess", () => {
  it("is true inside the paid period", () => {
    expect(hasPaidAccess(paid(), NOW)).toBe(true);
  });

  it("allows the 3-day grace after period end, then lapses", () => {
    expect(hasPaidAccess(paid({ subscription_period_end: iso(NOW - PERIOD_END_GRACE_MS + 1000) }), NOW)).toBe(true);
    expect(hasPaidAccess(paid({ subscription_period_end: iso(NOW - PERIOD_END_GRACE_MS - 1000) }), NOW)).toBe(false);
  });

  it("treats a NULL period end as never paid", () => {
    expect(hasPaidAccess(paid({ subscription_period_end: null }), NOW)).toBe(false);
  });

  it("requires subscription_active", () => {
    expect(hasPaidAccess(paid({ subscription_active: false }), NOW)).toBe(false);
  });
});

describe("hasAccess", () => {
  it("is carried by the trial when unpaid", () => {
    const trial = paid({ subscription_active: false, subscription_period_end: null, trial_ends_at: iso(NOW + DAY) });
    expect(isTrialActive(trial, NOW)).toBe(true);
    expect(hasAccess(trial, NOW)).toBe(true);
  });
});

describe("canSendSms", () => {
  it("allows paid Growth and Pro", () => {
    expect(canSendSms(paid(), NOW)).toBe(true);
    expect(canSendSms(paid({ subscription_tier: "pro" }), NOW)).toBe(true);
  });

  it("allows a Growth org that paid in full during its first 14 days", () => {
    // trial_ends_at is still in the future, but Growth never has a free trial.
    expect(canSendSms(paid({ trial_ends_at: iso(NOW + 5 * DAY) }), NOW)).toBe(true);
  });

  it("blocks Starter, even when paid", () => {
    expect(canSendSms(paid({ subscription_tier: "starter" }), NOW)).toBe(false);
  });

  it("blocks the Starter trial (R0 card setup: active, period end = trial end)", () => {
    const trial = paid({
      subscription_tier: "starter",
      subscription_period_end: iso(NOW + 5 * DAY),
      trial_ends_at: iso(NOW + 5 * DAY),
    });
    expect(canSendSms(trial, NOW)).toBe(false);
  });

  it("blocks unpaid orgs on an SMS tier (e.g. tier set but never charged)", () => {
    expect(canSendSms(paid({ subscription_period_end: null, trial_ends_at: iso(NOW + DAY) }), NOW)).toBe(false);
  });

  it("blocks suspended organisations and lapsed subscriptions", () => {
    expect(canSendSms(paid({ status: "suspended" }), NOW)).toBe(false);
    expect(canSendSms(paid({ subscription_period_end: iso(NOW - 10 * DAY) }), NOW)).toBe(false);
  });
});
