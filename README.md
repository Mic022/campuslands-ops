# Campus Ops — Sistema Central de Gestión Operativa de Campuslands

> Hackatón Campuslands · "El campus bajo presión"

## Problema
Campuslands crece rápido y su operación diaria depende de registros dispersos y revisiones manuales:
aulas reservadas dos veces o por encima de su aforo, equipos prestados sin saber quién los tiene ni en
qué estado están, e incidencias que llegan como texto libre y nadie sabe qué tan graves son ni a quién
le tocan.

**Campus Ops** unifica en un solo flujo los **espacios**, los **recursos tecnológicos** y las
**incidencias**, sobre los datos oficiales del campus. Las reglas de negocio impiden reservar o prestar
lo que no se puede, y la IA clasifica y prioriza las incidencias. **La IA recomienda, las reglas deciden.**

## Integrantes
| Integrante (GitHub) | Rol |
|---|---|
| _nombre_ (@Mic022) | P1 · Líder técnico, datos e integración |
| Jonatan Sarmiento (@Jonatan-17) | P2 · Backend de espacios y recursos |
| _nombre_ (@Nic-tolb) | P3 · IA e incidencias |
| _nombre_ (@velascodazasergio-png) | P4 · Frontend, 3D y demo |

## Stack tecnológico
- **Backend:** Python 3.12 · FastAPI · SQLModel · Pydantic
- **Base de datos:** SQLite (claves foráneas activadas)
- **Frontend:** React 18 · Vite 5
- **IA:** adaptador propio con tres proveedores intercambiables por `.env`: Claude (SDK oficial de Anthropic), APIs compatibles con OpenAI y Ollama local
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
| `backend/app/config/` | `settings.py` (variables de entorno), `reglas.py` (parámetros de negocio), `catalogos.py` (valores cerrados y máquina de estados) |
| `backend/app/rules/` | Reglas de negocio puras; devuelven `ResultadoRegla(ok, codigo, mensaje)` |
| `backend/app/services/` | Orquestación: transacción, reglas, persistencia y auditoría |
| `backend/app/repositories/` | Acceso a datos y auditoría |
| `backend/app/ai/` | Adaptador de proveedores, prompt y validación de la salida de la IA |
| `backend/app/ingest/` | Lectura, normalización, validación, reconciliación y cuarentena del dataset |
| `backend/app/api/` | Rutas HTTP |

Todo error llega al cliente como `{codigo, mensaje}`: regla de negocio → 409, no encontrado → 404,
datos inválidos → 422 (con `detalles`), IA no disponible → 503, inesperado → 500 sin detalles internos.

## Roles y autenticación
Dos roles: **admin** y **usuario**. Una sola tabla, [`backend/app/config/permisos.py`](backend/app/config/permisos.py),
define qué puede hacer cada uno; una dependencia global la aplica a todas las rutas.

| Acción | Usuario | Admin |
|---|---|---|
| Ver espacios, recursos, reservas y agenda | ✅ | ✅ |
| Reservar y pedir préstamos **a su nombre**; cancelar **sus** reservas | ✅ | ✅ (por cualquiera) |
| Reportar incidencias (triaje y confirmación) | ✅ | ✅ |
| Crear/editar espacios y recursos, cambiar estado de recursos, registrar devoluciones, cambiar estado de incidencias | ❌ | ✅ |
| Reporte de carga y auditoría | ❌ | ✅ |

- `POST /api/auth/login` `{usuario, clave}` → token; luego `Authorization: Bearer <token>`. Sin sesión → 401 `AUTH-401`; sin permiso → 403 `AUTH-403`.
- Contraseñas con PBKDF2-SHA256 y sal; tokens firmados con HMAC-SHA256 (`SECRET_KEY`) que vencen en `TOKEN_HORAS`. Solo librería estándar.
- Usuarios de prueba ficticios definidos en `.env` (`ADMIN_USUARIO`, `USUARIOS_DEMO`). Si una clave está vacía, `reset_db` genera una y la muestra; **no hay claves en el repositorio**.
- La auditoría registra el nombre del usuario que hizo cada cambio.

## Uso de IA
**Qué hace:** triaje de incidencias. A partir del texto libre del reporte propone **categoría**,
**prioridad** y **área responsable**, con una justificación y un nivel de confianza.

**Cómo se controla**
- Salida restringida a un **esquema JSON** con valores cerrados tomados de `config/catalogos.py` (structured outputs); además se valida con Pydantic al recibirla.
- Si la confianza está por debajo de `UMBRAL_CONFIANZA_IA`, la UI exige revisión humana.
- **Humano en el ciclo:** la IA solo propone; la persona confirma o ajusta, y se guarda si el triaje fue `ia` o `manual`.
- La IA **nunca escribe en la base de datos**: las consecuencias (bloqueos, cambios de estado) las aplican las reglas.
- Cada llamada se registra (latencia, si fue válida, error) en la tabla `llamadas_ia`.

