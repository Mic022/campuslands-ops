"""Arranque de la API y manejadores globales de errores."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.ai.proveedor import ErrorProveedor
from app.config import catalogos, settings
from app.config import reglas as cfg
from app.db import crear_tablas
from app.rules.base import NoEncontradoError, ReglaNegocioError

log = logging.getLogger("campus-ops")



@asynccontextmanager
async def lifespan(_: FastAPI):
    crear_tablas()
    yield


app = FastAPI(title="Campus Ops — Sistema Central de Gestión Operativa", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.CORS_ORIGIN],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Manejadores de errores: nunca stack traces al cliente ----------

@app.exception_handler(ReglaNegocioError)
async def _regla(request: Request, exc: ReglaNegocioError):
    r = exc.resultado
    return JSONResponse(status_code=409, content={"codigo": r.codigo, "mensaje": r.mensaje})


@app.exception_handler(NoEncontradoError)
async def _no_encontrado(request: Request, exc: NoEncontradoError):
    return JSONResponse(status_code=404, content={"codigo": "ERR-404", "mensaje": str(exc)})


@app.exception_handler(RequestValidationError)
async def _validacion(request: Request, exc: RequestValidationError):
    detalles = [
        {"campo": ".".join(str(p) for p in e["loc"][1:]), "mensaje": e["msg"]}
        for e in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={"codigo": "ERR-422", "mensaje": "Datos inválidos", "detalles": detalles},
    )


@app.exception_handler(ErrorProveedor)
async def _ia_caida(request: Request, exc: ErrorProveedor):
    return JSONResponse(
        status_code=503,
        content={"codigo": "IA-503", "mensaje": f"IA no disponible: {exc}. Usa el triaje manual."},
    )


@app.exception_handler(Exception)
async def _inesperado(request: Request, exc: Exception):
    log.exception("Error no controlado")
    return JSONResponse(
        status_code=500,
        content={"codigo": "ERR-500", "mensaje": "Ocurrió un error inesperado. Intenta de nuevo."},
    )


# ---------- Rutas base ----------

@app.get("/api/health")
def health():
    return {"estado": "ok"}


@app.get("/api/catalogos")
def get_catalogos():
    return catalogos.como_dict()


@app.get("/api/reglas")
def get_reglas():
    """Parámetros de negocio vigentes, para que la UI los muestre sin duplicarlos."""
    return {
        "hora_apertura": cfg.HORA_APERTURA,
        "hora_cierre": cfg.HORA_CIERRE,
        "max_horas_reserva": cfg.MAX_HORAS_RESERVA,
        "factor_aforo": cfg.FACTOR_AFORO,
        "max_prestamos_activos": cfg.MAX_PRESTAMOS_ACTIVOS,
        "prioridades_bloqueantes": sorted(cfg.PRIORIDADES_BLOQUEANTES),
        "umbral_confianza_ia": cfg.UMBRAL_CONFIANZA_IA,
    }


# Los routers de cada módulo se registran aquí (una línea por módulo):
from app.api import datos  # noqa: E402

app.include_router(datos.router)
