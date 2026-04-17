import '@testing-library/jest-dom'
import { vi } from 'vitest'

// localStorage is not reliably implemented in all jsdom configurations.
// Provide a simple in-memory stub so any component that reads/writes
// localStorage does not throw in tests.
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string): string | null => store[key] ?? null,
    setItem: (key: string, value: string): void => {
      store[key] = value
    },
    removeItem: (key: string): void => {
      delete store[key]
    },
    clear: (): void => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
})

// matchMedia is not implemented in jsdom. Provide a default stub so components
// that call useReducedMotion() (or window.matchMedia directly) don't throw.
// Individual tests can override with vi.stubGlobal('matchMedia', ...) as needed.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
