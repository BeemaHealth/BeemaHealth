import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  WAITLIST_DISPLAY_COUNT_FALLBACK,
  WAITLIST_DISPLAY_COUNT_STORAGE_KEY,
  getWaitlistDisplayCount,
  getWaitlistDisplayCountSeed,
  incrementWaitlistDisplayCount,
  readStoredWaitlistDisplayCount,
} from "@/lib/waitlist-count";

type LocalStorageMock = {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
};

function mockLocalStorage(initial: Record<string, string> = {}): {
  store: Map<string, string>;
  localStorageMock: LocalStorageMock;
} {
  const store = new Map<string, string>(Object.entries(initial));
  const localStorageMock: LocalStorageMock = {
    getItem: vi.fn((key: string) =>
      store.has(key) ? (store.get(key) as string) : null,
    ),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, String(value));
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
  };
  // Vitest uses environment: "node" — stub a minimal window for storage APIs.
  vi.stubGlobal("window", { localStorage: localStorageMock });
  return { store, localStorageMock };
}

describe("waitlist-count", () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses the fallback constant as the seed when env is unset", () => {
    expect(getWaitlistDisplayCountSeed()).toBe(WAITLIST_DISPLAY_COUNT_FALLBACK);
    expect(getWaitlistDisplayCount()).toBe(WAITLIST_DISPLAY_COUNT_FALLBACK);
  });

  it("reads VITE_WAITLIST_DISPLAY_COUNT as the seed when valid", () => {
    vi.stubEnv("VITE_WAITLIST_DISPLAY_COUNT", "240");
    expect(getWaitlistDisplayCountSeed()).toBe(240);
    expect(getWaitlistDisplayCount()).toBe(240);
  });

  it("ignores invalid env overrides for the seed", () => {
    vi.stubEnv("VITE_WAITLIST_DISPLAY_COUNT", "not-a-number");
    expect(getWaitlistDisplayCountSeed()).toBe(WAITLIST_DISPLAY_COUNT_FALLBACK);

    vi.stubEnv("VITE_WAITLIST_DISPLAY_COUNT", "-3");
    expect(getWaitlistDisplayCountSeed()).toBe(WAITLIST_DISPLAY_COUNT_FALLBACK);
  });

  it("returns max(seed, stored) when localStorage has a higher count", () => {
    mockLocalStorage({
      [WAITLIST_DISPLAY_COUNT_STORAGE_KEY]: "12",
    });
    expect(getWaitlistDisplayCount()).toBe(12);
  });

  it("keeps the seed floor when stored count is lower", () => {
    vi.stubEnv("VITE_WAITLIST_DISPLAY_COUNT", "50");
    mockLocalStorage({
      [WAITLIST_DISPLAY_COUNT_STORAGE_KEY]: "10",
    });
    expect(getWaitlistDisplayCount()).toBe(50);
  });

  it("ignores invalid stored values", () => {
    mockLocalStorage({
      [WAITLIST_DISPLAY_COUNT_STORAGE_KEY]: "abc",
    });
    expect(readStoredWaitlistDisplayCount()).toBeNull();
    expect(getWaitlistDisplayCount()).toBe(WAITLIST_DISPLAY_COUNT_FALLBACK);
  });

  it("increments and persists a number-only value on successful bump", () => {
    const { store, localStorageMock } = mockLocalStorage();
    const next = incrementWaitlistDisplayCount();
    expect(next).toBe(WAITLIST_DISPLAY_COUNT_FALLBACK + 1);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      WAITLIST_DISPLAY_COUNT_STORAGE_KEY,
      String(WAITLIST_DISPLAY_COUNT_FALLBACK + 1),
    );
    expect(store.get(WAITLIST_DISPLAY_COUNT_STORAGE_KEY)).toBe(
      String(WAITLIST_DISPLAY_COUNT_FALLBACK + 1),
    );
    expect(getWaitlistDisplayCount()).toBe(WAITLIST_DISPLAY_COUNT_FALLBACK + 1);
  });

  it("increments from the higher of seed and stored", () => {
    mockLocalStorage({
      [WAITLIST_DISPLAY_COUNT_STORAGE_KEY]: "7",
    });
    expect(incrementWaitlistDisplayCount()).toBe(8);
    expect(getWaitlistDisplayCount()).toBe(8);
  });

  it("never writes PHI keys or email/name values to storage", () => {
    const { store, localStorageMock } = mockLocalStorage();
    incrementWaitlistDisplayCount();
    const keys = [...store.keys()];
    expect(keys).toEqual([WAITLIST_DISPLAY_COUNT_STORAGE_KEY]);
    for (const value of store.values()) {
      expect(value).toMatch(/^\d+$/);
      expect(value).not.toMatch(/@/);
      expect(value).not.toMatch(/[A-Za-z]/);
    }
    for (const call of localStorageMock.setItem.mock.calls) {
      expect(call[0]).toBe(WAITLIST_DISPLAY_COUNT_STORAGE_KEY);
      expect(call[1]).toMatch(/^\d+$/);
    }
  });

  it("returns seed when localStorage throws (private mode)", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
      },
    });
    expect(readStoredWaitlistDisplayCount()).toBeNull();
    expect(getWaitlistDisplayCount()).toBe(WAITLIST_DISPLAY_COUNT_FALLBACK);
    expect(incrementWaitlistDisplayCount()).toBe(
      WAITLIST_DISPLAY_COUNT_FALLBACK + 1,
    );
  });

  it("is SSR-safe when window is missing", () => {
    vi.stubGlobal("window", undefined);
    expect(readStoredWaitlistDisplayCount()).toBeNull();
    expect(getWaitlistDisplayCount()).toBe(WAITLIST_DISPLAY_COUNT_FALLBACK);
    expect(incrementWaitlistDisplayCount()).toBe(
      WAITLIST_DISPLAY_COUNT_FALLBACK + 1,
    );
  });
});
