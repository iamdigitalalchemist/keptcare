import { describe, it, expect } from "vitest";
import { formatDate } from "./utils";

describe("formatDate", () => {
  it("formats a valid date as dd/mm/yyyy (UTC)", () => {
    expect(formatDate("1990-07-21")).toBe("21/07/1990");
  });

  it("returns a dash for empty or invalid values instead of throwing", () => {
    expect(formatDate("")).toBe("—");
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate("not a date")).toBe("—");
  });
});
