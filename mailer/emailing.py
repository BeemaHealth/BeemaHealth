"""Render and send campaign emails. PII is only used in memory."""

from __future__ import annotations

import re
import ssl
import smtplib
from datetime import datetime
from email.message import EmailMessage
from email.utils import formataddr, parseaddr
from html import escape as html_escape
from pathlib import Path
from typing import Any, Mapping, Sequence

from mailer.campaigns import CampaignStep, normalize_body, with_utm_content
from mailer.crypto import ConfigError, env_get
from mailer.richtext import sanitize_inline_html, strip_tags
from mailer.store import Patient

ROOT = Path(__file__).resolve().parent.parent
FROM_DISPLAY_NAME = "Beema Health"
LOGO_DIR = ROOT / "public"
# The full Beema Health lockup. JPEG is the canonical file; a PNG at the same
# stem is used first if present, so a send never breaks mid format switch.
LOGO_CANDIDATES = (("beema-lockup.png", "png"), ("beema-lockup.jpg", "jpeg"))
LOGO_PATH = LOGO_DIR / LOGO_CANDIDATES[0][0]
LOGO_CID = "beema-lockup"
LOGO_URL = f"cid:{LOGO_CID}"


def resolve_logo() -> tuple[Path, str] | tuple[None, None]:
    """Return (header lockup path, image subtype), or (None, None) if absent.

    A missing brand image must never abort a campaign send - callers skip the
    inline attachment and the header image when this returns (None, None).
    """
    for name, subtype in LOGO_CANDIDATES:
        candidate = LOGO_DIR / name
        if candidate.is_file():
            return candidate, subtype
    return None, None
BIMI_SVG_PATH = ROOT / "public" / "bimi" / "logo.svg"
BIMI_SVG_URL = "https://beemahealth.com/bimi/logo.svg"
BIMI_SELECTOR = "default"
BIMI_TXT_HOST = f"{BIMI_SELECTOR}._bimi.beemahealth.com"
BIMI_TXT_VALUE = f"v=BIMI1; l={BIMI_SVG_URL};"
SITE_URL = "https://beemahealth.com"
YAHOO_DOMAINS = frozenset(
    {
        "yahoo.com",
        "ymail.com",
        "rocketmail.com",
        "aol.com",
        "aim.com",
    }
)
PRIVACY_URL = f"{SITE_URL}/legal/privacy/"
TERMS_URL = f"{SITE_URL}/legal/terms/"
TELEHEALTH_CONSENT_URL = f"{SITE_URL}/legal/telehealth-consent/"
CONTACT_URL = f"{SITE_URL}/contact/"
SUPPORT_EMAIL = "support@beemahealth.com"
SUPPORT_PHONE_DISPLAY = "+1 303-351-4505"
SUPPORT_PHONE_HREF = "tel:+13033514505"
BUSINESS_ADDRESS = "2510 Summit Dr, Colorado Springs, CO 80909"
BRAND_YELLOW = "#E5B01A"
INK = "#1A1A1A"
MUTED = "#5C5C5C"
RULE = "#E6E6E6"
LINK_BLUE = "#1A73E8"
_BUTTON_TOKEN_RE = re.compile(r"^\[\[button:(\d+)\]\]$")
_BUTTON_TOKEN_SPLIT_RE = re.compile(r"(\[\[button:\d+\]\])")


def _body_segments(text: str):
    """Yield each paragraph, splitting a paragraph around any [[button:N]] token.

    The step editor is supposed to keep every token on its own line, but a
    button inserted mid-paragraph can leave one embedded in the surrounding
    text. Splitting here means the token still resolves to a real button
    instead of being mailed out literally.
    """
    for block in text.split("\n\n"):
        block = block.strip()
        if not block:
            continue
        for segment in _BUTTON_TOKEN_SPLIT_RE.split(block):
            segment = segment.strip()
            if segment:
                yield segment
FOOTER_TAGLINE = (
    "Weight-loss care guided by independently licensed clinicians, "
    "transparent pricing, and support for the long run."
)
DISCLAIMER = (
    "Beema Health is a telehealth platform that connects patients with "
    "independently licensed clinicians. Completing intake does not "
    "guarantee a prescription. Clinicians make all medical decisions "
    "independently. If you are experiencing a medical emergency, "
    "call 911. This platform does not provide emergency care."
)


def brand_from_header(raw: str) -> str:
    """Keep From as Beema Health <addr>. Display name drives Apple initials."""
    _name, addr = parseaddr((raw or "").strip())
    if not addr or "@" not in addr:
        addr = SUPPORT_EMAIL
    return formataddr((FROM_DISPLAY_NAME, addr))


