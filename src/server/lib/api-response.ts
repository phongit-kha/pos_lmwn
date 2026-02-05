import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/server/types";

/**
 * Standard API success response
 */
export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

/**
 * Standard API error response
 */
export function errorResponse(
  message: string,
  status = 500,
  code?: string,
  details?: unknown
) {
  const error: { message: string; code?: string; details?: unknown } = {
    message,
    code,
  };

  if (details) {
    error.details = details;
  }

  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status }
  );
}

/**
 * Handle errors and return appropriate response
 */
export function handleError(error: unknown) {
  console.error("API Error:", error);

  if (error instanceof ZodError) {
    return errorResponse(
      "Validation error",
      400,
      "VALIDATION_ERROR",
      error.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      }))
    );
  }

  if (error instanceof AppError) {
    return errorResponse(error.message, error.statusCode, error.code);
  }

  if (error instanceof Error) {
    return errorResponse(
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : error.message,
      500,
      "INTERNAL_ERROR"
    );
  }

  return errorResponse("An unexpected error occurred", 500, "UNKNOWN_ERROR");
}

/**
 * Parse JSON body safely
 */
export async function parseJsonBody<T>(request: Request): Promise<T> {
  try {
    return await request.json() as T;
  } catch {
    throw new AppError(400, "Invalid JSON body", "INVALID_JSON");
  }
}
