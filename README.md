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

# Atajo: desde la raíz, `npm run dev` levanta backend (:8000) y frontend (:5173) juntos.
# Sin el backend el plano muestra "Sin conexión" y no permite reservar.

# 3. Frontend (otra terminal)
cd frontend
npm install
npm run dev                   # http://localhost:5173

# 4. Pruebas (desde backend/)
pytest
```

## Módulo Torre Zenith · Nivel 6 (plano 3D y reservas)

Pestaña **Gemelo Digital 3D**: reconstrucción del plano arquitectónico del Nivel 6 (2560 m², un solo piso) con sus diez salas reservables: Sala Verde, Sala Amarilla, Auditorio, Sala Azul, Sala Blanca, Skylab, Salón Cosmos, Salón Artemis, Salón Apolo y Salón Sputnik.

- **Geometría:** `frontend/src/data/torreZenithNivel6.ts`. Las coordenadas están en píxeles del plano de referencia (1 px ≈ 0,086 m) y se convierten a la escena; muros, puertas y mobiliario se generan a partir de ellas.
- **Catálogo de salas** (nombres, capacidad, colores de la leyenda, equipamiento): `backend/app/config/salas.py`, que se sincroniza con la BD al arrancar.
- **Reservas reales** con persistencia en la BD (SQLModel; SQLite por defecto y PostgreSQL al cambiar `DATABASE_URL`). Sin backend, la UI muestra los estados como *desconocidos* (gris) y no supone disponibilidad.
- **Estados:** verde = disponible, amarillo = reservada en la hora consultada, rojo = mantenimiento, gris = sin datos. Se consultan en vivo (se refrescan cada 20 s) o para una fecha y hora elegidas.
- **Validaciones en el servidor** (`backend/app/rules/reservas.py`): RES-01 fin ≤ inicio · RES-02 fuera de 6:00–22:00 · RES-03 más de 4 h · RES-04 fecha u hora pasada · RES-05 aforo · RES-06 solape con una reserva confirmada · RES-07 sala en mantenimiento · RES-08 cancelación no válida. Un candado serializa la comprobación y la inserción, por lo que dos peticiones simultáneas no pueden ocupar el mismo hueco.
- **Permisos:** al crear una reserva, el servidor entrega un token (en la BD solo se guarda su hash) que el navegador conserva para listar y cancelar sus reservas. Con `ADMIN_TOKEN` (en `.env`) se habilita el modo operador: bloquear/desbloquear salas por mantenimiento, ver el historial completo y cancelar cualquier reserva.

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/nivel6?fecha=&hora=` | Ocupación de las 10 salas y resumen del nivel |
| GET | `/api/salas` · `/api/salas/{id}/reservas` | Catálogo y agenda (datos personales solo para operador) |
| POST | `/api/reservas` | Crear una reserva (devuelve el token de cancelación) |
| POST | `/api/reservas/mias` | Reservas del usuario a partir de sus tokens |
| DELETE | `/api/reservas/{id}` | Cancelar (`X-Reserva-Token` o `X-Admin-Token`) |
| GET | `/api/reservas` | Historial completo (operador) |
| PUT | `/api/salas/{id}/mantenimiento` | Bloquear o desbloquear una sala (operador) |

## Decisiones técnicas y limitaciones conocidas
_Pendiente._
