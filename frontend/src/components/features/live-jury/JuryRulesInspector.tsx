import React from 'react'
import { ReglasConfig } from '../../../types/domain'
import { Badge } from '../../ui/Badge'
import { 
  Sliders, 
  Terminal, 
  ShieldCheck, 
  CheckCircle2, 
  Code2, 
  Clock, 
  Users, 
  Laptop, 
  Sparkles, 
  AlertTriangle 
} from 'lucide-react'

interface JuryRulesInspectorProps {
  config: ReglasConfig
}

export const JuryRulesInspector: React.FC<JuryRulesInspectorProps> = ({ config }) => {
  const reglasCards = [
    // Mismos códigos que devuelve el backend ({codigo, mensaje}) y que documenta el README.
    {
      codigo: 'RN-01',
      titulo: 'Sin reservas solapadas',
      descripcion: 'Un espacio no admite dos reservas activas que se crucen. Intervalos [inicio, fin): una reserva puede empezar justo cuando termina otra.',
      icono: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
      acento: 'border-emerald-500/40 bg-emerald-950/20',
      tagColor: 'emerald' as const,
      valores: [{ label: 'Archivo', valor: 'rules/espacios.py' }]
    },
    {
      codigo: 'RN-02',
      titulo: 'Aforo del espacio',
      descripcion: `Los asistentes no pueden superar el aforo oficial × factor (${Math.round(config.factor_aforo * 100)} %).`,
      icono: <Users className="w-5 h-5 text-emerald-400" />,
      acento: 'border-emerald-500/40 bg-emerald-950/20',
      tagColor: 'emerald' as const,
      valores: [{ label: 'Factor aforo', valor: `${Math.round(config.factor_aforo * 100)} %` }]
    },
    {
      codigo: 'RN-03',
      titulo: 'Máquina de estados de recursos',
      descripcion: 'Un equipo solo cambia de estado por transiciones permitidas (disponible → prestado → disponible/dañado → mantenimiento → disponible). No se presta lo que no está disponible.',
      icono: <ShieldCheck className="w-5 h-5 text-cyan-400" />,
      acento: 'border-cyan-500/40 bg-cyan-950/20',
      tagColor: 'sky' as const,
      valores: [{ label: 'Archivo', valor: 'config/catalogos.py' }]
    },
    {
      codigo: 'RN-04',
      titulo: 'Bloqueo integrador por incidencias',
      descripcion: `No se reserva ni presta lo que está fuera de servicio o tiene una incidencia abierta de prioridad ${config.prioridades_bloqueantes.join(' o ')}. Al confirmarla sobre un equipo, este pasa a mantenimiento y bloquea también su sala.`,
      icono: <AlertTriangle className="w-5 h-5 text-rose-400" />,
      acento: 'border-rose-500/40 bg-rose-950/20',
      tagColor: 'rose' as const,
      valores: [{ label: 'Bloqueantes', valor: config.prioridades_bloqueantes.join(', ') }]
    },
    {
      codigo: 'RN-05',
      titulo: 'Horario y duración',
      descripcion: `Reservas entre ${config.hora_apertura}:00 y ${config.hora_cierre}:00, de máximo ${config.max_horas_reserva} h y nunca en el pasado.`,
      icono: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
      acento: 'border-emerald-500/40 bg-emerald-950/20',
      tagColor: 'emerald' as const,
      valores: [
        { label: 'Horario', valor: `${config.hora_apertura}h – ${config.hora_cierre}h` },
        { label: 'Máx.', valor: `${config.max_horas_reserva} h` }
      ]
    },
    {
      codigo: 'RN-06',
      titulo: 'Préstamos activos por persona',
      descripcion: `Una persona puede tener como máximo ${config.max_prestamos_activos} préstamos activos al mismo tiempo.`,
      icono: <Laptop className="w-5 h-5 text-purple-400" />,
      acento: 'border-purple-500/40 bg-purple-950/20',
      tagColor: 'purple' as const,
      valores: [{ label: 'Cupo', valor: `${config.max_prestamos_activos} equipos` }]
    },
    {
      codigo: 'RN-07',
      titulo: 'Devolución válida',
      descripcion: 'Solo se devuelve un préstamo activo, en una fecha no anterior a la salida y a un estado permitido del equipo.',
      icono: <Laptop className="w-5 h-5 text-purple-400" />,
      acento: 'border-purple-500/40 bg-purple-950/20',
      tagColor: 'purple' as const,
      valores: [{ label: 'Archivo', valor: 'rules/recursos.py' }]
    },
    {
      codigo: 'RN-08',
      titulo: 'Ciclo de vida de incidencias',
      descripcion: 'Abierta → en proceso → resuelta. Una incidencia resuelta no se reabre: se reporta una nueva.',
      icono: <AlertTriangle className="w-5 h-5 text-rose-400" />,
      acento: 'border-rose-500/40 bg-rose-950/20',
      tagColor: 'rose' as const,
      valores: [{ label: 'Archivo', valor: 'services/incidencias.py' }]
    },
    {
      codigo: 'RN-IA',
      titulo: 'Triaje Asistido por Inteligencia Artificial',
      descripcion: `Clasifica incidencias en lenguaje natural. Si la confianza es inferior a ${Math.round(config.umbral_confianza_ia * 100)}%, requiere revisión humana obligatoria antes de confirmar.`,
      icono: <Sparkles className="w-5 h-5 text-amber-400" />,
      acento: 'border-amber-500/40 bg-amber-950/20',
      tagColor: 'amber' as const,
      valores: [
        { label: 'Umbral Confianza', valor: `${Math.round(config.umbral_confianza_ia * 100)}%` },
        { label: 'Largo Máximo', valor: `${config.max_largo_descripcion} caracteres` }
      ]
    }
  ]

  return (
    <div className="space-y-6">
      {/* Panel Informativo Superior */}
      <div className="holo-panel p-6 sm:p-7 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-wide flex items-center gap-2">
                Parámetros de Negocio Vigentes
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/80 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                  GET /api/reglas
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Valores configurados en el backend FastAPI y reflejados en tiempo real en la interfaz.
              </p>
            </div>
          </div>

          <Badge label="SERVIDOR ACTIVO" variant="emerald" size="md" />
        </div>

        {/* Rejilla de Parámetros Activos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6">
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10">
            <span className="text-slate-400 text-xs font-mono flex items-center gap-1.5 mb-1">
              <Users className="w-3.5 h-3.5 text-emerald-400" /> Factor Aforo
            </span>
            <div className="text-xl font-black text-emerald-400">
              {Math.round(config.factor_aforo * 100)} %
            </div>
            <span className="text-[10px] text-slate-500 block mt-1">Multiplicador sobre aforo</span>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/10">
            <span className="text-slate-400 text-xs font-mono flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-cyan-400" /> Horas Máximas
            </span>
            <div className="text-xl font-black text-cyan-400">
              {config.max_horas_reserva} h
            </div>
            <span className="text-[10px] text-slate-500 block mt-1">Por sesión de reserva</span>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/10">
            <span className="text-slate-400 text-xs font-mono flex items-center gap-1.5 mb-1">
              <Laptop className="w-3.5 h-3.5 text-purple-400" /> Cupo Préstamos
            </span>
            <div className="text-xl font-black text-purple-400">
              {config.max_prestamos_activos}
            </div>
            <span className="text-[10px] text-slate-500 block mt-1">Equipos simultáneos</span>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/10">
            <span className="text-slate-400 text-xs font-mono flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Umbral IA
            </span>
            <div className="text-xl font-black text-amber-400">
              {Math.round(config.umbral_confianza_ia * 100)} %
            </div>
            <span className="text-[10px] text-slate-500 block mt-1">Mínimo para auto-aprobación</span>
          </div>
        </div>

        {/* Tarjetas de Reglas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reglasCards.map((regla) => (
            <div
              key={regla.codigo}
              className={`p-5 rounded-2xl border transition-all ${regla.acento}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs font-bold text-white bg-black/40 border border-white/10 px-2.5 py-1 rounded-lg">
                  {regla.codigo}
                </span>
                {regla.icono}
              </div>

              <h4 className="text-sm font-black text-white mb-1.5">{regla.titulo}</h4>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                {regla.descripcion}
              </p>

              <div className="pt-3 border-t border-white/10 flex flex-wrap gap-2 text-[11px] font-mono">
                {regla.valores.map((v, i) => (
                  <span
                    key={i}
                    className="bg-black/30 border border-white/10 px-2 py-0.5 rounded text-slate-300"
                  >
                    <strong className="text-slate-400">{v.label}:</strong> {v.valor}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Explicación Técnica y Reto en Vivo */}
      <div className="holo-panel p-6 rounded-3xl border border-white/10 space-y-3">
        <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span>Modificación en Vivo (Reto de 3 Minutos)</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Las reglas operativas del campus se administran centralmente en{' '}
          <code className="text-amber-300 bg-black/50 px-2 py-0.5 rounded border border-amber-500/30">
            backend/app/config/reglas.py
          </code>.
          Cuando el jurado modifique cualquier parámetro (por ejemplo, reducir el aforo al 50% con{' '}
          <code className="text-cyan-300 bg-black/50 px-2 py-0.5 rounded border border-cyan-500/30">
            FACTOR_AFORO = 0.5
          </code>{' '}
          o cambiar{' '}
          <code className="text-cyan-300 bg-black/50 px-2 py-0.5 rounded border border-cyan-500/30">
            MAX_PRESTAMOS_ACTIVOS = 1
          </code>), el backend aplicará inmediatamente las nuevas restricciones y responderá con los códigos de error oficiales.
        </p>
        <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400 pt-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Frontend desacoplado: una sola fuente de verdad en el servidor.</span>
        </div>
      </div>
    </div>
  )
}
