import crypto from "crypto";
import { describe, it, expect } from "vitest";
import { mapZernioEvent, textToHtml, validZernioSignature } from "./zernio";

describe("validZernioSignature", () => {
  const secret = "whsec_test";
  const body = '{"event":"message.delivered","message":{"id":"abc"}}';
  const sig = crypto.createHmac("sha256", secret).update(body).digest("hex");

  it("accepts a correct signature", () => {
    expect(validZernioSignature(secret, body, sig)).toBe(true);
  });

  it("rejects tampered body, wrong secret, or missing header", () => {
    expect(validZernioSignature(secret, body + " ", sig)).toBe(false);
    expect(validZernioSignature("other", body, sig)).toBe(false);
    expect(validZernioSignature(secret, body, null)).toBe(false);
    expect(validZernioSignature(secret, body, "short")).toBe(false);
  });
});

describe("textToHtml", () => {
  it("escapes markup and keeps line breaks", () => {
    expect(textToHtml('Hi <b>"Ana"</b> & co\nBye')).toBe(
      "<p>Hi &lt;b&gt;&quot;Ana&quot;&lt;/b&gt; &amp; co<br>Bye</p>",
    );
  });
});

describe("mapZernioEvent", () => {
  it("maps delivery events", () => {
    expect(mapZernioEvent("message.delivered")).toBe("delivered");
    expect(mapZernioEvent("message.read")).toBe("delivered");
    expect(mapZernioEvent("message.failed")).toBe("failed");
    expect(mapZernioEvent("message.received")).toBeNull();
  });
});
