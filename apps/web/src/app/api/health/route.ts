import { foundationHealth } from "@/lib/health";

export function GET() {
  return Response.json(foundationHealth());
}
