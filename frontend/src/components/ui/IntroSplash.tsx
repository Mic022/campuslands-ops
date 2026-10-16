import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LOGO_URL } from '../layout/Brand'

const PASOS = [
  'Inicializando gemelo digital',
  'Cargando plano de Torre Zenith · Nivel 6',
  'Sincronizando reservas en tiempo real',
  'Motor de reglas y triaje IA en línea'
]
const DURACION_MS = 4600
const NOMBRE = 'CAMPUSLANDS'

/** Salto a hiperespacio: estrellas que nacen en el centro y aceleran hacia los bordes. */
function useHiperespacio(ref: React.RefObject<HTMLCanvasElement>, activo: boolean) {
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !activo) return
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    let w = 0
    let h = 0
    const ajustar = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    ajustar()
    const estrellas = Array.from({ length: 520 }, () => ({
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      z: Math.random()
    }))
    const inicio = performance.now()
    let raf = 0
    const dibujar = (t: number) => {
      const e = (t - inicio) / 1000
      // Acelera hasta ~1,6 s y luego frena hasta quedar casi quieto.
      const vel = e < 1.6 ? 0.15 + e * 0.9 : Math.max(0.04, 1.6 - (e - 1.6) * 0.9)
      ctx.fillStyle = 'rgba(2, 3, 10, 0.35)'
      ctx.fillRect(0, 0, w, h)
      const cx = w / 2
      const cy = h / 2
      const escala = Math.max(w, h) * 0.6
      for (const s of estrellas) {
        const zPrev = s.z
        s.z -= vel * 0.016
        if (s.z <= 0.02) {
          s.x = (Math.random() - 0.5) * 2
          s.y = (Math.random() - 0.5) * 2
          s.z = 1
          continue
        }
        const px = cx + (s.x / s.z) * escala * 0.25
        const py = cy + (s.y / s.z) * escala * 0.25
        const qx = cx + (s.x / zPrev) * escala * 0.25
        const qy = cy + (s.y / zPrev) * escala * 0.25
        const brillo = Math.min(1, (1 - s.z) * 1.4)
        ctx.strokeStyle = `rgba(${200 + brillo * 55},${225 + brillo * 30},255,${brillo})`
        ctx.lineWidth = Math.max(0.6, (1 - s.z) * 2.4)
        ctx.beginPath()
        ctx.moveTo(qx, qy)
        ctx.lineTo(px, py)
        ctx.stroke()
      }
      raf = requestAnimationFrame(dibujar)
    }
    raf = requestAnimationFrame(dibujar)
    window.addEventListener('resize', ajustar)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', ajustar)
    }
  }, [ref, activo])
}

/** Intro de marca que se muestra en cada carga de la página. */
export const IntroSplash: React.FC = () => {
  const reducido = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [visible, setVisible] = useState(true)
  const [paso, setPaso] = useState(0)
  const canvas = useRef<HTMLCanvasElement>(null)
  useHiperespacio(canvas, visible && !reducido)

  useEffect(() => {
    if (!visible) return
    const total = reducido ? 900 : DURACION_MS
    const fin = window.setTimeout(() => setVisible(false), total)
    const pasos = window.setInterval(() => setPaso(p => Math.min(p + 1, PASOS.length - 1)), total / PASOS.length)
    const tecla = (e: KeyboardEvent) => (e.key === 'Escape' || e.key === 'Enter') && setVisible(false)
    window.addEventListener('keydown', tecla)
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.clearTimeout(fin)
      window.clearInterval(pasos)
      window.removeEventListener('keydown', tecla)
      document.body.style.overflow = overflowPrevio
    }
  }, [visible, reducido])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="intro"
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#02030A]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04, filter: 'blur(6px)' }}
          transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
          role="dialog"
          aria-label="Bienvenida a Campuslands Ops"
        >
          <canvas ref={canvas} className="absolute inset-0 h-full w-full" aria-hidden="true" />
          {/* Viñeta y halo central */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,#02030A_85%)]" />
          <motion.div
            className="pointer-events-none absolute h-[520px] w-[520px] rounded-full bg-sky-400/10 blur-3xl"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.9, duration: 1.4, ease: 'easeOut' }}
          />

          <div className="relative flex flex-col items-center px-6 text-center">
            {/* Casco con anillo de energía y destello que recorre el visor */}
            <div className="relative h-32 w-40 sm:h-40 sm:w-52">
              <motion.div
                className="absolute -inset-6 rounded-full border border-sky-300/30"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: [0.6, 1.15, 1.5], opacity: [0, 0.8, 0] }}
                transition={{ delay: 1.1, duration: 1.6, ease: 'easeOut' }}
              />
              <motion.img
                src={LOGO_URL}
                alt="Campuslands"
                className="relative h-full w-full object-contain drop-shadow-[0_0_30px_rgba(125,211,252,0.45)]"
                initial={{ opacity: 0, scale: 0.7, filter: 'blur(14px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                transition={{ delay: 0.5, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                draggable={false}
              />
              <motion.div
                className="absolute inset-0"
                style={{
                  WebkitMaskImage: `url(${LOGO_URL})`,
                  maskImage: `url(${LOGO_URL})`,
                  WebkitMaskSize: 'contain',
                  maskSize: 'contain',
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center',
                  maskPosition: 'center',
                  backgroundImage: 'linear-gradient(105deg, transparent 35%, rgba(125,211,252,0.95) 50%, transparent 65%)',
                  backgroundSize: '250% 100%'
                }}
                initial={{ backgroundPositionX: '120%' }}
                animate={{ backgroundPositionX: '-120%' }}
                transition={{ delay: 1.5, duration: 1.2, ease: 'easeInOut' }}
              />
            </div>

            {/* Nombre letra a letra */}
            <h1 className="mt-8 font-display text-3xl font-bold tracking-[0.32em] text-white sm:text-5xl" aria-label="Campuslands Ops">
              {NOMBRE.split('').map((l, i) => (
                <motion.span
                  key={i}
                  className="inline-block"
                  initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ delay: 1.4 + i * 0.05, duration: 0.5, ease: 'easeOut' }}
                >
                  {l}
                </motion.span>
              ))}
              <motion.span
                className="ml-3 inline-block text-sky-300"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 2.05, duration: 0.5 }}
              >
                OPS
              </motion.span>
            </h1>
            <motion.p
              className="mt-3 text-sm tracking-wide text-slate-400 sm:text-base"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.3, duration: 0.6 }}
            >
              Centro de Operaciones del Campus · Torre Zenith
            </motion.p>

            {/* Progreso de arranque */}
            <motion.div
              className="mt-10 w-64 sm:w-80"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="h-[2px] w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-sky-200 shadow-[0_0_12px_#7DD3FC]"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: (reducido ? 900 : DURACION_MS - 300) / 1000, ease: 'easeInOut' }}
                />
              </div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={paso}
                  className="eyebrow mt-3 text-slate-500"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.25 }}
                >
                  {PASOS[paso]}
                </motion.p>
              </AnimatePresence>
            </motion.div>
          </div>

          <button
            onClick={() => setVisible(false)}
            className="absolute bottom-6 right-6 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-slate-300 transition hover:border-white/25 hover:text-white cursor-pointer"
          >
            Saltar intro
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
