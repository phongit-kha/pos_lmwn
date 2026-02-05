import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ZodError } from "zod";
import {
  AppError,
  ErrorCode,
  ErrorMessage,
  ErrorStatusMap,
  type ErrorCodeType,
} from "./errors";
import type { PaginationMeta } from "@/server/types";

// ==========================================
// API Response Contract - STRICT STANDARDS
// ==========================================
//
// SUCCESS Response Format:
// {
//   "success": true,
//   "data": T,
//   "meta": {
//     "requestId": string,
//     "timestamp": string,
//     "pagination"?: { page, limit, total, totalPages, hasNext, hasPrev }
//   }
// }
//
// ERROR Response Format:
// {
//   "success": false,
//   "error": {
//     "code": string,        // Machine-readable: "VALIDATION_ERROR", "NOT_FOUND", etc.
//     "message": string,     // Human-readable: "Order not found"
//     "details"?: unknown,   // Additional context (validation errors array, etc.)
//     "field"?: string       // For validation: which field failed
//   },
//   "meta": {
//     "requestId": string,
//     "timestamp": string
//   }
// }

// ==========================================
// Response Types
// ==========================================

export interface ApiMeta {
  requestId: string;
  timestamp: string;
  pagination?: PaginationMeta;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta: ApiMeta;
}

export interface ApiErrorDetail {
  code: ErrorCodeType;
  message: string;
  details?: unknown;
  field?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorDetail;
  meta: Pick<ApiMeta, "requestId" | "timestamp">;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ==========================================
// Request ID Helper
// ==========================================

/**
 * Get or generate request ID from request headers
 */
export function getRequestId(request: NextRequest | Request): string {
  const requestId = request.headers.get("x-request-id");
  return requestId ?? generateRequestId();
}

/**
 * Generate a new request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

// ==========================================
// Success Response
// ==========================================

/**
 * Standard API success response with metadata
 */
export function successResponse<T>(
  data: T,
  requestId: string,
  options?: {
    status?: number;
    pagination?: PaginationMeta;
  }
): NextResponse<ApiSuccessResponse<T>> {
  const response = NextResponse.json(
    {
      success: true as const,
      data,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        ...(options?.pagination && { pagination: options.pagination }),
      },
    },
    { status: options?.status ?? 200 }
  );

  response.headers.set("x-request-id", requestId);
  return response;
}

// ==========================================
// Error Response
// ==========================================

/**
 * Standard API error response with metadata
 */
export function errorResponse(
  code: ErrorCodeType,
  message: string,
  requestId: string,
  options?: {
    status?: number;
    details?: unknown;
    field?: string;
  }
): NextResponse<ApiErrorResponse> {
  const status = options?.status ?? ErrorStatusMap[code];

  const response = NextResponse.json(
    {
      success: false as const,
      error: {
        code,
        message,
        ...(options?.details !== undefined && { details: options.details }),
        ...(options?.field && { field: options.field }),
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  );

  response.headers.set("x-request-id", requestId);
  return response;
}

// ==========================================
// Error Handler
// ==========================================

/**
 * Handle errors and return appropriate response
 * Automatically extracts error details and formats response
 */
export function handleError(
  error: unknown,
  requestId: string
): NextResponse<ApiErrorResponse> {
  // Log error for debugging (in production, use structured logger)
  console.error("[API Error]", {
    requestId,
    error: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : undefined,
  });

  // Zod validation errors
  if (error instanceof ZodError) {
    const details = error.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));

    return errorResponse(
      ErrorCode.VALIDATION_ERROR,
      "Invalid request data",
      requestId,
      { details }
    );
  }

  // Our custom AppError
  if (error instanceof AppError) {
    return errorResponse(error.code, error.message, requestId, {
      status: error.statusCode,
      details: error.details,
      field: error.field,
    });
  }

  // Generic Error
  if (error instanceof Error) {
    const message =
      process.env.NODE_ENV === "production"
        ? ErrorMessage.GENERIC.INTERNAL_ERROR
        : error.message;

    return errorResponse(ErrorCode.INTERNAL_ERROR, message, requestId);
  }

  // Unknown error type
  return errorResponse(
    ErrorCode.INTERNAL_ERROR,
    ErrorMessage.GENERIC.INTERNAL_ERROR,
    requestId
  );
}

// ==========================================
// JSON Body Parser
// ==========================================

/**
 * Parse JSON body safely with proper error handling
 */
export async function parseJsonBody<T>(request: Request): Promise<T> {
  try {
    const body: unknown = await request.json();
    return body as T;
  } catch {
    throw new AppError(ErrorCode.INVALID_JSON, ErrorMessage.GENERIC.INVALID_JSON);
  }
}

// ==========================================
// Pagination Helper
// ==========================================

/**
 * Build pagination metadata from query results
 */
export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

// ==========================================
// Re-export error utilities
// ==========================================

export {
  AppError,
  ErrorCode,
  ErrorMessage,
  Errors,
  ValidationError,
  NotFoundError,
  ConflictError,
  InvalidStateError,
} from "./errors";
export type { ErrorCodeType } from "./errors";
