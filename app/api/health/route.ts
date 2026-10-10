import { jsonResponse } from "@/lib/http";
import { isLocalDemoMode } from "@/lib/db/demo-store";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return jsonResponse({ status: "ok", mode: isLocalDemoMode() ? "local_demo" : "cloud_not_configured" });
}