**Si falla:** sin conexión, credencial inválida, tiempo agotado, rechazo del modelo o JSON inválido
tras un reintento → `ErrorProveedor` → **503** y triaje manual. Nunca se inventa una respuesta.

**Prompt injection:** la descripción del usuario va delimitada y se trata como datos, no como
instrucciones; la salida solo puede tomar valores del catálogo; el texto se muestra como texto plano.

**Configuración:** ver `.env.example`. Verificación rápida: `cd backend && python -m scripts.probar_ia`.

**Flujo:** `POST /api/incidencias/triaje` (propuesta, no guarda) → la persona confirma o ajusta →
`POST /api/incidencias` (el backend decide si el triaje fue `ia` o `manual` y aplica RN-04) →
`PATCH /api/incidencias/{id}` (en proceso / resuelta).

### Asistente de reservas y reportes (optimización de espacios)
En la pestaña **Asistente IA** la persona escribe lo que necesita: *"un salón con computadores para 30
personas mañana de 10 a 12 a nombre de Ana"* o *"el TV de Cosmos no enciende"*.

- **La IA solo interpreta** (`app/ai/asistente.py`): convierte la conversación en una intención con
  esquema cerrado (reservar / consultar / reportar, personas, con o sin computadores, día, hora, a
  nombre de quién, espacio o recurso nombrado). Si falta un dato, el asistente lo pide; la conversación
  completa se reenvía para que combine datos de varios mensajes.
- **El recomendador decide** (`app/services/recomendador.py`, sin IA): evalúa cada espacio con las mismas
  reglas de una reserva —RN-04 (operable), RN-05 (horario), RN-02 (aforo), RN-01 (libre a esa hora)— y el
  equipamiento pedido, y ordena los que pasan por **el que menos capacidad desperdicia**. Nunca propone
  un espacio ya reservado. Si ninguno sirve, ofrece las horas libres más cercanas ese mismo día y explica
  por qué se descartó cada espacio (con su código de regla). Los textos sobre disponibilidad los arma el
  backend con esos resultados, no la IA.
- **La persona confirma:** cada recomendación trae la reserva lista; el botón *Reservar* la envía a
  `POST /api/reservas`, que vuelve a validar todo. Un reporte pasa por el triaje de incidencias y queda como
  borrador editable hasta *Confirmar y registrar* (`POST /api/incidencias`).
- **Equipamiento** (`app/config/equipamiento.py`): Auditorio, Cosmos, Blanca, Pecera, las salas verdes y las
  amarillas no tienen computadores pero sí TV; el resto tiene computadores. `GET /api/espacios` lo expone
  como `equipamiento: computadores | tv`.
- **Sin IA:** si el asistente responde 503, la misma pestaña muestra el **buscador manual**, que llama a
  `GET /api/recomendaciones?asistentes=&inicio=&fin=&con_equipos=` (mismo recomendador, sin IA).
- Un usuario sin rol admin solo reserva a su nombre; el admin puede reservar por otra persona.

## Reglas de negocio implementadas
| Código | Regla | Dónde está |
|---|---|---|
| RN-01 | No hay reservas solapadas en el mismo espacio (intervalos `[inicio, fin)`) | `backend/app/rules/espacios.py` · `validar_sin_solapamiento` |
| RN-02 | Los asistentes no superan el aforo × `FACTOR_AFORO` | `backend/app/rules/espacios.py` · `validar_aforo` |
| RN-03 | Un recurso solo cambia de estado según la máquina de estados | `backend/app/rules/recursos.py` · `validar_transicion` + `config/catalogos.py` · `TRANSICIONES_RECURSO` |
| RN-04 | **Integradora:** no se reserva ni presta lo que está fuera de servicio o tiene una incidencia abierta de prioridad bloqueante; al confirmar una incidencia bloqueante sobre un recurso, este pasa a mantenimiento y bloquea también su aula | `backend/app/rules/bloqueos.py` · `validar_espacio_operable`, `validar_recurso_operable` |
| RN-05 | Reservas dentro del horario, con duración máxima y nunca en el pasado | `backend/app/rules/espacios.py` · `validar_horario` |
| RN-06 | Máximo de préstamos activos por persona | `backend/app/rules/recursos.py` · `validar_limite_prestamos` |
| RN-07 | Solo se devuelve lo prestado y en una fecha coherente | `backend/app/rules/recursos.py` · `validar_devolucion` |
| RN-08 | Una incidencia solo cambia de estado según su ciclo de vida; una resuelta no se reabre | `backend/app/config/catalogos.py` · `TRANSICIONES_INCIDENCIA` + `services/incidencias.py` |

Todos los parámetros están en [`backend/app/config/reglas.py`](backend/app/config/reglas.py) y se leen
en cada llamada: un cambio ahí se aplica sin tocar el resto del código.

