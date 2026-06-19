import { afterEach, describe, expect, it, vi } from "vitest";
import { storeLoginCredentials } from "@/lib/credential-storage";

describe("storeLoginCredentials", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("stores trimmed credentials when the API is available", async () => {
    const store = vi.fn().mockResolvedValue(undefined);
    class MockPasswordCredential {
      id: string;
      password: string;
      name: string;

      constructor(init: { id: string; password: string; name: string }) {
        this.id = init.id;
        this.password = init.password;
        this.name = init.name;
      }
    }

    vi.stubGlobal("PasswordCredential", MockPasswordCredential);
    vi.stubGlobal("navigator", { credentials: { store } });
    vi.stubGlobal("window", { isSecureContext: true });

    await storeLoginCredentials("  patient@example.com  ", "secret-pass");

    expect(store).toHaveBeenCalledOnce();
    const stored = store.mock.calls[0][0] as MockPasswordCredential;
    expect(stored.id).toBe("patient@example.com");
    expect(stored.password).toBe("secret-pass");
  });

  it("no-ops when credentials API is unavailable", async () => {
    vi.stubGlobal("navigator", {});
    vi.stubGlobal("window", { isSecureContext: true });

    await expect(
      storeLoginCredentials("patient@example.com", "secret-pass"),
    ).resolves.toBeUndefined();
  });

  it("no-ops on empty email or password", async () => {
    const store = vi.fn();
    vi.stubGlobal("PasswordCredential", class {});
    vi.stubGlobal("navigator", { credentials: { store } });
    vi.stubGlobal("window", { isSecureContext: true });

    await storeLoginCredentials("   ", "secret-pass");
    await storeLoginCredentials("patient@example.com", "");

    expect(store).not.toHaveBeenCalled();
  });
});
