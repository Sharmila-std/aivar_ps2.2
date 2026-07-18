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

    # 2. Use SendGrid REST API if configured (Bypasses Render SMTP blocks completely over HTTPS port 443)
    sendgrid_api_key = os.getenv("SENDGRID_API_KEY")
    if sendgrid_api_key:
        try:
            url = "https://api.sendgrid.com/v3/mail/send"
            headers = {
                "Authorization": f"Bearer {sendgrid_api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "personalizations": [{
                    "to": [{"email": to_email}]
                }],
                "from": {"email": settings.SMTP_FROM, "name": "SecureScope Admin Team"},
                "subject": subject,
                "content": [{"type": "text/plain", "value": body}]
            }
            res = httpx.post(url, headers=headers, json=payload, timeout=10.0, verify=False)
            if res.status_code in (200, 202):
                print("[EMAIL] SendGrid API email sent successfully!", file=sys.stderr)
                return True
            else:
                print(f"[EMAIL] SendGrid API failed ({res.status_code}): {res.text}", file=sys.stderr)
        except Exception as e:
            print(f"[EMAIL] SendGrid API exception: {e}", file=sys.stderr)

    # 3. Use Brevo REST API if configured (Bypasses Render SMTP blocks completely over HTTPS port 443)
    brevo_api_key = os.getenv("BREVO_API_KEY")
    if brevo_api_key:
        try:
            url = "https://api.brevo.com/v3/smtp/email"
            headers = {
                "accept": "application/json",
                "api-key": brevo_api_key,
                "content-type": "application/json"
            }
            payload = {
                "sender": {"email": settings.SMTP_FROM, "name": "SecureScope Admin Team"},
                "to": [{"email": to_email}],
                "subject": subject,
                "textContent": body
            }
            res = httpx.post(url, headers=headers, json=payload, timeout=10.0, verify=False)
            if res.status_code in (200, 201):
                print("[EMAIL] Brevo API email sent successfully!", file=sys.stderr)
                return True
            else:
                print(f"[EMAIL] Brevo API failed ({res.status_code}): {res.text}", file=sys.stderr)
        except Exception as e:
            print(f"[EMAIL] Brevo API exception: {e}", file=sys.stderr)

    # 4. Fallback to standard SMTP
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

        # Connect to SMTP dynamically based on port
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
        print(f"[EMAIL] SMTP email sending failed: {e}. (Logged to console above)", file=sys.stderr)
        return True

