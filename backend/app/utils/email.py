import sys
import httpx
from ..config import settings

def send_email(to_email: str, subject: str, body: str) -> bool:
    """
    Sends an email using SendGrid API (preferred) or SMTP (fallback).
    Logs the email payload to console as a fail-safe.
    """
    print(f"\n--- [EMAIL TRIGGERED] ---", file=sys.stderr)
    print(f"To: {to_email}", file=sys.stderr)
    print(f"Subject: {subject}", file=sys.stderr)
    print(f"Body:\n{body}", file=sys.stderr)
    print(f"-------------------------\n", file=sys.stderr)

    # 1. Prefer SendGrid API if configured
    if settings.SENDGRID_API_KEY:
        try:
            url = "https://api.sendgrid.com/v3/mail/send"
            headers = {
                "Authorization": f"Bearer {settings.SENDGRID_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "personalizations": [
                    {
                        "to": [
                            {
                                "email": to_email
                            }
                        ]
                    }
                ],
                "from": {
                    "email": settings.SENDGRID_FROM_EMAIL
                },
                "subject": subject,
                "content": [
                    {
                        "type": "text/plain",
                        "value": body
                    }
                ]
            }
            res = httpx.post(url, headers=headers, json=payload, timeout=10.0, verify=False)
            if res.status_code == 202:
                print("[EMAIL] Email sent successfully via SendGrid Web API!", file=sys.stderr)
                return True
            else:
                print(f"[EMAIL] SendGrid API failed (Status {res.status_code}): {res.text}", file=sys.stderr)
        except Exception as e:
            print(f"[EMAIL] SendGrid API exception: {e}", file=sys.stderr)

    # 2. Fallback to SMTP
    if settings.SMTP_PASSWORD:
        try:
            import smtplib
            from email.mime.text import MIMEText
            import email.utils
            
            msg = MIMEText(body, 'plain', 'utf-8')
            msg['From'] = settings.SMTP_FROM
            msg['To'] = to_email
            msg['Subject'] = subject
            msg['Date'] = email.utils.formatdate(localtime=True)
            msg['Message-ID'] = email.utils.make_msgid(domain=settings.SMTP_FROM.split('@')[-1])

            if settings.SMTP_PORT == 465:
                server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=5.0)
            else:
                server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=5.0)
                server.ehlo()
                server.starttls()
                
            server.ehlo()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM, to_email, msg.as_string())
            server.quit()
            print("[EMAIL] SMTP email sent successfully!", file=sys.stderr)
            return True
        except Exception as e:
            print(f"[EMAIL] SMTP fallback email sending failed: {e}", file=sys.stderr)

    return True

