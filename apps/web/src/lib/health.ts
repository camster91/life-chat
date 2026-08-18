export type FoundationHealth = {
  status: "ok";
  service: "life-chat-web";
  dependencies: { database: "not-configured"; identity: "not-configured"; ai: "not-configured" };
};

export function foundationHealth(): FoundationHealth {
  return { status: "ok", service: "life-chat-web", dependencies: { database: "not-configured", identity: "not-configured", ai: "not-configured" } };
}
