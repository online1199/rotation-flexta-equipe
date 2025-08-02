// Configuration des tests
import { expect, beforeAll, vi } from 'vitest';

// Mock du crypto.randomUUID pour les environnements qui ne le supportent pas
beforeAll(() => {
  if (!global.crypto) {
    global.crypto = {
      randomUUID: () => Math.random().toString(36).substring(2, 15),
    } as any;
  }
});

// Mock du localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  },
  writable: true,
});

// Mock du clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
  writable: true,
});