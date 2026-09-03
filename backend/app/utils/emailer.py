"""Minimal SMTP e-mail helper. Configuration comes entirely from the environment
so no credentials live in the source tree.

    SMTP_HOST       default "smtp.gmail.com"
    SMTP_PORT       default 587 (STARTTLS)
    SMTP_USER       full Gmail address, e.g. srchains19@gmail.com
    SMTP_PASSWORD   16-char Gmail *App Password* (not the account password)
    SMTP_FROM       optional From: address, defaults to SMTP_USER
    SMTP_FROM_NAME  optional display name, defaults to "SR Chains"

If SMTP is not configured (or a send fails) the message is logged at WARNING
level and the function returns False instead of raising - callers decide how
to react.
"""

from __future__ import annotations

import os
import ssl
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)


def _cfg():
    return {
        "host": os.getenv("SMTP_HOST", "smtp.gmail.com"),
        "port": int(os.getenv("SMTP_PORT", "587")),
        "user": os.getenv("SMTP_USER", "").strip(),
        "password": os.getenv("SMTP_PASSWORD", "").strip(),
        "from_addr": (os.getenv("SMTP_FROM", "") or os.getenv("SMTP_USER", "")).strip(),
        "from_name": os.getenv("SMTP_FROM_NAME", "SR Chains").strip(),
    }


def smtp_configured() -> bool:
    c = _cfg()
    return bool(c["user"] and c["password"])


def send_email(to: str, subject: str, body_text: str, body_html: str | None = None) -> bool:
    """Send a plain-text (optionally multipart HTML) e-mail. Returns True on success."""
    c = _cfg()
    if not c["user"] or not c["password"]:
        logger.warning(
            "SMTP not configured (SMTP_USER / SMTP_PASSWORD missing). "
            "Email to %s NOT sent. Subject: %s\n%s", to, subject, body_text,
        )
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{c['from_name']} <{c['from_addr']}>"
    msg["To"] = to
    msg.attach(MIMEText(body_text, "plain", "utf-8"))
    if body_html:
        msg.attach(MIMEText(body_html, "html", "utf-8"))

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(c["host"], c["port"], timeout=20) as server:
            server.ehlo()
            server.starttls(context=context)
            server.login(c["user"], c["password"])
            server.sendmail(c["from_addr"], [to], msg.as_string())
        logger.info("Email sent to %s (subject: %s)", to, subject)
        return True
    except Exception as e:  # noqa: BLE001 - log and degrade gracefully
        logger.error("Failed to send email to %s: %s", to, e)
        return False
