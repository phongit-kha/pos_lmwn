import { beforeEach, vi } from "vitest";

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Global test utilities
export const createMockPrismaClient = () => ({
  product: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  order: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    aggregate: vi.fn(),
  },
  orderItem: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    aggregate: vi.fn(),
  },
  orderLog: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
});
