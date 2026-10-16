# Revisión de ramas antes de integrar a `develop`

Estado de `develop`: ingesta (P1) + espacios, reservas, recursos y préstamos (P2). 134 pruebas pasando.
Ninguna rama tiene credenciales ni texto del pie de página del PDF. 👍

**Regla para todos:** nada entra a `develop` si simula la IA o las validaciones con respuestas fijas (penalización de −15).

---

## Nic (P3) · rama `DevNic`

Buena base: prompt con delimitadores y catálogos dinámicos, esquema Pydantic, reintento con corrección.

### Bloqueantes antes de integrar
1. **`app/ai/triaje.py` → `_llamar_proveedor_ia` devuelve un JSON fijo.** Reemplazar por la llamada real al proveedor autorizado a través de `app/ai/proveedor.py` (`obtener_proveedor().completar(...)`), con `temperatura=0` y `timeout_s=settings.IA_TIMEOUT_S`. Si no hay proveedor, debe lanzar `ErrorProveedor` → la API responde 503 y la UI ofrece triaje manual.
2. **`app/rules/integracion.py` usa `espacio.estado.value` y `recurso.estado.value`.** En la BD los estados son texto (`str`), así que eso lanza `AttributeError` → error 500 justo cuando la regla debería rechazar. Usar `espacio.estado` directamente. Lo mismo con `recurso.serial` (puede ser `None`): usar `recurso.nombre or recurso.id`.

### Pendientes
3. `app/services/incidencias.py`: ya no hace falta esperar repositorios. Los modelos están en `app/models` (`Incidencia`, `Espacio`, `Recurso`); obtener el contexto con `db.get(Espacio, espacio_id)`. **Los IDs de espacio y recurso son `str`**, no `int`.
4. Registrar cada llamada en la tabla `LlamadaIA` (latencia, válida, error).
5. Endpoints en `app/api/incidencias.py`:
   - `POST /api/incidencias/triaje` → propuesta de la IA (no guarda nada)
   - `POST /api/incidencias` → guarda con `origen_triaje` = `ia` | `manual`
   - `PATCH /api/incidencias/{id}` → cambiar estado / resolver
6. RN-04 conectada en los servicios de Jonatan (`crear_reserva`, `crear_prestamo`) y la transición: incidencia crítica confirmada sobre un recurso → recurso a `mantenimiento` (con `auditar()`).
7. Pruebas: RN-04 válida/inválida, IA caída → 503, JSON inválido → reintento, intento de inyección. En las pruebas sí se puede simular el proveedor (mock en `tests/`), nunca en `app/`.

---

## Sergio (P4) · rama `Devsergy`

El 3D, el diseño y los componentes están muy bien. El problema es que hoy **no usa el backend**.

### Bloqueantes antes de integrar
1. **`triajeConIA()` en `services/apiClient.ts` clasifica por palabras clave con confianzas inventadas y la UI lo presenta como IA.** Es exactamente la penalización de −15. Eliminarlo y llamar a `POST /api/incidencias/triaje`. Si responde 503, mostrar "IA no disponible" + triaje manual.
2. **`modoDemoForzado = true` y `data/demoData.ts`**: los espacios y equipos son inventados (Turing, Lovelace…). Los oficiales son los 12 de `GET /api/espacios`. Eliminar `demoData.ts` y el modo demo; todo sale de la API.
3. **`services/rulesEngine.ts` y el inspector del jurado validan y cambian reglas en el navegador.** Las reglas las decide el backend: el frontend envía la operación y muestra el `{codigo, mensaje}` que responde (409 = regla de negocio). El inspector puede mostrar `GET /api/reglas` (solo lectura); la modificación en vivo se hace en `backend/app/config/reglas.py`.
4. **Footer con métricas inventadas** ("Audit Latency: ~12ms"): quitar o calcular desde datos reales.

### Ajustes
5. Usar los contratos reales (ver `http://localhost:8000/docs`). Ejemplos:
   - `POST /api/reservas` → `{espacio_id, solicitante, inicio, fin, asistentes}` (fechas ISO `2026-10-16T10:00`)
   - `POST /api/prestamos` → `{recurso_id, solicitante, devolucion_esperada}`
   - `GET /api/espacios` ya trae `aforo_permitido` calculado.
6. Los IDs del modelo 3D deben ser los de la API: `auditorio, cosmos, skylab, spooki, apolo, artemis, blanca, azul, sala-verde-1, sala-verde-2, sala-amarilla-1, sala-amarilla-2`.
7. Restaurar `docs/equipo.md` (la rama lo borra).
8. Fijar versiones en `package.json` (sin `^`) para que la instalación sea reproducible.
9. Partir de `develop` actualizado: `git fetch && git merge origin/develop`.