def yahoo_recipient(address: str) -> bool:
    """True for Yahoo/AOL mailboxes.

    BIMI is still the Beema SVG, not Yahoo's logo.
    """
    domain = address.rsplit("@", 1)[-1].lower().strip()
    if domain in YAHOO_DOMAINS:
        return True
    return domain.endswith(".yahoo.com")


def _attach_inline(
    html_part: EmailMessage,
    path: Path,
    *,
    cid: str,
    subtype: str,
    filename: str,
) -> bool:
    """Attach `path` as an inline related image. Returns False (no raise) if the
    file is gone so a send is never blocked by a missing brand asset."""
    if not path.is_file():
        return False
    html_part.add_related(
        path.read_bytes(),
        maintype="image",
        subtype=subtype,
        cid=f"<{cid}>",
        disposition="inline",
        filename=filename,
    )
    related = html_part.get_payload()[-1]
    disposition = (related.get("Content-Disposition") or "").lower()
    if not disposition.startswith("inline"):
        if "Content-Disposition" in related:
            del related["Content-Disposition"]
        related["Content-Disposition"] = (
            f'inline; filename="{filename}"'
        )
    cid_header = related.get("Content-ID") or ""
    if cid_header != f"<{cid}>":
        if "Content-ID" in related:
            del related["Content-ID"]
        related["Content-ID"] = f"<{cid}>"
    return True


def fill(
    template: str,
    patient: Patient,
    extras: Mapping[str, str] | None = None,
) -> str:
    values = dict(extras or {})
    # Built-ins always win: first_name/interest/product/email come from the
    # recipient patient, support_email is always the Beema support inbox.
    values.update(
        {
            "first_name": patient.first_name,
            "interest": patient.interest,
            "product": patient.product,
            "email": patient.email,
            "support_email": SUPPORT_EMAIL,
        }
    )
    return normalize_body(template).format(**values)


def fill_html(
    template: str,
    patient: Patient,
    extras: Mapping[str, str] | None = None,
) -> str:
    """Like fill(), but placeholder values are HTML-escaped.

    The template itself may already contain safe inline tags (bold/italic/
    underline) from the step editor - those are left alone so `.format()`
    only ever touches the `{name}` placeholder tokens.
    """
    values = {
        name: html_escape(str(value)) for name, value in (extras or {}).items()
    }
    # Built-ins always win (see fill()).
    values.update(
        {
            "first_name": html_escape(patient.first_name),
            "interest": html_escape(patient.interest),
            "product": html_escape(patient.product),
            "email": html_escape(patient.email),
            "support_email": html_escape(SUPPORT_EMAIL),
        }
    )
    return normalize_body(template).format(**values)


def _render_button_html(button: Mapping[str, Any], resolved_url: str) -> str:
    align = button.get("align") or "center"
    bg = button.get("bg") or BRAND_YELLOW
    color = button.get("color") or INK
    label = html_escape(str(button.get("label") or ""))
    href = html_escape(resolved_url, quote=True)
    return f"""
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td align="{align}" style="padding:8px 0 16px 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td align="center" bgcolor="{bg}" style="border-radius:8px;">
                <a href="{href}" target="_blank"
                  style="display:inline-block;padding:14px 44px;
                  font-family:Arial,Helvetica,sans-serif;font-size:16px;
                  font-weight:bold;color:{color};text-decoration:none;">
                  {label}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>"""


def render_plain(
    patient: Patient,
    step: CampaignStep,
    cta_url: str,
    *,
    year: int,
    extras: Mapping[str, str] | None = None,
    show_header: bool = True,
    show_footer: bool = True,
) -> str:
    # Plain text has no logo to show/hide - show_header is accepted only for
    # symmetry with render_html so call sites can pass both flags uniformly.
    del show_header
    step_link = with_utm_content(step.cta_url or cta_url, step.id)
    greeting = strip_tags(fill(step.greeting, patient, extras))
    filled_body = fill(step.body, patient, extras)
    body_lines = []
    for part in _body_segments(filled_body):
        match = _BUTTON_TOKEN_RE.fullmatch(part)
        if match:
            index = int(match.group(1))
            if 0 <= index < len(step.buttons):
                button = step.buttons[index]
                href = str(button.get("url") or "").strip() or step_link
                body_lines.append(f"{button.get('label') or ''}: {href}")
            # A token with no matching button is dropped, not mailed literally.
            continue
        body_lines.append(strip_tags(part))
    body = "\n\n".join(body_lines)
    lines = [
        greeting,
        "",
        body,
    ]
    if step.closing:
        lines.extend(["", strip_tags(fill(step.closing, patient, extras))])
    if show_footer:
        lines.extend(
            [
                "",
                "Beema Health",
                FOOTER_TAGLINE,
                f"{SUPPORT_PHONE_DISPLAY} | {SUPPORT_EMAIL} | {CONTACT_URL}",
                f"Privacy Policy: {PRIVACY_URL}",
                f"Terms of Service: {TERMS_URL}",
                f"Telehealth Consent: {TELEHEALTH_CONSENT_URL}",
                "",
                DISCLAIMER,
                BUSINESS_ADDRESS,
                f"© {year} Beema Health. All rights reserved.",
                "",
                f"To unsubscribe, email {SUPPORT_EMAIL} with subject Unsubscribe.",
            ]
        )
    return "\n".join(lines)


