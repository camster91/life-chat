import { describe, expect, it } from "vitest";
import { foundationHealth } from "./health";

describe("foundationHealth", () => {
  it("reports local readiness without claiming external dependencies", () => {
    expect(foundationHealth()).toEqual({ status: "ok", service: "life-chat-web", dependencies: { database: "not-configured", identity: "not-configured", ai: "not-configured" } });
  });
});
