import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

// Authentication must read its server-only configuration when a request is
// handled. It is intentionally not statically collected during a credential-
// free build.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return toNextJsHandler(getAuth()).GET(request);
}

export async function POST(request: Request) {
  return toNextJsHandler(getAuth()).POST(request);
}