def render_html(
    patient: Patient,
    step: CampaignStep,
    cta_url: str,
    *,
    year: int,
    extras: Mapping[str, str] | None = None,
    show_header: bool = True,
    show_footer: bool = True,
    show_logo: bool = True,
) -> str:
    # No always-on campaign CTA. A button with no url of its own rides the
    # campaign CTA link (or a per-step override), tagged utm_content=<step id>.
    step_link = with_utm_content(step.cta_url or cta_url, step.id)
    greeting_filled = sanitize_inline_html(fill_html(step.greeting, patient, extras))
    filled = fill_html(step.body, patient, extras)
    parts = []
    for part in _body_segments(filled):
        match = _BUTTON_TOKEN_RE.fullmatch(part)
        if match:
            index = int(match.group(1))
            if 0 <= index < len(step.buttons):
                button = step.buttons[index]
                href = str(button.get("url") or "").strip() or step_link
                parts.append(_render_button_html(button, href))
            # A token with no matching button is dropped, not mailed literally.
            continue
        safe = sanitize_inline_html(part).replace("\n", "<br>")
        safe = safe.replace(
            '<a href="', f'<a style="color:{LINK_BLUE};text-decoration:underline;" href="'
        )
        if safe.startswith(("<ul>", "<ol>")):
            parts.append(f'<div style="margin:0 0 16px 0;">{safe}</div>')
        else:
            parts.append(f'<p style="margin:0 0 16px 0;">{safe}</p>')
    body = "".join(parts)
    closing_html = ""
    if step.closing:
        closing_filled = sanitize_inline_html(
            fill_html(step.closing, patient, extras)
        )
        closing_html = f'<p style="margin:0 0 16px 0;">{closing_filled}</p>'
    tagline = html_escape(FOOTER_TAGLINE)
    disclaimer = html_escape(DISCLAIMER)
    address = html_escape(BUSINESS_ADDRESS)
    phone = html_escape(SUPPORT_PHONE_DISPLAY)
    header_row = (
        f"""
        <tr>
          <td bgcolor="#ffffff" style="padding:0;background:#ffffff;">
            <img src="{LOGO_URL}" alt="Beema Health" width="600"
              style="display:block;border:0;outline:none;
              text-decoration:none;width:100%;max-width:600px;height:auto;">
          </td>
        </tr>"""
        if show_header and show_logo
        else ""
    )
    footer_row = (
        f"""
        <tr>
          <td style="border-top:1px solid {RULE};padding:28px 16px 24px 16px;
            text-align:center;font-size:13px;line-height:1.6;color:{MUTED};">
            <p style="margin:0 0 8px 0;font-weight:bold;color:{INK};">Beema Health</p>
            <p style="margin:0 0 16px 0;">{tagline}</p>
            <p style="margin:0 0 8px 0;">
              <a href="{SUPPORT_PHONE_HREF}" style="color:{LINK_BLUE};text-decoration:none;">{phone}</a>
              &nbsp;|&nbsp;
              <a href="mailto:{SUPPORT_EMAIL}" style="color:{LINK_BLUE};">{SUPPORT_EMAIL}</a>
              &nbsp;|&nbsp;
              <a href="{CONTACT_URL}" style="color:{LINK_BLUE};">Contact Us</a>
            </p>
            <p style="margin:0 0 16px 0;">
              <a href="{PRIVACY_URL}" style="color:{LINK_BLUE};">Privacy Policy</a>
              &nbsp;·&nbsp;
              <a href="{TERMS_URL}" style="color:{LINK_BLUE};">Terms of Service</a>
              &nbsp;·&nbsp;
              <a href="{TELEHEALTH_CONSENT_URL}" style="color:{LINK_BLUE};">Telehealth Consent</a>
            </p>
            <p style="margin:0 0 16px 0;font-size:12px;">{disclaimer}</p>
            <p style="margin:0 0 4px 0;font-size:12px;">{address}</p>
            <p style="margin:0;font-size:12px;">© {year} Beema Health. All rights reserved.</p>
          </td>
        </tr>"""
        if show_footer
        else ""
    )
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Beema Health</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;color:{INK};">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"
  border="0" bgcolor="#ffffff" style="background:#ffffff;">
  <tr>
    <td align="center" style="padding:0;background:#ffffff;">
      <table role="presentation" width="600" cellspacing="0"
        cellpadding="0" border="0"
        style="width:100%;max-width:600px;font-family:Arial,Helvetica,sans-serif;">{header_row}
        <tr>
          <td style="padding:24px 16px 32px 16px;font-size:16px;line-height:1.6;color:{INK};">
            <p style="margin:0 0 16px 0;font-weight:bold;">{greeting_filled}</p>
            {body}{closing_html}
          </td>
        </tr>{footer_row}
      </table>
    </td>
  </tr>
