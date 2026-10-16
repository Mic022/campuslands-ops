# Reparto de trabajo — Equipo de 4

Cada persona es dueña de sus carpetas y archivos. Así se evitan conflictos de merge y cada uno puede defender su parte ante el jurado.

## P1 · Líder técnico, datos e integración
**Rama:** `feat/datos`

- Inspeccionar el dataset en los primeros minutos y definir el modelo de datos con el equipo.
- `app/models/`: todas las tablas (espacios, recursos, reservas, préstamos, incidencias, auditoría, llamadas a la IA).
- `app/ingest/`: lectura, normalización, validación, cuarentena y reporte en `data/reports/`.
- `scripts/reset_db.py`: conectarlo a la ingesta.
- `app/repositories/auditoria.py`: una función `auditar()` que usan todos.
- Endpoint `GET /api/datos/reporte` para la pantalla de Datos.
- Integrar las ramas en `develop`, mantener el README y probar la instalación desde un clon limpio al final.

**En la defensa:** arquitectura, manejo de datos y casos borde.

## P2 · Backend de espacios y recursos
**Rama:** `feat/espacios-recursos`

- `app/rules/espacios.py`: RN-01 (sin solapamiento), RN-02 (aforo) y RN-05 (horario y duración).
- `app/rules/recursos.py`: RN-03 (máquina de estados), RN-06 (límite de préstamos) y RN-07 (devolución válida).
- `app/services/` y `app/api/` de reservas, préstamos, devoluciones y CRUD de espacios y recursos.
- `tests/test_reglas_*.py`: un caso válido y uno inválido por regla.

**En la defensa:** las reglas, las transacciones y la modificación en vivo de reglas.

## P3 · IA e incidencias
**Rama:** `feat/triaje-ia`

- `app/ai/`: implementar el proveedor autorizado, el prompt, el esquema `ClasificacionIA`, el reintento y el registro de llamadas.
- `app/rules/integracion.py`: RN-04 (bloqueo por estado o por incidencia abierta; una incidencia crítica confirmada pasa el recurso a mantenimiento).
- `app/services/` y `app/api/` de incidencias: triaje, confirmar o ajustar, cambiar estado y resolver.
- Pruebas de inyección de prompt y de IA caída (debe responder 503 y ofrecer triaje manual).

**En la defensa:** el rol de la IA, cómo se controla y la seguridad.

## P4 · Frontend, demo y pitch
**Rama:** `feat/frontend`

- Pantallas: Panel, Espacios, Recursos, Incidencias y Datos.
- Estados de carga, éxito, error de regla (con su código) y vacío, y botones deshabilitados mientras se envía.
- Flujo de incidencias en la UI: "Analizando con IA…" → tarjeta con la propuesta → Confirmar o Ajustar.
- Guion de demo, coordinación del pitch y ensayos cronometrados.

**En la defensa:** la demo en vivo y el pitch.

## Archivos compartidos (con dueño único)

| Archivo | Dueño | Los demás… |
|---|---|---|
| `app/main.py` (registro de routers) | P1 | le piden a P1 que agregue su router, o agregan **solo** su línea |
| `config/reglas.py`, `config/catalogos.py` | P2 y P3 | cambios pequeños, avisando en el chat |
| `app/models/` | P1 | piden campos nuevos a P1 |

## Contratos que se acuerdan en los primeros 20 minutos

Con esto, cada uno avanza sin esperar a los demás. P4 puede trabajar con datos falsos **solo en el frontend local** y nunca los sube.

| Método y ruta | Dueño |
|---|---|
| `GET /api/espacios`, `POST /api/reservas` | P2 |
| `GET /api/recursos`, `POST /api/prestamos`, `POST /api/prestamos/{id}/devolucion` | P2 |
| `POST /api/incidencias/triaje`, `POST /api/incidencias`, `PATCH /api/incidencias/{id}` | P3 |
| `GET /api/datos/reporte`, `GET /api/auditoria?entidad=&id=` | P1 |

Todos los errores tienen la misma forma: `{codigo, mensaje}`.

## Cronograma

| Hora | P1 | P2 | P3 | P4 |
|---|---|---|---|---|
| 0:00–0:20 | Dataset y modelo de datos (todos juntos) | | | |
| 0:20–1:15 | Modelos e ingesta | Reglas puras + pruebas (sin BD) | Proveedor de IA devolviendo JSON válido desde un script | Layout y navegación |
| 1:15–2:30 | Reporte de cuarentena y auditoría | Servicios y endpoints | Triaje y RN-04 | Pantallas de Espacios y Recursos |
| 2:30–3:30 | Integrar ramas | Ayudar con la integración | Flujo completo de incidencias | Pantallas de Incidencias y Datos |
| 3:30–4:10 | Casos borde | Doble clic, transacciones | Inyección, IA caída | Pulir estados |
| **4:10** | **Feature freeze** | | | |
| 4:10–4:40 | README | Ensayar modificación en vivo | Ensayar modificación en vivo | Ensayar la demo |
| 4:40–5:00 | Clon limpio y último merge a `main` | | | |

## Ruta crítica

Los modelos de P1 bloquean a P2 y a P3 desde la hora 1:15. Por eso P2 empieza con reglas puras, que no necesitan BD, y P3 con el adaptador de IA, que tampoco la necesita. Si a la hora 0:50 los modelos no están listos, P2 ayuda a P1.

## Flujo de Git

- `main` tiene la plantilla inicial y no se toca hasta la entrega final.
- Todo el trabajo se integra en `develop`. Cada tarea sale de `develop` en su propia rama (`feat/...`) y vuelve a `develop`.
- Cada persona hace commits desde su propia cuenta y con frecuencia (cada 20–30 minutos).
- Nunca subir `.env` ni el archivo de la BD; la BD se regenera con `python -m scripts.reset_db`.
