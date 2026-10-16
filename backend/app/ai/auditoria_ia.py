# backend/app/ai/auditoria_ia.py
"""Registro de métricas de llamadas a la IA para auditoría y defensa."""
from sqlmodel import Session
from app.models import LlamadaIA, ahora

def registrar_llamada_ia(
    db: Session,
    tipo: str,
    modelo: str | None,
    latencia_ms: int | None,
    valida: bool,
    error: str | None = None
):
    """Guarda el resultado de una llamada a la IA en la base de datos."""
    llamada = LlamadaIA(
        tipo=tipo,
        modelo=modelo,
        latencia_ms=latencia_ms,
        valida=valida,
        error=error,
        fecha=ahora()
    )
    db.add(llamada)
    db.commit()  # Commit inmediato para asegurar que se registre incluso si la transacción principal falla después