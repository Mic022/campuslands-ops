"""Configuración leída desde variables de entorno (.env)."""
import os
from pathlib import Path

from dotenv import load_dotenv

RAIZ_REPO = Path(__file__).resolve().parents[3]
load_dotenv(RAIZ_REPO / ".env")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./campus.db")
CORS_ORIGIN = os.getenv("CORS_ORIGIN", "http://localhost:5173")

IA_PROVEEDOR = os.getenv("IA_PROVEEDOR", "").strip().lower()
IA_MODELO = os.getenv("IA_MODELO", "")
IA_API_KEY = os.getenv("IA_API_KEY", "")
IA_BASE_URL = os.getenv("IA_BASE_URL", "")
IA_TIMEOUT_S = int(os.getenv("IA_TIMEOUT_S", "30"))

DATA_RAW = RAIZ_REPO / "data" / "raw"
DATA_REPORTS = RAIZ_REPO / "data" / "reports"

# ---------- Autenticación ----------
# desarrollo | produccion. En producción: cookies Secure, sin usuarios de prueba, sin /docs
# y sin correo por consola.
ENTORNO = os.getenv("ENTORNO", "desarrollo").strip().lower()
ES_PRODUCCION = ENTORNO == "produccion"

# URL pública del frontend: origen permitido y base del enlace de recuperación de contraseña.
APP_URL = os.getenv("APP_URL", CORS_ORIGIN).rstrip("/")

# Sesiones en el servidor; el navegador solo guarda un token aleatorio en una cookie HttpOnly.
COOKIE_SESION = "campus_sesion"
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "true" if ES_PRODUCCION else "false").lower() == "true"
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax").strip().lower()      # lax | strict
TOKEN_HORAS = int(os.getenv("TOKEN_HORAS", "8"))                           # vida máxima de una sesión
SESION_RECORDAR_DIAS = int(os.getenv("SESION_RECORDAR_DIAS", "14"))        # vida con "Recordar sesión"
SESION_INACTIVIDAD_MIN = int(os.getenv("SESION_INACTIVIDAD_MIN", "60"))    # caduca si no se usa

REGISTRO_PUBLICO = os.getenv("REGISTRO_PUBLICO", "true").lower() == "true"

# Fuerza bruta: fallos por cuenta y por IP antes de bloquear temporalmente.
LOGIN_MAX_INTENTOS = int(os.getenv("LOGIN_MAX_INTENTOS", "5"))
LOGIN_BLOQUEO_MIN = int(os.getenv("LOGIN_BLOQUEO_MIN", "15"))
LOGIN_MAX_POR_IP = int(os.getenv("LOGIN_MAX_POR_IP", "30"))

# Política de contraseñas (la UI la lee de GET /api/auth/politica).
CLAVE_MIN = int(os.getenv("CLAVE_MIN", "10"))
CLAVE_MAYUSCULA = os.getenv("CLAVE_MAYUSCULA", "true").lower() == "true"
CLAVE_MINUSCULA = os.getenv("CLAVE_MINUSCULA", "true").lower() == "true"
CLAVE_NUMERO = os.getenv("CLAVE_NUMERO", "true").lower() == "true"
CLAVE_SIMBOLO = os.getenv("CLAVE_SIMBOLO", "false").lower() == "true"

RECUPERACION_MIN = int(os.getenv("RECUPERACION_MIN", "30"))                # vida del enlace de recuperación

# Correo para la recuperación de contraseña. CORREO_MODO: smtp | consola (solo desarrollo) | vacío.
CORREO_MODO = os.getenv("CORREO_MODO", "").strip().lower()
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USUARIO = os.getenv("SMTP_USUARIO", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_TLS = os.getenv("SMTP_TLS", "true").lower() == "true"
SMTP_REMITENTE = os.getenv("SMTP_REMITENTE", "")

# Usuarios de prueba (ficticios, solo fuera de producción). Si una clave está vacía se genera una
# que cumple la política y se muestra una sola vez en la consola.
ADMIN_USUARIO = os.getenv("ADMIN_USUARIO", "admin").strip()
ADMIN_CLAVE = os.getenv("ADMIN_CLAVE", "")
USUARIOS_DEMO = [u.strip() for u in os.getenv("USUARIOS_DEMO", "ana,beto").split(",") if u.strip()]
USUARIO_CLAVE = os.getenv("USUARIO_CLAVE", "")
SEMBRAR_USUARIOS_DEMO = os.getenv("SEMBRAR_USUARIOS_DEMO", "false" if ES_PRODUCCION else "true").lower() == "true"
