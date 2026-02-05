import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ==========================================
// REQUEST ID MIDDLEWARE
// ==========================================
// Generates or propagates request IDs for tracing
// requests through the system.

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Middleware to handle request ID propagation
 */
export function middleware(request: NextRequest) {
  // Get existing request ID from header or generate new one
  const existingRequestId = request.headers.get("x-request-id");
  const requestId = existingRequestId ?? generateRequestId();

  // Clone the request headers and add/update request ID
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  // Create response with request ID header
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Also set the request ID on the response headers for clients
  response.headers.set("x-request-id", requestId);

  return response;
}

/**
 * Configure which paths the middleware runs on
 */
export const config = {
  matcher: [
    // Match all API routes
    "/api/:path*",
  ],
};
