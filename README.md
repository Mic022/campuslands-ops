# Campus Ops — Sistema Central de Gestión Operativa de Campuslands

> Hackatón Campuslands · "El campus bajo presión"

## Problema
_Pendiente._ Breve descripción del problema del campus y de lo que resuelve el MVP.

## Integrantes
| Nombre | Rol |
|---|---|
| ... | ... |

## Stack tecnológico
- **Backend:** Python 3.12 · FastAPI · SQLModel
- **Base de datos:** SQLite
- **Frontend:** React 18 · Vite 5
- **IA:** _pendiente de confirmar el proveedor/modelo autorizado_
- **Pruebas:** pytest

## Arquitectura
```
frontend (React) ──HTTP /api──▶ api ─▶ services ─▶ rules (funciones puras)
                                          │
                                          ├─▶ repositories ─▶ SQLite
                                          └─▶ ai (adaptador) ─▶ proveedor autorizado
data/raw (solo lectura) ─▶ ingest ─▶ SQLite + data/reports (cuarentena)
```

| Carpeta | Responsabilidad |
|---|---|
| `backend/app/config/` | `settings.py` (variables de entorno), `reglas.py` (parámetros de negocio), `catalogos.py` (valores cerrados) |
| `backend/app/rules/` | Reglas de negocio puras; devuelven `ResultadoRegla` con código |
| `backend/app/services/` | Orquestación: transacciones, reglas, persistencia, auditoría |
| `backend/app/repositories/` | Acceso a datos |
| `backend/app/ai/` | Proveedor, prompts y validación de la salida de la IA |
| `backend/app/ingest/` | Carga, normalización, validación y cuarentena del dataset |
| `backend/app/api/` | Rutas HTTP |

## Uso de IA
_Pendiente._ Qué hace, cómo se controla (valores cerrados, validación por esquema, umbral de confianza, confirmación humana), qué pasa si falla y cómo se protege ante prompt injection.

## Reglas de negocio implementadas
| Código | Regla | Dónde está |
|---|---|---|
| RN-01 | _pendiente_ | |
| RN-02 | _pendiente_ | |
| RN-03 | _pendiente_ | |
| RN-04 | _pendiente_ (integradora) | |

Los parámetros configurables están en [`backend/app/config/reglas.py`](backend/app/config/reglas.py).

## Manejo de datos
Los archivos oficiales van en `data/raw/` (no se suben al repositorio). La ingesta los lee sin modificarlos y deja el reporte de carga y cuarentena en `data/reports/`.

## Instalación y ejecución

Requisitos: Python 3.12+, Node 20+.

**Opción rápida (Linux/macOS):** `./run.sh` instala dependencias, reconstruye la BD y levanta backend y frontend.

**Paso a paso:**

```bash
# 1. Variables de entorno
cp .env.example .env          # completar los valores

# 2. Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m scripts.reset_db    # crea la BD y carga los datos oficiales
uvicorn app.main:app --reload # http://localhost:8000  (docs en /docs)

# 3. Frontend (otra terminal)
cd frontend
npm install
npm run dev                   # http://localhost:5173

# 4. Pruebas (desde backend/)
pytest
```

## Decisiones técnicas y limitaciones conocidas
_Pendiente._
