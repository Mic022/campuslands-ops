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

## 2. Función por función (`apiClient.ts` → backend)

| Función del frontend | Endpoint real | Estado |
|---|---|---|
| `checkHealth()` | `GET /api/health` | ✅ listo |
| `getReglas()` | `GET /api/reglas` | ✅ listo (incluye `max_largo_descripcion`) |
| `updateReglas()` | — | ❌ eliminar (las reglas no se cambian desde la UI) |
| `getEspacios()` | `GET /api/espacios` | ✅ listo (trae `aforo_permitido`) |
| `getRecursos()` | `GET /api/recursos` | ✅ listo |
| `getReservas()` | `GET /api/reservas` | ✅ listo |
| `getPrestamos()` | `GET /api/prestamos` | ✅ listo |
| `crearReserva()` | `POST /api/reservas` | ✅ listo (RN-01, 02, 05; RN-04 en PR #2) |
| `crearPrestamo()` | `POST /api/prestamos` | ✅ listo (RN-03, 06; RN-04 en PR #2) |
| `actualizarEstadoRecurso()` | `PATCH /api/recursos/{id}/estado` `{estado, motivo?}` | ✅ listo (RN-03) |
| `devolverPrestamo(id, 'optimo'|'danado')` | `POST /api/prestamos/{id}/devolucion` `{estado_recurso: 'disponible'|'danado'}` | ✅ listo (RN-07) |
| `triajeConIA(texto)` | `POST /api/incidencias/triaje` | ⚠️ Nic (ver §5) |
| `getIncidencias()` | `GET /api/incidencias` | ❌ falta (Nic) |
| `crearIncidencia()` | `POST /api/incidencias` | ❌ falta (Nic) |
| `resolverIncidencia(id)` | `PATCH /api/incidencias/{id}` `{estado: 'resuelta'}` | ❌ falta (Nic) |

**Errores:** todo error del backend llega como `{codigo, mensaje}` (409 regla, 404, 422 con
`detalles`, 503 IA caída, 500). `apiClient` lo convierte en `ApiError(codigo, mensaje)` y los
toasts que ya existen en `App.tsx` lo muestran tal cual.

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
- [ ] `npm run build` sin errores y versiones fijadas en `package.json`
- [ ] Nada de `demoData`, `rulesEngine`, `triajeConIA`, modo demo ni métricas inventadas

## 8. Orden sugerido

1. Integrar PR #2 en `develop`.
2. Nic: endpoints de incidencias según §5 → integrar.
3. Rama `integracion/frontend` = `develop` + `Devsergy`; aplicar §1–§4; probar la checklist §7.
4. Integrar a `develop` y ensayar la demo.
