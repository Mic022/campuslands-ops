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
IA_TIMEOUT_S = int(os.getenv("IA_TIMEOUT_S", "15"))

DATA_RAW = RAIZ_REPO / "data" / "raw"
DATA_REPORTS = RAIZ_REPO / "data" / "reports"
