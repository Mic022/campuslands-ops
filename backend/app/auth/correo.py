"""Envío de correo para la recuperación de contraseña.

CORREO_MODO=smtp     → envía por SMTP (SMTP_HOST, SMTP_PORT, SMTP_USUARIO, SMTP_PASSWORD, SMTP_REMITENTE).
CORREO_MODO=consola  → solo en desarrollo: imprime el correo en la consola del backend.
Sin configurar       → no se envía nada y se registra un aviso. Nunca se finge el envío.
"""
import logging
import smtplib
import ssl
from email.message import EmailMessage

from app.config import settings

log = logging.getLogger("campus-ops")


class CorreoNoConfigurado(Exception):
    pass


def modo() -> str | None:
    """Modo efectivo del servicio de correo, o None si no está configurado."""
    if settings.CORREO_MODO == "smtp" and settings.SMTP_HOST and settings.SMTP_REMITENTE:
        return "smtp"
    if settings.CORREO_MODO == "consola" and not settings.ES_PRODUCCION:
        return "consola"
    return None


def configurado() -> bool:
    return modo() is not None


def enviar(destinatario: str, asunto: str, texto: str) -> None:
    actual = modo()
    if actual is None:
        raise CorreoNoConfigurado("El servicio de correo no está configurado (ver CORREO_MODO en .env).")

    if actual == "consola":
        # Solo desarrollo: permite probar el flujo completo sin un servidor SMTP.
        print(f"\n===== CORREO (modo consola, solo desarrollo) =====\nPara: {destinatario}\n"
              f"Asunto: {asunto}\n\n{texto}\n==================================================\n", flush=True)
        return

    mensaje = EmailMessage()
    mensaje["From"] = settings.SMTP_REMITENTE
    mensaje["To"] = destinatario
    mensaje["Subject"] = asunto
    mensaje.set_content(texto)
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
        if settings.SMTP_TLS:
            smtp.starttls(context=ssl.create_default_context())
        if settings.SMTP_USUARIO:
            smtp.login(settings.SMTP_USUARIO, settings.SMTP_PASSWORD)
        smtp.send_message(mensaje)
