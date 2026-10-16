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
  BrainCircuit, 
  ArrowRight,
  Zap,
  Activity
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
      etiqueta: 'Caída de Fibra Óptica (Alta)',
      texto: 'Pérdida total de conexión a internet por fibra óptica y latencia de 950ms en los cubículos del piso 2.'
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
    <div className="holo-panel p-6 sm:p-7 rounded-3xl border border-purple-500/40 shadow-2xl relative overflow-hidden bg-gradient-to-br from-[#070A18] via-[#0E122A] to-[#120B24]">
      {/* Luz ambiente neón */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Encabezado del Asistente */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#A78BFA] via-[#F43F5E] to-[#7DD3FC] p-0.5 shadow-lg shadow-purple-500/30">
            <div className="w-full h-full bg-[#030712] rounded-[14px] flex items-center justify-center">
              <BrainCircuit className="w-6 h-6 text-purple-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white tracking-tight">
                Triaje Autónomo & Clasificador Contextual IA
              </h3>
              <span className="text-[10px] font-mono uppercase bg-purple-950/80 border border-purple-500/40 text-purple-300 px-2 py-0.5 rounded-full">
                NLP Semántico
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Clasificación de anomalías, determinación de prioridad y enrutamiento automatizado a cuadrillas técnicas.
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Umbral de Confianza</span>
          <p className="text-lg font-mono font-black text-purple-400 glow-violet">
            {(config.umbral_confianza_ia * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Chips de Casos de Prueba Predefinidos */}
      <div className="relative z-10 mt-5">
        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-widest block mb-2 font-semibold">
          Casos de Prueba en Vivo (Haz click para probar):
        </span>
        <div className="flex flex-wrap gap-2">
          {ejemplosRapidos.map((ej, idx) => (
            <button
              key={idx}
              onClick={() => {
                setPrompt(ej.texto)
                ejecutarTriaje(ej.texto)
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-400/60 text-slate-200 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>{ej.etiqueta}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input de Texto para el Triaje */}
      <div className="relative z-10 mt-4 flex flex-col sm:flex-row gap-2.5">
        <textarea
          rows={2}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Describe la incidencia con tus propias palabras (ej: 'El proyector del Aula Lovelace no enciende y sale chispa')..."
          className="flex-1 p-3.5 bg-black/50 border border-white/15 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 resize-none transition-colors"
        />
        <Button
          variant="violet"
          size="md"
          loading={analizando}
          onClick={() => ejecutarTriaje(prompt)}
          disabled={!prompt.trim()}
          icon={<Send className="w-4 h-4" />}
          className="sm:w-40 self-end sm:self-stretch"
        >
          Analizar IA
        </Button>
      </div>

      {/* Tarjeta de Diagnóstico y Veredicto IA */}
      {resultado && (
        <div className="relative z-10 mt-5 p-5 rounded-2xl bg-black/50 border border-purple-500/40 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-400" />
              <span className="font-extrabold text-sm text-white tracking-wide">
                Diagnóstico del Motor de Inteligencia Artificial
              </span>
            </div>

            {/* Medidor de Confianza */}
            <div className="flex items-center gap-2.5 bg-black/60 px-3.5 py-1.5 rounded-xl border border-white/10">
              <span className="text-xs text-slate-400 font-mono">Confianza:</span>
              <div className="w-24 bg-white/10 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    resultado.confianza >= config.umbral_confianza_ia 
                      ? 'bg-gradient-to-r from-emerald-400 to-cyan-400' 
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
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-slate-400 block mb-1 font-mono uppercase text-[10px]">Categoría Extraída</span>
              <strong className="text-white capitalize text-sm">{resultado.categoria.replace('_', ' ')}</strong>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-slate-400 block mb-1 font-mono uppercase text-[10px]">Severidad / Prioridad</span>
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

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-slate-400 block mb-1 font-mono uppercase text-[10px]">Área Resolutora</span>
              <strong className="text-white capitalize text-sm">{resultado.area.replace('_', ' ')}</strong>
            </div>
          </div>

          {/* Alerta de Revisión Humana si confianza < umbral */}
          {resultado.requiereRevisionHumana && (
            <div className="p-3.5 rounded-2xl bg-amber-950/70 border border-amber-500/50 flex items-start gap-2.5 text-xs text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-300 font-bold uppercase">
                  Revisión Humana Obligatoria (Confianza {(resultado.confianza * 100).toFixed(0)}% &lt; {(config.umbral_confianza_ia * 100).toFixed(0)}%)
                </strong>
                <p className="mt-0.5">
                  El sistema detectó ambigüedad en el texto y exige confirmación humana por parte de un operador de campus para evitar falsos positivos.
                </p>
              </div>
            </div>
          )}

          {/* Razonamiento Semántico */}
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs">
            <span className="text-purple-300 font-bold block mb-1">Razonamiento Semántico:</span>
            <p className="text-slate-200 italic leading-relaxed">"{resultado.razonamiento}"</p>
          </div>

          {/* Sugerencia de Acción Inmediata */}
          <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-xs">
            <span className="text-cyan-300 font-bold block mb-1">Acción Operativa Recomendada:</span>
            <p className="text-slate-100 leading-relaxed">{resultado.sugerenciaAccion}</p>
          </div>

          {/* Botón de Aplicar */}
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