</table>
</body>
</html>
"""


def smtp_settings() -> dict[str, str]:
    host = env_get("SMTP_HOST") or env_get("EMAIL_HOST") or "smtp.gmail.com"
    port = env_get("SMTP_PORT") or env_get("EMAIL_PORT") or "587"
    user = env_get("SMTP_USER") or env_get("EMAIL_HOST_USER") or SUPPORT_EMAIL
    password = (
        env_get("SMTP_PASSWORD") or env_get("EMAIL_HOST_PASSWORD")
    ).replace(" ", "")
    from_header = brand_from_header(
        env_get("SMTP_FROM")
        or env_get("DEFAULT_FROM_EMAIL")
        or SUPPORT_EMAIL
    )
    if not password:
        raise ConfigError(
            "SMTP_PASSWORD is missing. Add SMTP_PASSWORD or "
            "EMAIL_HOST_PASSWORD."
        )
    if not port.isdigit():
        raise ConfigError("SMTP_PORT must be a number.")
    return {
        "host": host,
        "port": port,
        "user": user,
        "password": password,
        "from_header": from_header,
    }


def build_message(
    patient: Patient,
    step: CampaignStep,
    envelope_to: str,
    cta_url: str,
    *,
    from_header: str,
    year: int,
    extras: Mapping[str, str] | None = None,
    show_header: bool = True,
    show_footer: bool = True,
) -> EmailMessage:
    logo_path, logo_subtype = resolve_logo()
    html = render_html(
        patient,
        step,
        cta_url,
        year=year,
        extras=extras,
        show_header=show_header,
        show_footer=show_footer,
        show_logo=logo_path is not None,
    )
    text = render_plain(
        patient,
        step,
        cta_url,
        year=year,
        extras=extras,
        show_header=show_header,
        show_footer=show_footer,
    )
    message = EmailMessage()
    message["Subject"] = fill(step.subject, patient, extras)
    # Apple Mail "BH" is initials of this display name, not the CID image.
    # Yahoo Mail reads BIMI on the From domain. Same Beema mark for everyone.
    message["From"] = brand_from_header(from_header)
    message["To"] = envelope_to
    message["Reply-To"] = SUPPORT_EMAIL
    message["Organization"] = FROM_DISPLAY_NAME
    message["List-ID"] = (
        f"{FROM_DISPLAY_NAME} <campaigns.beemahealth.com>"
    )
    # BIMI-Selector header. Yahoo and others look up this selector in DNS.
    message["BIMI-Selector"] = f"v=BIMI1; s={BIMI_SELECTOR};"
    message["List-Unsubscribe"] = (
        f"<mailto:{SUPPORT_EMAIL}?subject=Unsubscribe>"
    )
    message.set_content(text)
    message.add_alternative(html, subtype="html")
    html_part = message.get_payload()[-1]
    if logo_path is not None:
        _attach_inline(
            html_part,
            logo_path,
            cid=LOGO_CID,
            subtype=logo_subtype,
            filename=logo_path.name,
        )
    return message


def send_messages(
    messages: Sequence[EmailMessage],
    settings: Mapping[str, str],
) -> None:
    context = ssl.create_default_context()
    with smtplib.SMTP(
        settings["host"], int(settings["port"]), timeout=30
    ) as client:
        client.ehlo()
        client.starttls(context=context)
        client.ehlo()
        client.login(settings["user"], settings["password"])
        for message in messages:
            client.send_message(message)
