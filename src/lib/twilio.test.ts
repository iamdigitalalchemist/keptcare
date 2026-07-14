import { describe, it, expect } from "vitest";
import {
  normalizePhone,
  renderTemplate,
  mapTwilioStatus,
  validTwilioSignature,
} from "./twilio";

describe("normalizePhone", () => {
  it("converts a local SA number to E.164", () => {
    expect(normalizePhone("082 123 4567")).toBe("+27821234567");
  });

  it("strips formatting from an already-international number", () => {
    expect(normalizePhone("+27 (82) 123-4567")).toBe("+27821234567");
  });

  it("converts a 00 international prefix", () => {
    expect(normalizePhone("0027821234567")).toBe("+27821234567");
  });

  it("adds a + when the dial code is present but unprefixed", () => {
    expect(normalizePhone("27821234567")).toBe("+27821234567");
  });

  it("respects a custom default dial code", () => {
    expect(normalizePhone("07700 900123", "+44")).toBe("+447700900123");
  });

  it("rejects empty and non-dialable input", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("   ")).toBeNull();
    expect(normalizePhone("12")).toBeNull();
  });
});

describe("renderTemplate", () => {
  it("substitutes known variables", () => {
    expect(
      renderTemplate("Hi {{patient_name}}, see you at {{practice_name}}!", {
        patient_name: "Thabo Mokoena",
        practice_name: "KeptCare Dental",
      }),
    ).toBe("Hi Thabo Mokoena, see you at KeptCare Dental!");
  });

  it("tolerates whitespace inside braces", () => {
    expect(renderTemplate("Hi {{ first_name }}", { first_name: "Ana" })).toBe("Hi Ana");
  });

  it("leaves unknown placeholders intact", () => {
    expect(renderTemplate("Hi {{unknown}}", {})).toBe("Hi {{unknown}}");
  });
});

describe("mapTwilioStatus", () => {
  it("maps in-flight statuses to sent", () => {
    for (const s of ["accepted", "scheduled", "queued", "sending", "sent"]) {
      expect(mapTwilioStatus(s)).toBe("sent");
    }
  });

  it("maps terminal statuses", () => {
    expect(mapTwilioStatus("delivered")).toBe("delivered");
    expect(mapTwilioStatus("read")).toBe("delivered");
    expect(mapTwilioStatus("undelivered")).toBe("failed");
    expect(mapTwilioStatus("failed")).toBe("failed");
    expect(mapTwilioStatus("canceled")).toBe("failed");
  });

  it("returns null for unknown statuses", () => {
    expect(mapTwilioStatus("something-new")).toBeNull();
  });
});

describe("validTwilioSignature", () => {
  // Reference vector from Twilio's request-validation docs
  // (https://www.twilio.com/docs/usage/security#validating-requests).
  const URL = "https://mycompany.com/myapp.php?foo=1&bar=2";
  const PARAMS = {
    CallSid: "CA1234567890ABCDE",
    Caller: "+12349013030",
    Digits: "1234",
    From: "+12349013030",
    To: "+18005551212",
  };
  const TOKEN = "12345";
  const SIGNATURE = "0/KCTR6DLpKmkAf8muzZqo1nDgQ=";

  it("accepts the documented reference signature", () => {
    expect(validTwilioSignature(TOKEN, URL, PARAMS, SIGNATURE)).toBe(true);
  });

  it("rejects a tampered payload", () => {
    expect(
      validTwilioSignature(TOKEN, URL, { ...PARAMS, Digits: "9999" }, SIGNATURE),
    ).toBe(false);
  });

  it("rejects a wrong token, URL, or missing signature", () => {
    expect(validTwilioSignature("wrong", URL, PARAMS, SIGNATURE)).toBe(false);
    expect(validTwilioSignature(TOKEN, "https://other.example/", PARAMS, SIGNATURE)).toBe(false);
    expect(validTwilioSignature(TOKEN, URL, PARAMS, null)).toBe(false);
  });
});
