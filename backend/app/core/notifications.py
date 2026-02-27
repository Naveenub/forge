"""
Notification service.
Sends Slack messages and emails for approval requests, pipeline failures,
and production deployments. All sends are fire-and-forget; failures are
logged but never re-raised so the main pipeline flow is never blocked.
"""
from __future__ import annotations

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)


class NotificationService:
    """Thin wrapper around Slack + SMTP for pipeline lifecycle events."""

    # ── Slack ─────────────────────────────────────────────────────────────────

    async def _slack_post(self, channel: str, text: str, blocks: list | None = None) -> None:
        if not settings.SLACK_BOT_TOKEN:
            logger.debug("Slack not configured — skipping notification")
            return
        try:
            from slack_sdk.web.async_client import AsyncWebClient
            client = AsyncWebClient(token=settings.SLACK_BOT_TOKEN)
            kwargs: dict[str, Any] = {"channel": channel, "text": text}
            if blocks:
                kwargs["blocks"] = blocks
            await client.chat_postMessage(**kwargs)
        except Exception as exc:
            logger.warning("Slack notification failed: %s", exc)

    async def notify_approval_required(
        self,
        pipeline_id: str,
        domain: str,
        stage: str,
        project_name: str,
        approval_id: str,
    ) -> None:
        text = f"⏳ *Approval Required* — {project_name} ({domain} / {stage})"
        blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": (
                        f"*:hourglass: Approval Required*\n"
                        f"*Project:* {project_name}\n"
                        f"*Domain:* {domain}  •  *Stage:* {stage}\n"
                        f"*Pipeline:* `{pipeline_id}`\n"
                        f"*Approval ID:* `{approval_id}`"
                    ),
                },
            },
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "Review →"},
                        "url": f"https://forge.example.com/approvals/{approval_id}",
                        "style": "primary",
                    }
                ],
            },
        ]
        await self._slack_post(settings.SLACK_CHANNEL_APPROVALS, text, blocks)

    async def notify_pipeline_complete(self, pipeline_id: str, project_name: str) -> None:
        text = f"✅ Pipeline complete — *{project_name}* — `{pipeline_id}`"
        await self._slack_post(settings.SLACK_CHANNEL_APPROVALS, text)

    async def notify_pipeline_failed(
        self, pipeline_id: str, project_name: str, domain: str, error: str
    ) -> None:
        text = (
            f":x: *Pipeline Failed* — {project_name}\n"
            f"Domain: {domain}  •  Pipeline: `{pipeline_id}`\n"
            f"Error: {error[:200]}"
        )
        await self._slack_post(settings.SLACK_CHANNEL_APPROVALS, text)

    # ── Email ─────────────────────────────────────────────────────────────────

    async def send_email(
        self,
        to: str,
        subject: str,
        html_body: str,
        text_body: str | None = None,
    ) -> None:
        if not settings.SMTP_HOST:
            logger.debug("SMTP not configured — skipping email to %s", to)
            return
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"]    = settings.EMAIL_FROM
            msg["To"]      = to

            if text_body:
                msg.attach(MIMEText(text_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.ehlo()
                server.starttls()
                if settings.SMTP_USERNAME:
                    server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD or "")
                server.sendmail(settings.EMAIL_FROM, [to], msg.as_string())
        except Exception as exc:
            logger.warning("Email send failed (to=%s): %s", to, exc)

    async def email_approval_request(
        self, to: str, project_name: str, domain: str, approval_url: str
    ) -> None:
        html = f"""
        <h2>Forge — Approval Required</h2>
        <p>A pipeline stage is waiting for your review:</p>
        <ul>
            <li><strong>Project:</strong> {project_name}</li>
            <li><strong>Domain:</strong> {domain}</li>
        </ul>
        <p><a href="{approval_url}" style="background:#6366f1;color:#fff;padding:12px 24px;
           border-radius:6px;text-decoration:none;display:inline-block;">
           Review &amp; Decide →</a></p>
        """
        await self.send_email(to, f"[Forge] Approval Required — {project_name}", html)
