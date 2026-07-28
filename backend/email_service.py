import html as html_mod
import os
import logging
import re
import httpx

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
EMAIL_FROM = os.environ.get("EMAIL_FROM", "MietGate <onboarding@resend.dev>")
# Sending from a noreply address that discards answers trains people to ignore our mail and
# costs us the engagement signal mailbox providers score us on. Replies go to support.
EMAIL_REPLY_TO = os.environ.get("EMAIL_REPLY_TO", "support@mietgate.de")
# Absolute URL — mail clients have no page context to resolve a relative path against.
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://mietgate.de").rstrip("/")
LOGO_URL = f"{FRONTEND_URL}/mietgate-logo.png"


def _plain_text(html: str) -> str:
    """Derive a readable plain-text alternative from the HTML body.

    HTML-only mail is a long-standing spam signal — a multipart message with a genuine
    text part scores better and is what non-HTML clients and screen readers fall back to.
    Links are kept as "label (url)" so nothing is lost in the text version.
    """
    text = re.sub(r"(?is)<(script|style).*?</\1>", "", html)
    text = re.sub(r"(?i)<a [^>]*href=[\"']([^\"']+)[\"'][^>]*>(.*?)</a>",
                  lambda m: f"{re.sub(r'<[^>]+>', '', m.group(2)).strip()} ({m.group(1)})", text)
    text = re.sub(r"(?i)<br\s*/?>", "\n", text)
    text = re.sub(r"(?i)</(p|div|tr|h[1-6]|li)>", "\n", text)
    text = re.sub(r"(?i)<li[^>]*>", "- ", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = html_mod.unescape(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s*\n\s*\n+", "\n\n", text)
    return text.strip()


def _wrap(title: str, body_html: str) -> str:
    return f"""
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f4;padding:32px 0;font-family:Arial,Helvetica,sans-serif;">
      <tr><td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
          <tr><td style="background:#0a2540;padding:24px 32px;">
            <img src="{LOGO_URL}" width="32" height="32" alt=""
                 style="vertical-align:middle;border:0;display:inline-block;" />
            <span style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;vertical-align:middle;padding-left:10px;">MietGate</span>
          </td></tr>
          <tr><td style="padding:32px;">
            <h1 style="color:#0a2540;font-size:20px;margin:0 0 16px;">{title}</h1>
            <div style="color:#334155;font-size:15px;line-height:1.6;">{body_html}</div>
          </td></tr>
          <tr><td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px;">
            MietGate.de – Mietbewerbungen digital verwalten · Diese E-Mail wurde automatisch
            versendet. Antworten erreichen uns unter {EMAIL_REPLY_TO}.
          </td></tr>
        </table>
      </td></tr>
    </table>
    """


async def send_email(to_email: str, subject: str, title: str, body_html: str,
                     headers: dict = None) -> bool:
    """Send one mail. Returns whether it was accepted, so bulk callers can count honestly."""
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set, skipping email")
        return False
    full_html = _wrap(title, body_html)
    payload = {
        "from": EMAIL_FROM,
        "to": [to_email],
        "reply_to": EMAIL_REPLY_TO,
        "subject": subject,
        "html": full_html,
        "text": _plain_text(full_html),
    }
    if headers:
        payload["headers"] = headers
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                RESEND_API_URL,
                headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
                json=payload,
            )
        resp.raise_for_status()
        return True
    except httpx.HTTPStatusError as e:
        logger.error(f"Email send failed {e.response.status_code}: {e.response.text}")
    except Exception as e:
        logger.error(f"Email send error: {e}")
    return False
