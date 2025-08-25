import { vi } from 'vitest';

// Mock performance if not available
if (typeof global.performance === 'undefined') {
  global.performance = {
    now: vi.fn(() => Date.now()),
  } as any;
}

// Ensure document.contains is available
if (typeof global.document !== 'undefined' && !global.document.contains) {
  global.document.contains = vi.fn(() => true);
}