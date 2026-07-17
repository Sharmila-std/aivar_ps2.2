import smtplib
from email.mime.text import MIMEText
import sys
import email.utils
from ..config import settings

def send_email(to_email: str, subject: str, body: str) -> bool:
    """
    Sends an email using configured SMTP settings.
    If SMTP settings are missing or connection fails, logs the email to standard output as a fallback.
    """
    print(f"\n--- [EMAIL TRIGGERED] ---", file=sys.stderr)
    print(f"To: {to_email}", file=sys.stderr)
    print(f"Subject: {subject}", file=sys.stderr)
    print(f"Body:\n{body}", file=sys.stderr)
    print(f"-------------------------\n", file=sys.stderr)

    if not settings.SMTP_PASSWORD:
        print("[EMAIL] SMTP_PASSWORD is not configured. Falling back to stdout logging.", file=sys.stderr)
        return True

    try:
        # Use plain MIMEText (not MIMEMultipart) to avoid triggering Gmail delivery status notifications
        msg = MIMEText(body, 'plain', 'utf-8')
        msg['From'] = settings.SMTP_FROM
        msg['To'] = to_email
        msg['Subject'] = subject
        msg['Date'] = email.utils.formatdate(localtime=True)
        msg['Message-ID'] = email.utils.make_msgid(domain=settings.SMTP_FROM.split('@')[-1])

        # Connect to SMTP
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
        print(f"[EMAIL] SMTP email sending failed: {e}. (Logged to console above)", file=sys.stderr)
        return True

