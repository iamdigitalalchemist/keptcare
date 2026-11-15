import { describe, it, expect } from "vitest";
import { limitViolation, TIER_LIMITS, limitLabel } from "./limits";

describe("limitViolation", () => {
  it("allows inserts below the cap", () => {
    expect(limitViolation("patients", 199, "starter", null)).toBeNull();
    expect(limitViolation("automations", 9, "growth", null)).toBeNull();
  });

  it("blocks inserts at the current tier's cap", () => {
    expect(limitViolation("patients", 200, "starter", null)).toMatch(/Plan limit reached/);
    expect(limitViolation("seats", 3, "growth", null)).toMatch(/3 team seats/);
  });

  it("never blocks pro (unlimited)", () => {
    expect(limitViolation("patients", 99999, "pro", null)).toBeNull();
    expect(limitViolation("automations", 99999, "pro", null)).toBeNull();
    expect(limitViolation("seats", 99999, "pro", null)).toBeNull();
  });

  it("freezes additions while a pending downgrade's cap is reached", () => {
    // 1,000 patients on Pro, pending downgrade to Growth (cap 1,000).
    expect(limitViolation("patients", 1000, "pro", "growth")).toMatch(/Plan change pending/);
    // Under the pending cap is still fine.
    expect(limitViolation("patients", 999, "pro", "growth")).toBeNull();
  });

  it("ignores a pending tier that is not stricter", () => {
    expect(limitViolation("patients", 500, "growth", "pro")).toBeNull();
  });
});

describe("TIER_LIMITS", () => {
  it("matches the numbers in the tier_limits DB migration", () => {
    expect(TIER_LIMITS.starter).toMatchObject({ patients: 200, automations: 2, seats: 1 });
    expect(TIER_LIMITS.growth).toMatchObject({ patients: 1000, automations: 10, seats: 3 });
  });
});

describe("limitLabel", () => {
  it("formats finite limits and infinity", () => {
    // en-ZA may group thousands with a comma or a space depending on ICU.
    expect(["1,000", "1 000", "1 000"]).toContain(limitLabel(1000));
    expect(limitLabel(Infinity)).toBe("Unlimited");
  });
});
