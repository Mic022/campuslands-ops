/**
 * Piezas de formulario de las pantallas de acceso: campos con icono y validación accesible,
 * campo de contraseña con mostrar/ocultar, casilla, botón con estados y área de avisos.
 */
import React, { useId, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, ArrowRight, Check, CheckCircle2, Eye, EyeOff, Info, Loader2, Lock, TriangleAlert, X } from 'lucide-react'
import { Requisito, fortalezaClave } from '../../auth/validacion'

// ---------- Campo de texto ----------

interface CampoProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  etiqueta: string
  icono: React.ReactNode
  error?: string | null
  ayuda?: string
  accesorio?: React.ReactNode
}

export const CampoTexto = React.forwardRef<HTMLInputElement, CampoProps>(
  ({ etiqueta, icono, error, ayuda, accesorio, id, className = '', ...props }, ref) => {
    const generado = useId()
    const campoId = id ?? generado
    const mensajeId = `${campoId}-mensaje`
    return (
      <div className="campo-acceso">
        <label htmlFor={campoId} className="mb-1.5 block text-[13px] font-medium text-slate-300">
          {etiqueta}
        </label>
        <div
          className={`group relative flex items-center rounded-xl border bg-white/[0.03] transition duration-200
            focus-within:bg-white/[0.05] focus-within:ring-4 hover:border-white/20
            ${error
              ? 'border-rose-400/60 focus-within:border-rose-400/80 focus-within:ring-rose-400/10'
              : 'border-white/10 focus-within:border-sky-300/60 focus-within:ring-sky-300/10'}`}
        >
          <span
            className={`pointer-events-none pl-3.5 transition-colors [&>svg]:h-[18px] [&>svg]:w-[18px]
              ${error ? 'text-rose-300' : 'text-slate-500 group-focus-within:text-sky-300'}`}
            aria-hidden="true"
          >
            {icono}
          </span>
          <input
            ref={ref}
            id={campoId}
            aria-invalid={Boolean(error)}
            aria-describedby={error || ayuda ? mensajeId : undefined}
            className={`h-12 w-full min-w-0 bg-transparent px-3 text-[15px] text-white placeholder:text-slate-500 focus:outline-none ${className}`}
            {...props}
          />
          {accesorio}
        </div>
        {/* Altura reservada: los mensajes no desplazan el formulario. */}
        <div id={mensajeId} className="min-h-[1.375rem] pt-1 text-xs" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            {error ? (
              <motion.p
                key="error"
                initial={{ opacity: 0, y: -3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5 text-rose-300"
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
              </motion.p>
            ) : ayuda ? (
              <motion.p key="ayuda" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-slate-500">
                {ayuda}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    )
  }
)
CampoTexto.displayName = 'CampoTexto'

// ---------- Contraseña con mostrar/ocultar y aviso de Bloq Mayús ----------

type CampoClaveProps = Omit<CampoProps, 'icono' | 'type' | 'accesorio'>

export const CampoClave = React.forwardRef<HTMLInputElement, CampoClaveProps>(({ ayuda, onKeyUp, ...props }, ref) => {
  const [visible, setVisible] = useState(false)
  const [mayusculas, setMayusculas] = useState(false)
  return (
    <CampoTexto
      ref={ref}
      {...props}
      type={visible ? 'text' : 'password'}
      icono={<Lock />}
      ayuda={mayusculas ? 'Bloq Mayús está activado.' : ayuda}
      onKeyUp={e => {
        setMayusculas(e.getModifierState?.('CapsLock') ?? false)
        onKeyUp?.(e)
      }}
      accesorio={
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          className="mr-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 cursor-pointer"
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
        </button>
      }
    />
  )
})
CampoClave.displayName = 'CampoClave'

// ---------- Casilla ----------

export const Casilla: React.FC<{
  marcada: boolean
  onCambio: (v: boolean) => void
  children: React.ReactNode
  descripcion?: string
}> = ({ marcada, onCambio, children, descripcion }) => {
  const id = useId()
  return (
    <label htmlFor={id} className="group flex cursor-pointer select-none items-start gap-2.5">
      <span className="relative mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center">
        <input
          id={id}
          type="checkbox"
          checked={marcada}
          onChange={e => onCambio(e.target.checked)}
          aria-describedby={descripcion ? `${id}-desc` : undefined}
          className="peer absolute inset-0 cursor-pointer appearance-none rounded-[5px] border border-white/20 bg-white/[0.03] transition checked:border-sky-300 checked:bg-sky-300 group-hover:border-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1124]"
        />
        <Check className="pointer-events-none relative h-3 w-3 text-slate-950 opacity-0 transition peer-checked:opacity-100" strokeWidth={3.5} />
      </span>
      <span className="text-[13px] leading-snug text-slate-300">
        {children}
        {descripcion && (
          <span id={`${id}-desc`} className="block text-[11.5px] text-slate-500">
            {descripcion}
          </span>
        )}
      </span>
    </label>
  )
}

// ---------- Botón principal con estados ----------

export type EstadoBoton = 'normal' | 'cargando' | 'exito' | 'error'

export const BotonAcceso: React.FC<{
  estado: EstadoBoton
  children: React.ReactNode
  textoCargando?: string
  textoExito?: string
  disabled?: boolean
}> = ({ estado, children, textoCargando = 'Verificando…', textoExito = 'Listo', disabled }) => (
  <motion.button
    type="submit"
    disabled={disabled || estado === 'cargando' || estado === 'exito'}
    aria-busy={estado === 'cargando'}
    animate={estado === 'error' ? { x: [0, -7, 7, -5, 5, 0] } : { x: 0 }}
    transition={{ duration: 0.4 }}
    whileTap={{ scale: 0.985 }}
    className={`boton-acceso group relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl text-[15px] font-semibold
      transition-[background-color,box-shadow,color] duration-200 focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed cursor-pointer
      ${estado === 'exito'
        ? 'bg-emerald-400 text-slate-950 shadow-[0_10px_30px_-10px_rgba(52,211,153,0.7)] focus-visible:ring-emerald-300/30'
        : estado === 'error'
          ? 'bg-rose-500 text-white shadow-[0_10px_30px_-10px_rgba(244,63,94,0.7)] focus-visible:ring-rose-300/30'
          : 'bg-sky-300 text-slate-950 shadow-[0_10px_30px_-12px_rgba(125,211,252,0.8)] hover:bg-sky-200 hover:shadow-[0_14px_36px_-12px_rgba(125,211,252,0.9)] focus-visible:ring-sky-300/30 disabled:opacity-60'}`}
  >
    <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" aria-hidden="true" />
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={estado}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.16 }}
        className="relative flex items-center gap-2"
      >
        {estado === 'cargando' && (<><Loader2 className="h-[18px] w-[18px] animate-spin" /> {textoCargando}</>)}
        {estado === 'exito' && (<><CheckCircle2 className="h-[18px] w-[18px]" /> {textoExito}</>)}
        {estado === 'error' && (<><X className="h-[18px] w-[18px]" /> {children}</>)}
        {estado === 'normal' && (
          <>
            {children}
            <ArrowRight className="h-[18px] w-[18px] transition-transform duration-200 group-hover:translate-x-0.5" />
          </>
        )}
      </motion.span>
    </AnimatePresence>
  </motion.button>
)

// ---------- Área de avisos ----------

export type TonoAviso = 'error' | 'exito' | 'info' | 'advertencia'

export interface AvisoDatos {
  tono: TonoAviso
  titulo: string
  mensaje?: string
}

const ESTILO_AVISO: Record<TonoAviso, { caja: string; icono: React.ReactNode }> = {
  error: { caja: 'border-rose-400/30 bg-rose-500/[0.08] text-rose-100', icono: <AlertCircle className="h-[18px] w-[18px] text-rose-300" /> },
  exito: { caja: 'border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-50', icono: <CheckCircle2 className="h-[18px] w-[18px] text-emerald-300" /> },
  info: { caja: 'border-sky-300/30 bg-sky-400/[0.08] text-sky-50', icono: <Info className="h-[18px] w-[18px] text-sky-300" /> },
  advertencia: { caja: 'border-amber-300/30 bg-amber-400/[0.08] text-amber-50', icono: <TriangleAlert className="h-[18px] w-[18px] text-amber-300" /> }
}

export const AvisoAcceso: React.FC<{ aviso: AvisoDatos | null; onCerrar?: () => void }> = ({ aviso, onCerrar }) => (
  <div aria-live="assertive" role={aviso?.tono === 'error' ? 'alert' : 'status'}>
    <AnimatePresence initial={false}>
      {aviso && (
        <motion.div
          key={`${aviso.tono}-${aviso.titulo}-${aviso.mensaje}`}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <div className={`mb-5 flex items-start gap-3 rounded-xl border px-3.5 py-3 ${ESTILO_AVISO[aviso.tono].caja}`}>
            <span className="mt-px shrink-0">{ESTILO_AVISO[aviso.tono].icono}</span>
            <div className="min-w-0 flex-1 text-[13px] leading-snug">
              <p className="font-semibold">{aviso.titulo}</p>
              {aviso.mensaje && <p className="mt-0.5 text-[12.5px] opacity-80">{aviso.mensaje}</p>}
            </div>
            {onCerrar && (
              <button
                type="button"
                onClick={onCerrar}
                className="-m-1 rounded-md p-1 opacity-60 transition hover:bg-white/10 hover:opacity-100 cursor-pointer"
                aria-label="Cerrar aviso"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
)

// ---------- Requisitos de contraseña ----------

export const RequisitosClave: React.FC<{ requisitos: Requisito[]; clave: string }> = ({ requisitos, clave }) => {
  const fuerza = fortalezaClave(clave)
  const cumplidos = requisitos.every(r => r.cumple)
  const etiquetas = ['Muy débil', 'Débil', 'Aceptable', 'Buena', 'Excelente']
  const colores = ['bg-rose-400', 'bg-rose-400', 'bg-amber-300', 'bg-sky-300', 'bg-emerald-400']
  return (
    <div className="-mt-1 mb-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5" aria-label="Requisitos de la contraseña">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <p className="text-[12px] font-medium text-slate-300">Tu contraseña debe tener:</p>
        {clave && (
          <span className={`text-[11px] font-medium ${cumplidos ? 'text-emerald-300' : 'text-slate-400'}`}>
            {etiquetas[cumplidos ? Math.max(2, fuerza) : Math.min(fuerza, 1)]}
          </span>
        )}
      </div>
      <div className="mb-3 grid grid-cols-4 gap-1" aria-hidden="true">
        {[0, 1, 2, 3].map(i => (
          <span
            key={i}
            className={`h-1 rounded-full transition-colors duration-300 ${
              clave && i < (cumplidos ? Math.max(2, fuerza) : Math.min(fuerza, 1)) ? colores[cumplidos ? Math.max(2, fuerza) : 1] : 'bg-white/10'
            }`}
          />
        ))}
      </div>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {requisitos.map(r => (
          <li key={r.id} className={`flex items-center gap-2 text-[12px] transition-colors ${r.cumple ? 'text-emerald-200' : 'text-slate-400'}`}>
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition ${
                r.cumple ? 'border-emerald-400 bg-emerald-400 text-slate-950' : 'border-white/15'
              }`}
            >
              {r.cumple && <Check className="h-2.5 w-2.5" strokeWidth={4} />}
            </span>
            <span>
              {r.texto}
              <span className="sr-only">{r.cumple ? ' (cumplido)' : ' (pendiente)'}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
