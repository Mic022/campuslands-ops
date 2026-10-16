"""Reporte de carga: cuántos registros se leyeron, cargaron y quedaron en cuarentena, y por qué."""
import json
from collections import Counter
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path


@dataclass
class Rechazo:
    fila: int            # número de fila en el archivo de origen (1 = primer registro)
    id_origen: str | None
    motivo: str
    datos: dict


@dataclass
class Correccion:
    fila: int
    id_origen: str | None
    descripcion: str     # qué se corrigió y por qué (regla de reconciliación documentada)


@dataclass
class ReporteEntidad:
    entidad: str
    leidos: int = 0
    cargados: int = 0
    cuarentena: list[Rechazo] = field(default_factory=list)
    correcciones: list[Correccion] = field(default_factory=list)

    def rechazar(self, fila: int, id_origen, motivo: str, datos: dict) -> None:
        self.cuarentena.append(Rechazo(fila, _str(id_origen), motivo, _serializable(datos)))

    def corregir(self, fila: int, id_origen, descripcion: str) -> None:
        self.correcciones.append(Correccion(fila, _str(id_origen), descripcion))

    def resumen(self) -> dict:
        motivos = Counter(r.motivo.split(":")[0] for r in self.cuarentena)
        return {
            "entidad": self.entidad,
            "leidos": self.leidos,
            "cargados": self.cargados,
            "en_cuarentena": len(self.cuarentena),
            "corregidos": len(self.correcciones),
            "motivos_por_campo": dict(motivos),
        }


@dataclass
class ReporteCarga:
    generado_en: str = field(default_factory=lambda: datetime.now().isoformat(timespec="seconds"))
    archivos: list[dict] = field(default_factory=list)
    entidades: dict[str, ReporteEntidad] = field(default_factory=dict)

    def entidad(self, nombre: str) -> ReporteEntidad:
        return self.entidades.setdefault(nombre, ReporteEntidad(nombre))

    def a_dict(self) -> dict:
        return {
            "generado_en": self.generado_en,
            "archivos": self.archivos,
            "resumen": [e.resumen() for e in self.entidades.values()],
            "detalle": {n: asdict(e) for n, e in self.entidades.items()},
        }

    def guardar(self, carpeta: Path) -> Path:
        carpeta.mkdir(parents=True, exist_ok=True)
        ruta = carpeta / "reporte_carga.json"
        ruta.write_text(json.dumps(self.a_dict(), ensure_ascii=False, indent=2), encoding="utf-8")
        return ruta


def _str(valor) -> str | None:
    return None if valor is None else str(valor)


def _serializable(datos: dict) -> dict:
    return {str(k): (v if isinstance(v, (str, int, float, bool, type(None))) else str(v)) for k, v in datos.items()}
