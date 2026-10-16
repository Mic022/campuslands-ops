import React, { useState } from 'react'
import { ReglasConfig, Espacio, Recurso, Reserva, Prestamo, Incidencia } from '../../../types/domain'
import { validarReservaEspacio, validarPrestamoRecurso, validarTransicionRecurso } from '../../../services/rulesEngine'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { 
  Sliders, 
  Terminal, 
  ShieldCheck, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  XCircle,
  Code2,
  Zap
} from 'lucide-react'

interface JuryRulesInspectorProps {
  config: ReglasConfig
  onUpdateConfig: (newConfig: Partial<ReglasConfig>) => void
  espacios: Espacio[]
  recursos: Recurso[]
  reservas: Reserva[]
  prestamos: Prestamo[]
  incidencias: Incidencia[]
}

export const JuryRulesInspector: React.FC<JuryRulesInspectorProps> = ({
  config,
  onUpdateConfig,
  espacios,
  recursos,
  reservas,
  incidencias
}) => {
  const [factorAforo, setFactorAforo] = useState(config.factor_aforo)
  const [maxHoras, setMaxHoras] = useState(config.max_horas_reserva)
  const [maxPrestamos, setMaxPrestamos] = useState(config.max_prestamos_activos)
  const [umbralIA, setUmbralIA] = useState(config.umbral_confianza_ia)

  const [testResult, setTestResult] = useState<{
    titulo: string
    esperado: 'valido' | 'invalido'
    resultadoReal: boolean
    codigo: string
    mensaje: string
  } | null>(null)

  const handleApplyConfig = () => {
    onUpdateConfig({
      factor_aforo: Number(factorAforo),
      max_horas_reserva: Number(maxHoras),
      max_prestamos_activos: Number(maxPrestamos),
      umbral_confianza_ia: Number(umbralIA)
    })
  }

  const handleResetConfig = () => {
    setFactorAforo(1.0)
    setMaxHoras(4)
    setMaxPrestamos(2)
    setUmbralIA(0.6)
    onUpdateConfig({
      factor_aforo: 1.0,
      max_horas_reserva: 4,
      max_prestamos_activos: 2,
      umbral_confianza_ia: 0.6
    })
    setTestResult(null)
  }

  // Batería de pruebas en vivo
  const ejecutarTest1_Aforo = () => {
    const turing = espacios.find(e => e.id === 'ESP-01') || espacios[0]
    const aforoMax = Math.floor(turing.capacidad * config.factor_aforo)
    const personasExcedidas = aforoMax + 5

    const res = validarReservaEspacio(
      turing,
      { horaInicio: '14:00', horaFin: '16:00', numPersonas: personasExcedidas, solicitanteEmail: 'test@campuslands.edu' },
      reservas,
      incidencias,
      config
    )

    setTestResult({
      titulo: `Test RN-01: Solicitar ${personasExcedidas} pax en "${turing.nombre}" (Límite con factor ${(config.factor_aforo * 100).toFixed(0)}%: ${aforoMax} pax)`,
      esperado: 'invalido',
      resultadoReal: res.valido,
      codigo: res.codigo,
      mensaje: res.mensaje
    })
  }

  const ejecutarTest2_Horas = () => {
    const lovelace = espacios.find(e => e.id === 'ESP-02') || espacios[0]
    const res = validarReservaEspacio(
      lovelace,
      { horaInicio: '08:00', horaFin: '14:00', numPersonas: 10, solicitanteEmail: 'trainer@campuslands.edu' },
      reservas,
      incidencias,
      config
    )

    setTestResult({
      titulo: `Test RN-01: Duración de 6.0 horas continuas (Límite permitido: ${config.max_horas_reserva} h)`,
      esperado: 'invalido',
      resultadoReal: res.valido,
      codigo: res.codigo,
      mensaje: res.mensaje
    })
  }

  const ejecutarTest3_Prestamos = () => {
    const recursoLibre = recursos.find(r => r.estado === 'disponible') || recursos[0]
    const emailTest = 'camila.tech@campuslands.edu'

    const res = validarPrestamoRecurso(
      recursoLibre,
      emailTest,
      Array(config.max_prestamos_activos).fill({
        solicitanteEmail: emailTest,
        estado: 'activo'
      }) as any,
      incidencias,
      config
    )

    setTestResult({
      titulo: `Test RN-02: Solicitar equipo para "${emailTest}" con ${config.max_prestamos_activos} préstamos activos`,
      esperado: 'invalido',
      resultadoReal: res.valido,
      codigo: res.codigo,
      mensaje: res.mensaje
    })
  }

  const ejecutarTest4_MaquinaEstados = () => {
    const res = validarTransicionRecurso('disponible', 'danado')

    setTestResult({
      titulo: 'Test RN-03: Transición ilegal (DISPONIBLE ➔ DAÑADO sin registro previo de préstamo)',
      esperado: 'invalido',
      resultadoReal: res.valido,
      codigo: res.codigo,
      mensaje: res.mensaje
    })
  }

  const ejecutarTest5_BloqueoIntegrador = () => {
    const hamilton = espacios.find(e => e.id === 'ESP-03') || espacios[0]
    const res = validarReservaEspacio(
      hamilton,
      { horaInicio: '10:00', horaFin: '12:00', numPersonas: 10, solicitanteEmail: 'test@campuslands.edu' },
      reservas,
      incidencias,
      config
    )

    setTestResult({
      titulo: `Test RN-04: Intentar reservar "${hamilton.nombre}" con Incidencia Crítica activa [INC-301]`,
      esperado: 'invalido',
      resultadoReal: res.valido,
      codigo: res.codigo,
      mensaje: res.mensaje
    })
  }

  return (
    <div className="space-y-6">
      {/* Banner de Presentación para el Jurado */}
      <div className="holo-panel p-6 sm:p-7 rounded-3xl border border-cyan-500/40 shadow-2xl relative overflow-hidden bg-gradient-to-r from-[#030712] via-[#091129] to-[#030712]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/30">
              <Terminal className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-wide">
                  Panel de Modificación en Vivo & Auditoría (Sustentación Jurado)
                </h2>
                <span className="text-[10px] font-mono uppercase bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 px-2.5 py-0.5 rounded-full font-bold">
                  15 Puntos Bloque B
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Altera las perillas de negocio en tiempo real frente al jurado y ejecuta pruebas de validación instantáneas sin reiniciar el sistema.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleResetConfig}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Restablecer Parámetros Oficiales
          </Button>
        </div>
      </div>

      {/* Grid de Sliders de Negocio */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Factor de Aforo */}
        <div className="holo-card p-5">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
            <span className="font-semibold">Factor Aforo (RN-01)</span>
            <span className="font-mono text-cyan-400 font-black text-sm">{(factorAforo * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="1.0"
            step="0.05"
            value={factorAforo}
            onChange={e => setFactorAforo(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            Ajusta el aforo preventivo del campus. Reducir a 70% bloquea reservas masivas.
          </p>
        </div>

        {/* Max Horas Reserva */}
        <div className="holo-card p-5">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
            <span className="font-semibold">Máx Horas / Reserva (RN-01)</span>
            <span className="font-mono text-cyan-400 font-black text-sm">{maxHoras}h</span>
          </div>
          <input
            type="range"
            min="1"
            max="8"
            step="1"
            value={maxHoras}
            onChange={e => setMaxHoras(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            Límite continuo de uso de aula o cubículo por turno docente.
          </p>
        </div>

        {/* Max Préstamos por Solicitante */}
        <div className="holo-card p-5">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
            <span className="font-semibold">Máx Hardware / Usuario (RN-02)</span>
            <span className="font-mono text-cyan-400 font-black text-sm">{maxPrestamos} eq.</span>
          </div>
          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={maxPrestamos}
            onChange={e => setMaxPrestamos(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            Restricción de equipos prestados simultáneamente a un estudiante.
          </p>
        </div>

        {/* Umbral Confianza IA */}
        <div className="holo-card p-5">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
            <span className="font-semibold">Umbral Confianza IA</span>
            <span className="font-mono text-purple-400 font-black text-sm">{(umbralIA * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0.4"
            max="0.95"
            step="0.05"
            value={umbralIA}
            onChange={e => setUmbralIA(Number(e.target.value))}
            className="w-full accent-purple-400 cursor-pointer"
          />
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            Por debajo de este valor, la IA activa revisión humana obligatoria.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          variant="cyan"
          size="md"
          icon={<Sliders className="w-4 h-4" />}
          onClick={handleApplyConfig}
        >
          Aplicar Parámetros en Caliente
        </Button>
      </div>

      {/* Batería de Pruebas Automatizadas */}
      <div className="holo-panel p-6 sm:p-7 rounded-3xl border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-black text-white tracking-wide">
              Demostración de Reglas en Vivo para el Jurado
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Tiempo de validación: &lt; 20ms
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <button
            onClick={ejecutarTest1_Aforo}
            className="p-4 rounded-2xl bg-black/40 hover:bg-white/5 border border-white/10 hover:border-cyan-400 text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-400">TEST RN-01</span>
              <Play className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400" />
            </div>
            <p className="text-xs text-white font-bold mt-1.5">Exceso de Aforo con Factor</p>
            <span className="text-[11px] text-slate-400 block mt-1">
              Prueba el rechazo inmediato si el aforo solicitado excede capacidad * factor.
            </span>
          </button>

          <button
            onClick={ejecutarTest2_Horas}
            className="p-4 rounded-2xl bg-black/40 hover:bg-white/5 border border-white/10 hover:border-cyan-400 text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-400">TEST RN-01</span>
              <Play className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400" />
            </div>
            <p className="text-xs text-white font-bold mt-1.5">Límite de Horas Continuas</p>
            <span className="text-[11px] text-slate-400 block mt-1">
              Prueba el rechazo de reserva de 6h frente a perilla de {config.max_horas_reserva}h.
            </span>
          </button>

          <button
            onClick={ejecutarTest3_Prestamos}
            className="p-4 rounded-2xl bg-black/40 hover:bg-white/5 border border-white/10 hover:border-cyan-400 text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-400">TEST RN-02</span>
              <Play className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400" />
            </div>
            <p className="text-xs text-white font-bold mt-1.5">Límite de Hardware por Alumno</p>
            <span className="text-[11px] text-slate-400 block mt-1">
              Prueba el bloqueo de préstamo si el usuario ya tiene {config.max_prestamos_activos} equipos activos.
            </span>
          </button>

          <button
            onClick={ejecutarTest4_MaquinaEstados}
            className="p-4 rounded-2xl bg-black/40 hover:bg-white/5 border border-white/10 hover:border-cyan-400 text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-400">TEST RN-03</span>
              <Play className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400" />
            </div>
            <p className="text-xs text-white font-bold mt-1.5">Máquina de Estados Estricta</p>
            <span className="text-[11px] text-slate-400 block mt-1">
              Prueba el rechazo de salto de estado ilegal (Disponible ➔ Dañado).
            </span>
          </button>

          <button
            onClick={ejecutarTest5_BloqueoIntegrador}
            className="p-4 rounded-2xl bg-black/40 hover:bg-white/5 border border-white/10 hover:border-rose-400 text-left transition-all cursor-pointer group sm:col-span-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-rose-400">TEST RN-04 (INTEGRADORA)</span>
              <Play className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-400" />
            </div>
            <p className="text-xs text-white font-bold mt-1.5">Bloqueo por Incidencia Crítica</p>
            <span className="text-[11px] text-slate-400 block mt-1">
              Intenta reservar el Aula Hamilton que tiene incidencia activa [INC-301]. Debe ser rechazada inmediatamente.
            </span>
          </button>
        </div>

        {/* Panel de Salida de la Prueba */}
        {testResult && (
          <div className="mt-5 p-5 rounded-2xl bg-black/80 border border-white/15 shadow-2xl space-y-2.5 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px] uppercase">Resultado de la Validación:</span>
              <div className="flex items-center gap-1.5">
                {testResult.resultadoReal === (testResult.esperado === 'valido') ? (
                  <span className="flex items-center gap-1.5 text-emerald-300 font-bold bg-emerald-950/90 px-3 py-1 rounded-xl border border-emerald-500/50 glow-mint">
                    <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
                    PRUEBA SUPERADA (CORRECTAMENTE RECHAZADA)
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-rose-300 font-bold bg-rose-950/90 px-3 py-1 rounded-xl border border-rose-500/50 glow-crimson">
                    <XCircle className="w-4 h-4 text-[#FB7185]" />
                    FALLO DE VALIDACIÓN
                  </span>
                )}
              </div>
            </div>

            <p className="text-white font-bold text-sm">{testResult.titulo}</p>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-cyan-300">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Código Retornado:</span>
              <span className="text-rose-400 font-bold">{testResult.codigo}</span> · {testResult.mensaje}
            </div>
          </div>
        )}
      </div>

      {/* Referencia Arquitectónica */}
      <div className="holo-panel p-5 rounded-3xl border border-white/10 text-xs space-y-2">
        <div className="flex items-center gap-2 text-slate-300 font-bold">
          <Code2 className="w-4 h-4 text-cyan-400" />
          <span>Mapeo Directo con el Backend de Campuslands</span>
        </div>
        <p className="text-slate-400 leading-relaxed">
          Para el reto de modificación en vivo de 3 minutos, las reglas puras residen en{' '}
          <code className="text-cyan-300 bg-black/40 px-2 py-0.5 rounded border border-white/10">backend/app/config/reglas.py</code>{' '}
          y se ejecutan de manera idéntica en este frontend a través de{' '}
          <code className="text-cyan-300 bg-black/40 px-2 py-0.5 rounded border border-white/10">src/services/rulesEngine.ts</code>.
        </p>
      </div>
    </div>
  )
}
