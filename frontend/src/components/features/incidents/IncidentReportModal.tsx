import React, { useState, useEffect } from 'react'
import { 
  Espacio, 
  Recurso, 
  CategoriaIncidencia, 
  PrioridadIncidencia, 
  AreaResolutora, 
  TriajeIAResponse,
  ReglasConfig
} from '../../../types/domain'
import { apiClient } from '../../../services/apiClient'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { Badge } from '../../ui/Badge'
import { 
  AlertTriangle, 
  Sparkles, 
  Building2, 
  Laptop, 
  FileText, 
  ShieldAlert,
  Bot
} from 'lucide-react'

interface IncidentReportModalProps {
  isOpen: boolean
  onClose: () => void
  espacios: Espacio[]
  recursos: Recurso[]
  config: ReglasConfig
  triajePrecargado?: { resultado: TriajeIAResponse; descripcion: string } | null
  onSubmitIncidencia: (datos: {
    titulo: string
    descripcion: string
    espacioId?: string
    recursoId?: string
    categoria: CategoriaIncidencia
    prioridad: PrioridadIncidencia
    area: AreaResolutora
    confianzaIA: number
    razonamientoIA: string
    sugerenciaAccion: string
    origenTriaje: 'ia' | 'manual'
  }) => Promise<void>
}

