import { NextResponse } from "next/server";
import { getApiDocs } from "@/server/lib/swagger";

/**
 * GET /api/docs
 * Returns the OpenAPI specification as JSON
 */
export async function GET() {
  const spec = getApiDocs();
  return NextResponse.json(spec);
}
