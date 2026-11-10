"""Sends new enquiries to the owner's WhatsApp (WhatsApp Business Cloud API) and Gmail (SMTP).
All settings come from environment variables / the .env file. See .env.example."""
import os, ssl, smtplib, requests
from email.message import EmailMessage

env = lambda k, d="": os.environ.get(k, d).strip()
SITE = lambda: env("SITE_URL", "https://www.virasat.in").rstrip("/")

def summary(e):
    L = [f"New {e['kind']} on Crafty Korner India", f"Name: {e['name']}", f"Phone: {e['phone']}"]
    if e.get("email"): L.append(f"Email: {e['email']}")
    if e.get("product"): L.append(f"Product: {e['product']}" + (f" ({SITE()}{e['product_url']})" if e.get("product_url") else ""))
    L.append(f"Message: {e['message']}")
    if e["photos"]: L.append(f"Photos: {len(e['photos'])}")
    L.append(f"Received: {e['time']}")
    return "\n".join(L)

def _chk(r):
    if not r.ok: raise RuntimeError(f"{r.status_code} {r.text[:300]}")
    return r

def send_whatsapp(e, files):
    tok, pid, to = env("WHATSAPP_TOKEN"), env("WHATSAPP_PHONE_ID"), "".join(c for c in env("WHATSAPP_TO") if c.isdigit())
    if not (tok and pid and to): return "not set up"
    if env("NOTIFY_DRY_RUN"): return "dry-run"
    base, H, text, tpl = f"https://graph.facebook.com/v21.0/{pid}", {"Authorization": "Bearer " + tok}, summary(e), env("WHATSAPP_TEMPLATE")
    if tpl:  # template message: works any time (needed once the 24-hour window is closed)
        flat = " | ".join(x for x in text.split("\n") if x)[:900]
        body = {"messaging_product": "whatsapp", "to": to, "type": "template", "template": {"name": tpl, "language": {"code": env("WHATSAPP_TEMPLATE_LANG", "en")},
                "components": [{"type": "body", "parameters": [{"type": "text", "text": flat}]}]}}
    else:
        body = {"messaging_product": "whatsapp", "to": to, "type": "text", "text": {"body": text[:4000]}}
    _chk(requests.post(base + "/messages", headers=H, json=body, timeout=20))
    try:
        for p in files[:4]:
            with open(p, "rb") as fh:
                m = _chk(requests.post(base + "/media", headers=H, data={"messaging_product": "whatsapp", "type": "image/jpeg"}, files={"file": (os.path.basename(p), fh, "image/jpeg")}, timeout=60)).json()
            _chk(requests.post(base + "/messages", headers=H, json={"messaging_product": "whatsapp", "to": to, "type": "image", "image": {"id": m["id"], "caption": f"{e['name']} {e['phone']}"[:200]}}, timeout=20))
    except Exception as ex: return "text sent, photos not sent: " + str(ex)[:150]
    return "sent"

def send_email(e, files):
    user, pw = env("SMTP_USER"), env("SMTP_PASSWORD").replace(" ", ""); to = env("NOTIFY_EMAIL") or user
    if not (user and pw and to): return "not set up"
    if env("NOTIFY_DRY_RUN"): return "dry-run"
    m = EmailMessage(); m["Subject"] = f"[Crafty Korner] {e['kind']} from {e['name']}"[:150]; m["From"] = f"Crafty Korner India <{user}>"; m["To"] = to
    if e.get("email"): m["Reply-To"] = e["email"]
    m.set_content(summary(e))
    for p in files[:4]:
        with open(p, "rb") as fh: m.add_attachment(fh.read(), maintype="image", subtype="jpeg", filename=os.path.basename(p))
    host, port = env("SMTP_HOST", "smtp.gmail.com"), int(env("SMTP_PORT", "587")); ctx = ssl.create_default_context()
    if port == 465: s = smtplib.SMTP_SSL(host, port, context=ctx, timeout=30)
    else: s = smtplib.SMTP(host, port, timeout=30); s.starttls(context=ctx)
    with s: s.login(user, pw); s.send_message(m)
    return "sent"
