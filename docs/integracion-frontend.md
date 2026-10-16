# Integración del frontend de Sergio con el backend

**Decisión:** el frontend de Sergio (`Devsergy`: React + TS + Tailwind + 3D) es la interfaz principal.
El **backend es la única fuente de datos y de reglas**. El frontend muestra, envía y presenta
el `{codigo, mensaje}` que responde el backend; nunca valida reglas de negocio ni inventa datos.

**Buena noticia:** todo el acceso a datos pasa por `frontend/src/services/apiClient.ts`
(lo llaman `App.tsx`, `AITriageAssistant.tsx` e `IncidentReportModal.tsx`). Si se reescribe
`apiClient.ts` conservando los mismos nombres de funciones y los tipos de `types/domain.ts`,
los componentes, el 3D y el diseño **no cambian**.

---

## 1. Qué se conserva y qué se elimina

| Archivo | Acción | Por qué |
|---|---|---|
| Componentes UI, 3D (`scenes/`), layout, `ui/` | **Se conservan** | Son presentación |
| `types/domain.ts` | Se conserva con ajustes menores (ver §3) | Es el contrato de los componentes |
| `services/apiClient.ts` | **Se reescribe**: mismas funciones, llamando a `/api/...` | Hoy usa un store en memoria |
| `data/demoData.ts` | **Se elimina** (salvo la geometría 3D, ver abajo) | Espacios y equipos inventados; no son los datos oficiales |
| `services/rulesEngine.ts` | **Se elimina** | Reglas duplicadas en el navegador; las decide el backend |
| `triajeConIA()` por palabras clave | **Se elimina** → `POST /api/incidencias/triaje` | Presentar reglas fijas como IA = **−15** |
| Toggle "Modo demo" (Navbar/App) | **Se elimina** | Todo sale del backend |
| Footer "Audit Latency ~12ms" | Quitar o calcular real | Métrica inventada |
| `JuryRulesInspector` | **Solo lectura** de `GET /api/reglas`; quitar "tests" locales y edición | La modificación en vivo se hace en `backend/app/config/reglas.py` |

**Geometría 3D:** `coordenadas3D`, `dimensiones3D`, `piso`, `colorTema` son presentación y pueden
vivir en el frontend, en un archivo `data/layout3D.ts` indexado por los **IDs oficiales**:
`auditorio, cosmos, skylab, spooki, apolo, artemis, blanca, azul, sala-verde-1, sala-verde-2, sala-amarilla-1, sala-amarilla-2`.
Nombre, aforo, tipo y estado **siempre** vienen de la API.

---

## 2. Arquitectura de Endpoints en el Frontend (Modular y Desacoplada)

Para facilitar la conexión y trabajo en paralelo del equipo backend (P1 Mic, P2 Jonatan, P3 Nic), los endpoints se encuentran **completamente separados y modularizados**:

1. **Catálogo central de rutas:** [`frontend/src/services/endpoints.ts`](file:///frontend/src/services/endpoints.ts)
   Constante `ENDPOINTS` con todas las URLs del backend (`/api/...`), agrupadas por dominio. Cualquier cambio de ruta se hace en un solo lugar.

2. **Módulos API independientes (`frontend/src/services/api/`):**
   - [`baseClient.ts`](file:///frontend/src/services/api/baseClient.ts): Cliente HTTP base con `pedir()`, `post()`, `patch()`, `get()`, `del()` y manejo de `ApiError` `{codigo, mensaje}`.
   - [`reglasApi.ts`](file:///frontend/src/services/api/reglasApi.ts): Salud y reglas vigentes (`GET /api/health`, `GET /api/reglas`, `GET /api/catalogos`). *(Dueños: P1 / P2)*
   - [`espaciosApi.ts`](file:///frontend/src/services/api/espaciosApi.ts): Espacios oficiales y aforos (`GET /api/espacios`, `GET /api/espacios/{id}`). *(Dueño: P2)*
   - [`recursosApi.ts`](file:///frontend/src/services/api/recursosApi.ts): Catálogo de hardware y actualización de estados (`GET /api/recursos`, `PATCH /api/recursos/{id}/estado`). *(Dueño: P2)*
   - [`reservasApi.ts`](file:///frontend/src/services/api/reservasApi.ts): Reservas de espacios (`GET /api/reservas`, `POST /api/reservas`, `POST /api/reservas/{id}/cancelar`). *(Dueño: P2)*
   - [`prestamosApi.ts`](file:///frontend/src/services/api/prestamosApi.ts): Préstamos de equipos (`GET /api/prestamos`, `POST /api/prestamos`, `POST /api/prestamos/{id}/devolucion`). *(Dueño: P2)*
   - [`incidenciasApi.ts`](file:///frontend/src/services/api/incidenciasApi.ts): Triaje IA, reporte y resolución (`GET /api/incidencias`, `POST /api/incidencias/triaje`, `POST /api/incidencias`, `PATCH /api/incidencias/{id}`). *(Dueño: P3)*

3. **Fachada unificada:** [`frontend/src/services/apiClient.ts`](file:///frontend/src/services/apiClient.ts)
   Reúne todos los submódulos en el objeto `apiClient` para compatibilidad transparente con `App.tsx` y los componentes UI.

### Tabla Detallada de Endpoints y Contratos

| Módulo Frontend | Función | Método y Ruta Backend | Payload Entrada (JSON) | Respuesta Exitosa | Códigos de Regla Esperados |
|---|---|---|---|---|---|
| `reglasApi` | `checkHealth()` | `GET /api/health` | — | `{"estado": "ok"}` | — |
| `reglasApi` | `getReglas()` | `GET /api/reglas` | — | `ReglasConfig` (aforo, horas, cupo, umbral IA) | — |
| `espaciosApi` | `getEspacios()` | `GET /api/espacios` | — | `[EspacioApi]` con `aforo_permitido` | — |
| `recursosApi` | `getRecursos()` | `GET /api/recursos` | — | `[RecursoApi]` | — |
| `recursosApi` | `actualizarEstadoRecurso()` | `PATCH /api/recursos/{id}/estado` | `{"estado": str, "motivo"?: str}` | `RecursoApi` | `RN-03` |
| `reservasApi` | `getReservas()` | `GET /api/reservas` | — | `[ReservaApi]` | — |
| `reservasApi` | `crearReserva()` | `POST /api/reservas` | `{"espacio_id": str, "solicitante": str, "inicio": ISO, "fin": ISO, "asistentes": int}` | `ReservaApi` (201) | `RN-01`, `RN-02`, `RN-04`, `RN-05` |
| `reservasApi` | `cancelarReserva()` | `POST /api/reservas/{id}/cancelar` | — | `ReservaApi` | — |
| `prestamosApi` | `getPrestamos()` | `GET /api/prestamos` | — | `[PrestamoApi]` | — |
| `prestamosApi` | `crearPrestamo()` | `POST /api/prestamos` | `{"recurso_id": str, "solicitante": str, "devolucion_esperada": ISO}` | `PrestamoApi` (201) | `RN-02`, `RN-03`, `RN-04` |
| `prestamosApi` | `devolverPrestamo()` | `POST /api/prestamos/{id}/devolucion` | `{"estado_recurso": "disponible"\|"danado"}` | `PrestamoApi` | `RN-03`, `RN-07` |
| `incidenciasApi` | `triajeConIA()` | `POST /api/incidencias/triaje` | `{"descripcion": str, "espacio_id"?: str, "recurso_id"?: str}` | `{"categoria", "prioridad", "area_responsable", "justificacion", "confianza", "requiere_revision"}` | `IA-503` (si IA no disponible) |
| `incidenciasApi` | `getIncidencias()` | `GET /api/incidencias` | — | `[IncidenciaApi]` | — |
| `incidenciasApi` | `crearIncidencia()` | `POST /api/incidencias` | `{"titulo": str, "descripcion": str, "espacio_id"?: str, "recurso_id"?: str, "categoria": str, "prioridad": str, "area_responsable": str, "origen_triaje": "ia"\|"manual"}` | `IncidenciaApi` (201) | Inhabilita espacio/recurso (RN-04) |
| `incidenciasApi` | `resolverIncidencia()` | `PATCH /api/incidencias/{id}` | `{"estado": "resuelta"}` | `IncidenciaApi` | — |

**Formato global de errores:** El backend responde status 400/404/409/422/503 con `{ "codigo": "RN-XX", "mensaje": "..." }`. El frontend lo procesa automáticamente con `ApiError` y lo muestra en los toasts flotantes.

---


## 3. Mapeo de campos (backend `snake_case` → `domain.ts`)

**Espacio**
| domain.ts | backend | Nota |
|---|---|---|
| `id`, `nombre`, `tipo`, `estado` | igual | |
| `capacidad` | `aforo` | mostrar también `aforo_permitido` si cambia `FACTOR_AFORO` |
| `incidenciaActivaId` | derivado: incidencia abierta con prioridad en `reglas.prioridades_bloqueantes` | solo para pintar; quien bloquea es el backend (RN-04) |
| `piso`, `equipamiento`, `coordenadas3D`, `dimensiones3D`, `colorTema` | — | de `layout3D.ts` |

**Recurso**
| domain.ts | backend | Nota |
|---|---|---|
| `id`, `nombre`, `estado` | igual | `nombre` puede venir vacío → usar `tipo` |
| `codigo` | `id` | |
| `tipo` | `tipo` (texto libre) | cambiar `TipoRecurso` a `string` |
| `espacioActualId` / `espacioActualNombre` | `espacio_id` / buscar en espacios | |
| `solicitanteActual` | préstamo activo de ese recurso | se arma con `getPrestamos()` |

**Reserva**
| domain.ts | backend | Nota |
|---|---|---|
| `id` | `id` (número) | `String(id)` |
| `espacioId`, `espacioNombre` | `espacio_id`, buscar en espacios | |
| `solicitanteNombre` | `solicitante` | |
| `horaInicio`, `horaFin` | `inicio`, `fin` (ISO `2026-10-16T14:00:00`) | |
| `numPersonas` | `asistentes` | |
| `creadaEn`, `estado` | `creada_en`, `estado` | |
| `solicitanteEmail`, `motivo` | — | **quitar** (ver §4) |

**Préstamo**
| domain.ts | backend |
|---|---|
| `recursoId`, `solicitanteNombre`, `estado` | `recurso_id`, `solicitante`, `estado` |
| `fechaPrestamo`, `fechaEstimadaDevolucion` | `salida`, `devolucion_esperada` (ISO) |
| `recursoNombre`, `recursoCodigo` | buscar en recursos |
| `solicitanteEmail` | — quitar |

**Incidencia**
| domain.ts | backend |
|---|---|
| `id`, `titulo`, `descripcion`, `categoria`, `prioridad`, `estado` | igual (`id` → `String`) |
| `codigo` | `INC-${id}` |
| `area` | `area_responsable` |
| `espacioId`, `recursoId` | `espacio_id`, `recurso_id` |
| `confianzaIA`, `razonamientoIA` | `confianza_ia`, `justificacion_ia` |
| `origenTriaje` | `origen_triaje` (`ia` \| `manual` \| `pendiente`) |
| `timestamp` | `creada_en` |
| `sugerenciaAccion` | — (opcional; la IA no la devuelve) |

**TriajeIAResponse**: `area` ← `area_responsable`, `razonamiento` ← `justificacion`,
`requiereRevisionHumana` ← `requiere_revision` (lo calcula el backend con `UMBRAL_CONFIANZA_IA`),
`sugerenciaAccion` opcional.

---

## 4. Cambios en formularios

| Formulario | Cambio | Por qué |
|---|---|---|
| `SpaceBookingModal` | Agregar **fecha** (`type="date"`); enviar `inicio`/`fin` como `YYYY-MM-DDTHH:MM` | Hoy solo manda horas; el backend necesita fecha (RN-05 rechaza el pasado) |
| `SpaceBookingModal`, `ResourceLoanModal` | Quitar **email** | Requisito: no pedir datos personales reales. El backend identifica por `solicitante` |
| `ResourceLoanModal` | `fechaEstimadaDevolucion` como fecha+hora ISO, no `"Hoy a las 18:00"` | El backend valida la fecha |
| Ambos modales | Quitar la prevalidación con `rulesEngine`; el botón solo se deshabilita mientras `loading` | Una sola fuente de reglas; si el jurado cambia `reglas.py`, la UI no queda desfasada |
| `IncidentReportModal` | Tras el triaje: mostrar propuesta + justificación + confianza; si `requiereRevisionHumana`, exigir confirmación manual; botones **Confirmar** / **Ajustar**; si 503 → "IA no disponible" + triaje manual | Humano en el ciclo; manejo de IA caída |

---

## 5. Contrato de incidencias (para Nic; Sergio programa contra esto)

```
GET   /api/incidencias?estado=&espacio_id=&recurso_id=
      → 200 [Incidencia]                          (campos del modelo app/models.Incidencia)

POST  /api/incidencias/triaje
      body {descripcion: str (10..1000), espacio_id?: str, recurso_id?: str}
      → 200 {categoria, prioridad, area_responsable, justificacion, confianza, requiere_revision}
      → 503 {codigo: "IA-503", mensaje}           (IA no configurada, caída o JSON inválido tras reintento)
      No guarda nada.

POST  /api/incidencias
      body {titulo, descripcion, espacio_id?, recurso_id?, categoria, prioridad, area_responsable,
            origen_triaje: "ia"|"manual", confianza_ia?, justificacion_ia?}
      → 201 Incidencia
      Efectos (en una transacción, con auditar()):
        - si trae recurso_id y el recurso está fijo en un espacio, guardar también ese espacio_id
          (así "el videobeam de Cosmos echa humo" bloquea el recurso Y el aula, RN-04)
        - si prioridad ∈ PRIORIDADES_BLOQUEANTES y hay recurso disponible → recurso a "mantenimiento"

PATCH /api/incidencias/{id}
      body {estado: "en_proceso"|"resuelta"}
      → 200 Incidencia   (resuelta → resuelta_en = ahora)
      El recurso NO vuelve solo a "disponible": se pasa explícitamente con PATCH /api/recursos/{id}/estado.
```

Formato de error igual al resto (`ReglaNegocioError` / `NoEncontradoError` / `ErrorProveedor`
ya los convierte `main.py`); **no** usar `HTTPException(detail={...})`, que envuelve en `{"detail": ...}`.
IDs de espacio y recurso son **texto**.

---

## 6. Huecos y dueños

| Hueco | Dueño | Bloquea |
|---|---|---|
| Endpoints de incidencias (§5) y corrección de `triaje.py` (falta `import settings`; usar el adaptador de `develop`) | Nic | Triaje, RN-04 visible, demo |
| Integrar PR #2 (RN-04 en reservas y préstamos) | Mic (aprobar) | Bloqueos |
| Reescribir `apiClient.ts`, `layout3D.ts`, ajustes de §4 | Sergio (o Mic si se acuerda) | Toda la UI |
| Inventario de recursos (oficial o creado desde la app) | Equipo / organizadores | Módulo 2 en la demo |
| Proveedor de IA autorizado + clave en `.env` | Organizadores | IA en vivo |

---

## 6.1 Login y roles (nuevo)

```
POST /api/auth/login   {usuario, clave}
  → 200 {token, tipo: "bearer", expira_en_horas, usuario: {usuario, nombre, rol}}
  → 401 {codigo: "AUTH-401", mensaje: "Usuario o clave incorrectos."}
GET  /api/auth/yo      → {usuario, nombre, rol}
```
- Todas las rutas salvo `/api/health`, `/api/catalogos`, `/api/reglas` y el login exigen `Authorization: Bearer <token>`.
- **401** (sesión vencida o inválida) → borrar la sesión y volver al login. **403** → mostrar el mensaje (no tiene permiso).
- Rol `usuario`: el `solicitante` de reservas y préstamos debe ser su `nombre` → prellenarlo con `usuario.nombre` y no dejarlo editable.
- Ocultar a `usuario` los botones de admin: crear/editar espacios y recursos, cambiar estado de recurso, devolución, cambiar estado de incidencia, pestañas de Datos y Auditoría. (El backend igual lo bloquea con 403.)
- Guardar el token en `sessionStorage` (envuelto en try/catch), nunca en el código.
- Referencia: `frontend/src/api.js` y `frontend/src/components/Login.jsx` en `develop`.

## 7. Checklist de requisitos después de integrar

- [ ] Los 12 espacios de la UI son los oficiales (nada de Turing/Lovelace)
- [ ] Reserva válida → toast de éxito; RN-01, RN-02, RN-05 inválidas → toast con código del backend
- [ ] Préstamo de equipo en mantenimiento → RN-03/RN-04 desde el backend
- [ ] Triaje real: "echa humo" → propuesta de la IA con justificación y confianza → confirmar → recurso a mantenimiento → reservar el aula da RN-04
- [ ] IA sin configurar o caída → "IA no disponible" + triaje manual (sin respuestas inventadas)
- [ ] Intento de inyección en la descripción → se clasifica normal
- [ ] Estados de carga, éxito, error y vacío en cada pantalla; botones deshabilitados mientras se envía
- [ ] Pestaña de Datos con el reporte de carga (`GET /api/datos/reporte`)
- [ ] Historial de un recurso (`GET /api/auditoria?entidad=recurso&id=...`)
- [ ] Cambiar `MAX_HORAS_RESERVA` en `reglas.py` → la UI lo refleja sin tocar el frontend
- [ ] Login con `admin` y con `ana`: el usuario no ve acciones de admin y recibe 403 si las intenta
- [ ] `npm run build` sin errores y versiones fijadas en `package.json`
- [ ] Nada de `demoData`, `rulesEngine`, `triajeConIA`, modo demo ni métricas inventadas

## 8. Orden sugerido

1. Integrar PR #2 en `develop`.
2. Nic: endpoints de incidencias según §5 → integrar.
3. Rama `integracion/frontend` = `develop` + `Devsergy`; aplicar §1–§4; probar la checklist §7.
4. Integrar a `develop` y ensayar la demo.
