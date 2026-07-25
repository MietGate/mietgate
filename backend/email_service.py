import os
import logging
import httpx

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
EMAIL_FROM = os.environ.get("EMAIL_FROM", "MietGate <onboarding@resend.dev>")


def _wrap(title: str, body_html: str) -> str:
    return f"""
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f4;padding:32px 0;font-family:Arial,Helvetica,sans-serif;">
      <tr><td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
          <tr><td style="background:#0a2540;padding:24px 32px;">
            <span style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">MietGate</span>
          </td></tr>
          <tr><td style="padding:32px;">
            <h1 style="color:#0a2540;font-size:20px;margin:0 0 16px;">{title}</h1>
            <div style="color:#334155;font-size:15px;line-height:1.6;">{body_html}</div>
          </td></tr>
          <tr><td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px;">
            MietGate.de – Digitales Vermietungsmanagement · Diese E-Mail wurde automatisch versendet.
          </td></tr>
        </table>
      </td></tr>
    </table>
    """


async def send_email(to_email: str, subject: str, title: str, body_html: str):
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set, skipping email")
        return
    payload = {
        "from": EMAIL_FROM,
        "to": [to_email],
        "subject": subject,
        "html": _wrap(title, body_html),
    }
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                RESEND_API_URL,
                headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
                json=payload,
            )
        resp.raise_for_status()
    except httpx.HTTPStatusError as e:
        logger.error(f"Email send failed {e.response.status_code}: {e.response.text}")
    except Exception as e:
        logger.error(f"Email send error: {e}")
