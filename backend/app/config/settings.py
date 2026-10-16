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
# Clave para firmar los tokens. Si está vacía se genera una al arrancar (los tokens
# dejan de servir al reiniciar el servidor): conviene definirla en .env.
SECRET_KEY = os.getenv("SECRET_KEY", "")
TOKEN_HORAS = int(os.getenv("TOKEN_HORAS", "8"))
# Usuarios de prueba (ficticios). Si una clave está vacía, reset_db genera una y la muestra.
ADMIN_USUARIO = os.getenv("ADMIN_USUARIO", "admin").strip()
ADMIN_CLAVE = os.getenv("ADMIN_CLAVE", "")
USUARIOS_DEMO = [u.strip() for u in os.getenv("USUARIOS_DEMO", "ana,beto").split(",") if u.strip()]
USUARIO_CLAVE = os.getenv("USUARIO_CLAVE", "")
