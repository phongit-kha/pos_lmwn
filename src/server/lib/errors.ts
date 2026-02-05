// ==========================================
// CENTRALIZED ERROR SYSTEM
// ==========================================
// Benefits:
// 1. Consistency - same messages across the app
// 2. Localization-ready - easy to add i18n later
// 3. Type-safe - catch typos at compile time
// 4. Reusable - use existing messages for new features

// ==========================================
// Error Codes - Standardized
// ==========================================

export const ErrorCode = {
  // Client Errors (4xx)
  VALIDATION_ERROR: "VALIDATION_ERROR", // 400 - Invalid input
  INVALID_JSON: "INVALID_JSON", // 400 - Malformed JSON body
  INVALID_STATE: "INVALID_STATE", // 400 - Resource in wrong state
  UNAUTHORIZED: "UNAUTHORIZED", // 401 - Not authenticated
  FORBIDDEN: "FORBIDDEN", // 403 - Not authorized
  NOT_FOUND: "NOT_FOUND", // 404 - Resource not found
  CONFLICT: "CONFLICT", // 409 - Resource conflict
  RATE_LIMITED: "RATE_LIMITED", // 429 - Too many requests

  // Server Errors (5xx)
  INTERNAL_ERROR: "INTERNAL_ERROR", // 500 - Unexpected error
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE", // 503 - Database down, etc.
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

// HTTP Status mapping for error codes
export const ErrorStatusMap: Record<ErrorCodeType, number> = {
  VALIDATION_ERROR: 400,
  INVALID_JSON: 400,
  INVALID_STATE: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// ==========================================
// Centralized Error Messages
// ==========================================

export const ErrorMessage = {
  // ==========================================
  // Generic / Common
  // ==========================================
  GENERIC: {
    INTERNAL_ERROR: "An unexpected error occurred. Please try again.",
    SERVICE_UNAVAILABLE:
      "Service is temporarily unavailable. Please try again later.",
    INVALID_JSON: "Invalid JSON format in request body.",
    UNAUTHORIZED: "Authentication required. Please log in.",
    FORBIDDEN: "You do not have permission to perform this action.",
    RATE_LIMITED: "Too many requests. Please wait before trying again.",
  },

  // ==========================================
  // Validation - Field Constraints
  // ==========================================
  VALIDATION: {
    REQUIRED: (field: string) => `${field} is required.`,
    MIN_VALUE: (field: string, min: number) =>
      `${field} must be at least ${min}.`,
    MAX_VALUE: (field: string, max: number) =>
      `${field} must be at most ${max}.`,
    MIN_LENGTH: (field: string, min: number) =>
      `${field} must be at least ${min} characters.`,
    MAX_LENGTH: (field: string, max: number) =>
      `${field} must be at most ${max} characters.`,
    INVALID_FORMAT: (field: string) => `${field} has invalid format.`,
    INVALID_TYPE: (field: string, expected: string) =>
      `${field} must be a ${expected}.`,
    INVALID_ENUM: (field: string, allowed: string[]) =>
      `${field} must be one of: ${allowed.join(", ")}.`,
  },

  // ==========================================
  // Resource - Not Found / Already Exists
  // ==========================================
  RESOURCE: {
    NOT_FOUND: (resource: string, id?: string) =>
      id ? `${resource} with ID '${id}' not found.` : `${resource} not found.`,
    ALREADY_EXISTS: (resource: string, field: string, value: string) =>
      `${resource} with ${field} '${value}' already exists.`,
    DELETED: (resource: string) => `${resource} has been deleted.`,
    INACTIVE: (resource: string) => `${resource} is inactive.`,
  },

  // ==========================================
  // Order - State & Operations
  // ==========================================
  ORDER: {
    // State transitions
    INVALID_STATE_TRANSITION: (current: string, target: string) =>
      `Cannot change order status from ${current} to ${target}.`,
    ALREADY_IN_STATE: (state: string) => `Order is already ${state}.`,
    MUST_BE_IN_STATE: (required: string, current: string) =>
      `Order must be ${required} but is currently ${current}.`,

    // Operations
    CANNOT_MODIFY_PAID: "Cannot modify a paid order.",
    CANNOT_MODIFY_CANCELLED: "Cannot modify a cancelled order.",
    CANNOT_CANCEL_PAID: "Cannot cancel a paid order.",
    CANNOT_CHECKOUT_EMPTY: "Cannot checkout an order with no items.",
    CANNOT_CHECKOUT_UNCONFIRMED:
      "Cannot checkout: order must be confirmed first.",

    // Table
    TABLE_HAS_ACTIVE_ORDER: (tableNumber: number) =>
      `Table ${tableNumber} already has an active order.`,
    INVALID_TABLE_NUMBER: "Table number must be between 1 and 999.",

    // Items
    NO_ITEMS: "At least one item is required.",
    ITEMS_EMPTY: "Cannot create order with no items.",
  },

  // ==========================================
  // Order Items
  // ==========================================
  ORDER_ITEM: {
    NOT_FOUND: (itemId: string) => `Order item '${itemId}' not found.`,
    ALREADY_VOIDED: "Item has already been voided.",
    CANNOT_VOID_IN_STATE: (state: string) =>
      `Cannot void items when order is ${state}.`,
    VOID_REASON_REQUIRED: "Void reason is required.",
    QUANTITY_MIN: "Quantity must be at least 1.",
    QUANTITY_MAX: (max: number) => `Quantity cannot exceed ${max}.`,
  },

  // ==========================================
  // Products
  // ==========================================
  PRODUCT: {
    NOT_FOUND: (productId: string) => `Product '${productId}' not found.`,
    INACTIVE: (productName: string) =>
      `Product '${productName}' is no longer available.`,
    OUT_OF_STOCK: (productName: string) =>
      `Product '${productName}' is out of stock.`,
    INVALID_PRICE: "Product price must be greater than 0.",
  },

  // ==========================================
  // Discounts
  // ==========================================
  DISCOUNT: {
    INVALID_TYPE: "Discount type must be 'PERCENT' or 'FIXED'.",
    PERCENT_RANGE: "Percentage discount must be between 0 and 50.",
    EXCEEDS_SUBTOTAL: "Fixed discount cannot exceed subtotal.",
    INVALID_CODE: (code: string) =>
      `Discount code '${code}' is invalid or expired.`,
    ALREADY_APPLIED: "A discount has already been applied to this order.",
    MIN_ORDER_REQUIRED: (min: string) =>
      `Minimum order of ${min} required for this discount.`,
  },

  // ==========================================
  // Pagination
  // ==========================================
  PAGINATION: {
    INVALID_PAGE: "Page number must be at least 1.",
    INVALID_LIMIT: "Limit must be between 1 and 100.",
    PAGE_OUT_OF_RANGE: (page: number, maxPage: number) =>
      `Page ${page} does not exist. Maximum page is ${maxPage}.`,
  },

  // ==========================================
  // Reports
  // ==========================================
  REPORT: {
    INVALID_DATE_RANGE: "Start date must be before end date.",
    DATE_RANGE_TOO_LARGE: (maxDays: number) =>
      `Date range cannot exceed ${maxDays} days.`,
    NO_DATA: "No data available for the selected period.",
  },
} as const;

// ==========================================
// AppError Class
// ==========================================

export class AppError extends Error {
  public readonly code: ErrorCodeType;
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly field?: string;

  constructor(
    code: ErrorCodeType,
    message: string,
    options?: {
      statusCode?: number;
      details?: unknown;
      field?: string;
    }
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = options?.statusCode ?? ErrorStatusMap[code];
    this.details = options?.details;
    this.field = options?.field;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace?.(this, AppError);
  }
}

// ==========================================
// Convenience Factory Functions
// ==========================================

export const Errors = {
  /**
   * Resource not found error (404)
   */
  notFound: (resource: string, id?: string) =>
    new AppError(ErrorCode.NOT_FOUND, ErrorMessage.RESOURCE.NOT_FOUND(resource, id)),

  /**
   * Invalid state error (400)
   */
  invalidState: (message: string, details?: unknown) =>
    new AppError(ErrorCode.INVALID_STATE, message, { details }),

  /**
   * Validation error (400)
   */
  validation: (message: string, field?: string, details?: unknown) =>
    new AppError(ErrorCode.VALIDATION_ERROR, message, { details, field }),

  /**
   * Conflict error (409)
   */
  conflict: (message: string, details?: unknown) =>
    new AppError(ErrorCode.CONFLICT, message, { details }),

  /**
   * Internal server error (500)
   */
  internal: (message = ErrorMessage.GENERIC.INTERNAL_ERROR) =>
    new AppError(ErrorCode.INTERNAL_ERROR, message),

  /**
   * Unauthorized error (401)
   */
  unauthorized: (message = ErrorMessage.GENERIC.UNAUTHORIZED) =>
    new AppError(ErrorCode.UNAUTHORIZED, message),

  /**
   * Forbidden error (403)
   */
  forbidden: (message = ErrorMessage.GENERIC.FORBIDDEN) =>
    new AppError(ErrorCode.FORBIDDEN, message),

  /**
   * Rate limited error (429)
   */
  rateLimited: (retryAfter?: number) =>
    new AppError(ErrorCode.RATE_LIMITED, ErrorMessage.GENERIC.RATE_LIMITED, {
      details: retryAfter ? { retryAfter } : undefined,
    }),

  /**
   * Invalid JSON error (400)
   */
  invalidJson: () =>
    new AppError(ErrorCode.INVALID_JSON, ErrorMessage.GENERIC.INVALID_JSON),
};

// ==========================================
// Legacy Error Classes (for backward compatibility)
// ==========================================

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(ErrorCode.VALIDATION_ERROR, message, { field });
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(ErrorCode.NOT_FOUND, ErrorMessage.RESOURCE.NOT_FOUND(resource, id));
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(ErrorCode.CONFLICT, message);
    this.name = "ConflictError";
  }
}

export class InvalidStateError extends AppError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.INVALID_STATE, message, { details });
    this.name = "InvalidStateError";
  }
}
