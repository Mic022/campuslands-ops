import React, { useState } from 'react'
import { TriajeIAResponse, ReglasConfig } from '../../../types/domain'
import { apiClient } from '../../../services/apiClient'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { 
  Sparkles, 
  Send, 
  Bot, 
  AlertTriangle, 
  CheckCircle2, 
  BrainCircuit, 
  ShieldAlert, 
  FileText,
  HelpCircle,
  ArrowRight
} from 'lucide-react'

interface AITriageAssistantProps {
  config: ReglasConfig
  onAplicarTriaje: (resultado: TriajeIAResponse, descripcion: string) => void
}

export const AITriageAssistant: React.FC<AITriageAssistantProps> = ({
  config,
  onAplicarTriaje
}) => {
  const [prompt, setPrompt] = useState('')
  const [analizando, setAnalizando] = useState(false)
  const [resultado, setResultado] = useState<TriajeIAResponse | null>(null)

  const ejemplosRapidos = [
    {
      etiqueta: 'Falla Eléctrica / Humo (Crítica)',
      texto: 'Se detectaron chispas, humo y fuerte olor a quemado en el tablero de breakers del Laboratorio Turing.'
    },
    {
      etiqueta: 'Caída de Red / Switch (Alta)',
      texto: 'Pérdida total de conexión a internet por fibra óptica y latencia severa en los cubículos del piso 2.'
    },
    {
      etiqueta: 'Batería Hinchada (Alta/Media)',
      texto: 'La laptop Dell XPS presenta la batería visiblemente hinchada y recalentamiento al conectarse.'
    },
    {
      etiqueta: 'Caso Ambiguo (Revisión Humana)',
      texto: 'Hay un ruido extraño en una de las esquinas del pasillo cerca del dispensador.'
    }
  ]

  const ejecutarTriaje = async (texto: string) => {
    if (!texto.trim()) return
    try {
      setAnalizando(true)
      const res = await apiClient.triajeConIA(texto)
      setResultado(res)
    } finally {
      setAnalizando(false)
    }
  }

  return (
    <div className="glass-panel p-6 rounded-2xl border border-purple-500/30 shadow-2xl bg-gradient-to-br from-slate-950 via-[#0E1322] to-purple-950/20">
      {/* Encabezado del Asistente */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-500/20">
            <BrainCircuit className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">Triaje Autónomo & Clasificador IA</h3>
              <span className="text-[10px] font-mono uppercase bg-purple-950 text-purple-400 px-2 py-0.5 rounded border border-purple-500/30">
                NLP Semántico
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Clasificación contextual en tiempo real, priorización y enrutamiento inteligente de solicitudes.
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-slate-400 font-mono">Umbral Confianza Mínimo</span>
          <p className="text-sm font-mono font-bold text-purple-400">
            {(config.umbral_confianza_ia * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Selector de Prompts Rápidos / Casos de Prueba */}
      <div className="mt-4">
        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-2">
          Casos de Prueba Predefinidos:
        </span>
        <div className="flex flex-wrap gap-2">
          {ejemplosRapidos.map((ej, idx) => (
            <button
              key={idx}
              onClick={() => {
                setPrompt(ej.texto)
                ejecutarTriaje(ej.texto)
              }}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/50 text-slate-300 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>{ej.etiqueta}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input de Texto para el Triaje */}
      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <textarea
          rows={2}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Escribe la descripción de la anomalía o incidente (ej: 'El proyector del Aula Lovelace no enciende y emite zumbido')..."
          className="flex-1 p-3 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none"
        />
        <Button
          variant="violet"
          size="md"
          loading={analizando}
          onClick={() => ejecutarTriaje(prompt)}
          disabled={!prompt.trim()}
          icon={<Send className="w-4 h-4" />}
          className="sm:w-36 self-end sm:self-stretch"
        >
          Analizar IA
        </Button>
      </div>

      {/* Visualización del Resultado de Triaje IA */}
      {resultado && (
        <div className="mt-5 p-5 rounded-xl bg-slate-900/90 border border-purple-500/40 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-400" />
              <span className="font-bold text-sm text-white">Veredicto del Motor de Inteligencia Artificial</span>
            </div>

            {/* Medidor de Confianza */}
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400">Nivel de Confianza:</span>
              <div className="w-20 bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    resultado.confianza >= config.umbral_confianza_ia 
                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-400' 
                      : 'bg-amber-400'
                  }`}
                  style={{ width: `${resultado.confianza * 100}%` }}
                />
              </div>
              <span className="font-mono text-xs font-bold text-white">
                {(resultado.confianza * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Grilla de Diagnóstico */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 block mb-1">Categoría Sugerida</span>
              <strong className="text-white capitalize text-sm">{resultado.categoria.replace('_', ' ')}</strong>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 block mb-1">Severidad / Prioridad</span>
              <Badge
                label={resultado.prioridad}
                variant={
                  resultado.prioridad === 'critica'
                    ? 'rose'
                    : resultado.prioridad === 'alta'
                    ? 'amber'
                    : 'sky'
                }
              />
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 block mb-1">Área Resolutora Asignada</span>
              <strong className="text-white capitalize text-sm">{resultado.area.replace('_', ' ')}</strong>
            </div>
          </div>

          {/* Alerta de Revisión Humana si confianza < umbral */}
          {resultado.requiereRevisionHumana && (
            <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/50 flex items-start gap-2.5 text-xs text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-300 font-bold">
                  Advertencia: Confianza por debajo del umbral de negocio ({(config.umbral_confianza_ia * 100).toFixed(0)}%)
                </strong>
                <p className="mt-0.5">
                  El sistema exige confirmación o triaje manual por un operador humano para evitar falsos positivos o clasificaciones erróneas.
                </p>
              </div>
            </div>
          )}

          {/* Razonamiento Semántico */}
          <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 text-xs">
            <span className="text-purple-400 font-semibold block mb-1">Razonamiento Semántico:</span>
            <p className="text-slate-300 italic leading-relaxed">"{resultado.razonamiento}"</p>
          </div>

          {/* Sugerencia de Acción Inmediata */}
          <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/30 text-xs">
            <span className="text-cyan-400 font-semibold block mb-1">Acción Operativa Recomendada:</span>
            <p className="text-slate-200 leading-relaxed">{resultado.sugerenciaAccion}</p>
          </div>

          {/* Botón de Aplicar al Formulario Oficial */}
          <div className="flex justify-end pt-2">
            <Button
              variant="cyan"
              size="sm"
              icon={<ArrowRight className="w-4 h-4" />}
              onClick={() => onAplicarTriaje(resultado, prompt)}
            >
              Llenar Formulario Oficial con este Triaje
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