**Ver cada error en vivo:** con la API corriendo, `cd backend && python -m scripts.demo_errores`
dispara una petición por cada error de sesión, espacios y recursos (AUTH-401/403, RN-01 a RN-07, 404,
409 y 422) y muestra su código, el mensaje de la API y por qué ocurre. Inicia sesión con `ADMIN_CLAVE`
de `.env` (o `--usuario`/`--clave`); con `USUARIO_CLAVE` también muestra los 403 de un usuario sin rol
admin. Los límites se leen de `GET /api/reglas`: tras
cambiar `reglas.py` basta con volver a correrlo. `--solo RN-06` filtra por código. Deja la BD como
estaba (cancela sus reservas, devuelve sus préstamos y restaura estados). Usa solo espacios y recursos
reales: no crea datos inventados. Si faltan recursos disponibles omite esos casos; `--crear-recursos-prueba`
crea `DEMO-ERR-*` para ensayar (quedan en el inventario, no usar frente al jurado).

## Manejo de datos
Los archivos oficiales van en `data/raw/` y **nunca se modifican**. `python -m scripts.reset_db`
borra la base y la reconstruye desde cero, siempre con el mismo resultado.

| Archivo | Entidad | Obligatorio |
|---|---|---|
| `capacidad_instalada.csv` | Espacios | Sí |
| `recursos.csv` | Recursos | No (si falta se reporta como "no entregado") |
| `prestamos.csv` | Préstamos | No |

**Pipeline:** leer (UTF-8 o Latin-1, separador `,` `;` o tab, reparación de texto con codificación rota)
→ normalizar (estados con tildes o mayúsculas, números y fechas en formatos mixtos) → validar cada
registro → validar entre registros → cargar en una transacción → reportar.

**Cuarentena:** todo registro inválido queda en el reporte con su fila y el motivo exacto (ID duplicado,
aforo no numérico o ≤ 0, fecha inválida, referencia a un espacio o recurso inexistente, etc.).
Nada se corrige en silencio.

**Reconciliación entre préstamos y recursos** (queda en el reporte y en la auditoría):
- **R1.** Préstamo activo sobre un recurso "disponible" → el recurso pasa a "prestado".
- **R2.** Préstamo activo sobre un recurso en mantenimiento, dañado o de baja → el préstamo va a cuarentena.
- **R3.** Varios préstamos activos del mismo recurso → se conserva el más antiguo.
- **R4.** Recurso "prestado" sin préstamo activo → pasa a "disponible".

El reporte se guarda en `data/reports/reporte_carga.json` y se consulta en `GET /api/datos/reporte`.
Cada carga y cada cambio de estado queda en la auditoría (`GET /api/auditoria?entidad=&id=`).

## Instalación y ejecución

Requisitos: Python 3.12+, Node 20+.

**Opción rápida (Linux/macOS):** `./run.sh` crea `.env` si falta, instala dependencias, reconstruye
la BD y levanta backend y frontend.

**Paso a paso:**

```bash
# 1. Variables de entorno
cp .env.example .env          # completar SECRET_KEY, claves de usuarios y la sección de IA

# 2. Datos oficiales
#    copiar los archivos entregados a data/raw/ (ver tabla de Manejo de datos)

# 3. Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m scripts.reset_db    # crea la BD y carga los datos oficiales
uvicorn app.main:app --reload # http://localhost:8000  (documentación en /docs)

# 4. Frontend (otra terminal)
cd frontend
npm install
npm run dev                   # http://localhost:5173

# 5. Pruebas (desde backend/)
pytest
```

## Decisiones técnicas y limitaciones conocidas
- **Fechas:** se guardan como hora local de Colombia sin zona horaria. Colombia no tiene horario de verano (UTC−5 fijo), y así se evitan errores al comparar fechas con y sin zona.
- **Estados como texto** validado contra los catálogos: agregar un valor no exige migrar la base.
- **Tipo de espacio:** el dataset de capacidad no lo trae; hasta 12 personas es cubículo y el resto aula (`ingest/mapeo.py` · `AFORO_MAX_CUBICULO`).
- **IDs de espacio** derivados del nombre (`Sala Verde 1` → `sala-verde-1`); el frontend y el plano 3D usan los mismos IDs.
- **Concurrencia:** validar y escribir ocurre dentro de un candado y una transacción, para que dos reservas simultáneas no pasen la validación a la vez. Con PostgreSQL se usaría una restricción de exclusión.
- **Sin borrado físico:** las reservas se cancelan, los préstamos se devuelven y los recursos se dan de baja, para conservar la trazabilidad.
- **Autenticación simple:** usuarios de prueba y dos roles, sin registro ni recuperación de clave. Con más tiempo: gestión de usuarios y permisos más finos.
