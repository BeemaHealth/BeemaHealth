from __future__ import annotations

import html as _html_stdlib

# Approximate hex values for email clients that don't support oklch.
# Derived from src/styles.css primary teal oklch(0.52 0.085 175).
_BRAND = "#2a7a72"
_BODY_BG = "#f3f6f5"
_CARD_BG = "#ffffff"
_HEADING = "#1f2e2b"
_TEXT = "#374744"
_MUTED = "#5a6b68"
_BORDER = "#dde8e5"
_BTN_TEXT = "#ffffff"

_TEMPLATE = """\
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{subject}</title>
</head>
<body style="margin:0;padding:0;background-color:{body_bg};font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="background-color:{body_bg}">
<tr><td align="center" style="padding:32px 16px">

<table role="presentation" width="580" cellpadding="0" cellspacing="0" border="0"
       style="max-width:580px;width:100%">

<!-- Brand header -->
<tr>
  <td style="background-color:{brand};padding:20px 32px;border-radius:12px 12px 0 0">
    <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px">Beema Health</p>
  </td>
</tr>

<!-- Content card -->
<tr>
  <td style="background-color:{card_bg};padding:32px;border-radius:0 0 12px 12px">

    <h1 style="margin:0 0 20px;font-size:20px;font-weight:700;color:{heading};line-height:1.3">{heading}</h1>

    {body_paragraphs}

    <!-- CTA button -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 20px">
    <tr>
      <td style="border-radius:8px;background-color:{brand}">
        <a href="{cta_url}"
           style="display:inline-block;padding:12px 26px;background-color:{brand};color:{btn_text};font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;line-height:1.4;mso-padding-alt:12px 26px">
          {cta_text}
        </a>
      </td>
    </tr>
    </table>

    <hr style="border:none;border-top:1px solid {border};margin:24px 0 20px">

    <p style="margin:0;font-size:12px;color:{muted};line-height:1.5">{footer}</p>

  </td>
</tr>

</table>
</td></tr>
</table>
</body>
</html>
"""

_FOOTER_DEFAULT = (
    "You are receiving this email because you have an Beema Health account. "
    "Notification preferences can be changed in Account settings on your dashboard."
)


def _paragraphs_to_html(text: str) -> str:
    blocks = [b.strip() for b in text.strip().split("\n\n") if b.strip()]
    parts = []
    for block in blocks:
        safe = _html_stdlib.escape(block).replace("\n", "<br>")
        parts.append(
            f'<p style="margin:0 0 14px;font-size:15px;color:{_TEXT};line-height:1.65">{safe}</p>'
        )
    return "\n    ".join(parts)


def render_notification_email(
    *,
    subject: str,
    heading: str,
    body_text: str,
    cta_url: str,
    cta_text: str = "Go to dashboard",
    footer: str = _FOOTER_DEFAULT,
) -> str:
    """Return a complete branded HTML email string for the given notification.

    The plain-text body (body_text) is rendered as HTML paragraphs separated by
    blank lines. Inline CSS only — safe for Gmail, Outlook, Apple Mail.
    """
    return _TEMPLATE.format(
        subject=_html_stdlib.escape(subject),
        heading=_html_stdlib.escape(heading),
        body_paragraphs=_paragraphs_to_html(body_text),
        cta_url=_html_stdlib.escape(cta_url, quote=True),
        cta_text=_html_stdlib.escape(cta_text),
        footer=_html_stdlib.escape(footer),
        brand=_BRAND,
        body_bg=_BODY_BG,
        card_bg=_CARD_BG,
        btn_text=_BTN_TEXT,
        border=_BORDER,
        muted=_MUTED,
    )