export const IncidentReportModal: React.FC<IncidentReportModalProps> = ({
  isOpen,
  onClose,
  espacios,
  recursos,
  config,
  triajePrecargado,
  onSubmitIncidencia
}) => {
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [espacioId, setEspacioId] = useState<string>('')
  const [recursoId, setRecursoId] = useState<string>('')
  const [categoria, setCategoria] = useState<CategoriaIncidencia>('infraestructura')
  const [prioridad, setPrioridad] = useState<PrioridadIncidencia>('alta')
  const [area, setArea] = useState<AreaResolutora>('mantenimiento')
  const [confianzaIA, setConfianzaIA] = useState<number>(0.9)
  const [razonamientoIA, setRazonamientoIA] = useState<string>('Clasificación manual')
  const [sugerenciaAccion, setSugerenciaAccion] = useState<string>('Inspección de rutina')
  const [origenTriaje, setOrigenTriaje] = useState<'ia' | 'manual'>('manual')
  const [analizandoIA, setAnalizandoIA] = useState(false)
  const [loading, setLoading] = useState(false)

  // Pre-cargar si viene desde el asistente
  useEffect(() => {
    if (triajePrecargado) {
      setDescripcion(triajePrecargado.descripcion)
      setTitulo(triajePrecargado.descripcion.slice(0, 50) + '...')
      setCategoria(triajePrecargado.resultado.categoria)
      setPrioridad(triajePrecargado.resultado.prioridad)
      setArea(triajePrecargado.resultado.area)
      setConfianzaIA(triajePrecargado.resultado.confianza)
      setRazonamientoIA(triajePrecargado.resultado.razonamiento)
      setSugerenciaAccion(triajePrecargado.resultado.sugerenciaAccion)
      setOrigenTriaje('ia')
    }
  }, [triajePrecargado])

  const handleAnalizarConIA = async () => {
    if (!descripcion.trim()) return
    try {
      setAnalizandoIA(true)
      const res = await apiClient.triajeConIA(descripcion)
      if (!titulo.trim()) {
        setTitulo(descripcion.slice(0, 45) + (descripcion.length > 45 ? '...' : ''))
      }
      setCategoria(res.categoria)
      setPrioridad(res.prioridad)
      setArea(res.area)
      setConfianzaIA(res.confianza)
      setRazonamientoIA(res.razonamiento)
      setSugerenciaAccion(res.sugerenciaAccion)
      setOrigenTriaje('ia')
    } finally {
      setAnalizandoIA(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim() || !descripcion.trim()) return

    try {
      setLoading(true)
      await onSubmitIncidencia({
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        espacioId: espacioId || undefined,
        recursoId: recursoId || undefined,
        categoria,
        prioridad,
        area,
        confianzaIA,
        razonamientoIA,
        sugerenciaAccion,
        origenTriaje
      })
      onClose()
      setTitulo('')
      setDescripcion('')
      setEspacioId('')
      setRecursoId('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Incidencia / Solicitud Operativa"
      subtitle="Triaje inteligente y enrutamiento con motor de IA"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Descripción del Hecho con botón de IA */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-slate-300">
              Descripción detallada de la anomalía
            </label>
            <button
              type="button"
              onClick={handleAnalizarConIA}
              disabled={!descripcion.trim() || analizandoIA}
              className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{analizandoIA ? 'Analizando...' : 'Auto-clasificar con IA'}</span>
            </button>
          </div>
          <textarea
            required
            rows={3}
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            placeholder="Describe qué ocurrió, si hay olor, calor, fallas de conexión o daños en los equipos..."
            className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* Título de la Incidencia */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Título Sintético de la Incidencia
          </label>
          <input
            type="text"
            required
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            placeholder="Ej. Sobrecalentamiento crítico de condensador en Aula Hamilton"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* Espacio o Recurso Afectado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Espacio Afectado (Opcional)
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <select
                value={espacioId}
                onChange={e => setEspacioId(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                <option value="">-- Ninguno / Áreas comunes --</option>
                {espacios.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.nombre} (Piso {e.piso})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Recurso Tecnológico (Opcional)
            </label>
            <div className="relative">
              <Laptop className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <select
                value={recursoId}
                onChange={e => setRecursoId(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                <option value="">-- Ninguno / Falla física --</option>
                {recursos.map(r => (
                  <option key={r.id} value={r.id}>
                    [{r.codigo}] {r.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Clasificación de Triaje */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Categoría
            </label>
            <select
              value={categoria}
              onChange={e => setCategoria(e.target.value as any)}
              className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white capitalize focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="infraestructura">Infraestructura</option>
              <option value="equipo_tecnologico">Equipo Tecnológico</option>
              <option value="conectividad">Conectividad</option>
              <option value="limpieza">Limpieza</option>
              <option value="seguridad">Seguridad</option>
              <option value="bienestar">Bienestar</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Prioridad / Severidad
            </label>
            <select
              value={prioridad}
              onChange={e => setPrioridad(e.target.value as any)}
              className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white capitalize focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="critica">Crítica (RN-04 Bloqueo)</option>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Área Resolutora
            </label>
            <select
              value={area}
              onChange={e => setArea(e.target.value as any)}
              className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white capitalize focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="mantenimiento">Mantenimiento</option>
              <option value="soporte_ti">Soporte TI</option>
              <option value="bienestar">Bienestar</option>
              <option value="seguridad">Seguridad</option>
              <option value="administracion">Administración</option>
            </select>
          </div>
        </div>

        {/* Advertencia RN-04 si es crítica y tiene espacio */}
        {espacioId && (prioridad === 'critica' || prioridad === 'alta') && (
          <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 flex items-start gap-2.5 text-xs text-rose-200">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-rose-300 font-bold">
                Efecto RN-04: Inhabilitación Inmediata
              </strong>
              <p className="mt-0.5">
                Al guardar esta incidencia con severidad {prioridad.toUpperCase()}, el espacio seleccionado pasará automáticamente a estado INHABILITADO, bloqueando cualquier nueva reserva.
              </p>
            </div>
          </div>
        )}

        {/* Diagnóstico IA si está activo */}
        {origenTriaje === 'ia' && (
          <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-200 flex items-start gap-2">
            <Bot className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block text-purple-300">
                Diagnóstico IA (Confianza: {(confianzaIA * 100).toFixed(0)}%):
              </span>
              <p className="text-slate-300 italic mt-0.5">"{razonamientoIA}"</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="danger"
            loading={loading}
            icon={<AlertTriangle className="w-4 h-4" />}
          >
            Emitir Incidencia Oficial
          </Button>
        </div>
      </form>
    </Modal>
  )
}
