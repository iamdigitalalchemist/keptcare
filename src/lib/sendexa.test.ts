import crypto from "crypto";
import { describe, it, expect } from "vitest";
import { mapSendexaStatus, textToHtml, validSendexaSignature } from "./sendexa";

describe("validSendexaSignature", () => {
  const secret = "whsec_test";
  const body = '{"event":"sms.delivered","data":{"messageId":"MSG-1"}}';
  const hex = crypto.createHmac("sha256", secret).update(body).digest("hex");

  it("accepts the sha256= form and a bare hex digest", () => {
    expect(validSendexaSignature(secret, body, `sha256=${hex}`)).toBe(true);
    expect(validSendexaSignature(secret, body, hex)).toBe(true);
  });

  it("rejects tampered body, wrong secret, or missing header", () => {
    expect(validSendexaSignature(secret, body + " ", `sha256=${hex}`)).toBe(false);
    expect(validSendexaSignature("other", body, `sha256=${hex}`)).toBe(false);
    expect(validSendexaSignature(secret, body, null)).toBe(false);
    expect(validSendexaSignature(secret, body, "sha256=short")).toBe(false);
  });
});

describe("textToHtml", () => {
  it("escapes markup and keeps line breaks", () => {
    expect(textToHtml('Hi <b>"Ana"</b> & co\nBye')).toBe(
      "<p>Hi &lt;b&gt;&quot;Ana&quot;&lt;/b&gt; &amp; co<br>Bye</p>",
    );
  });
});

describe("mapSendexaStatus", () => {
  it("maps event names and status values", () => {
    expect(mapSendexaStatus("sms.delivered")).toBe("delivered");
    expect(mapSendexaStatus("DELIVERED")).toBe("delivered");
    expect(mapSendexaStatus("OPENED")).toBe("delivered");
    expect(mapSendexaStatus("sms.failed")).toBe("failed");
    expect(mapSendexaStatus("BOUNCED")).toBe("failed");
    expect(mapSendexaStatus("expired")).toBe("failed");
    expect(mapSendexaStatus("sms.sent")).toBeNull();
    expect(mapSendexaStatus("")).toBeNull();
  });
});
