/**
 * Persist login credentials for browser save/autofill on SPA logins.
 *
 * Native password managers expect a real form POST + navigation. Our login uses
 * fetch + client routing, so we store via the Credential Management API after
 * a successful auth response.
 */

type PasswordCredentialInit = {
  id: string;
  password: string;
  name: string;
};

type PasswordCredentialConstructor = new (
  data: PasswordCredentialInit,
) => Credential;

function getPasswordCredentialConstructor():
  | PasswordCredentialConstructor
  | undefined {
  return (
    globalThis as typeof globalThis & {
      PasswordCredential?: PasswordCredentialConstructor;
    }
  ).PasswordCredential;
}

export async function storeLoginCredentials(
  email: string,
  password: string,
): Promise<void> {
  const PasswordCredentialCtor = getPasswordCredentialConstructor();
  if (
    typeof window === "undefined" ||
    !window.isSecureContext ||
    typeof navigator === "undefined" ||
    !navigator.credentials?.store ||
    !PasswordCredentialCtor
  ) {
    return;
  }

  const trimmedEmail = email.trim();
  if (!trimmedEmail || !password) return;

  try {
    const credential = new PasswordCredentialCtor({
      id: trimmedEmail,
      password,
      name: trimmedEmail,
    });
    await navigator.credentials.store(credential);
  } catch {
    // User declined, unsupported browser, or policy block — non-fatal.
  }
}
