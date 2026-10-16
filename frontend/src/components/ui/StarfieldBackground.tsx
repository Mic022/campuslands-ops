import React, { useEffect, useRef } from 'react'

interface Estrella {
  x: number
  y: number
  r: number
  capa: number
  fase: number
  vel: number
  tono: string
}

interface Cometa {
  x: number
  y: number
  vx: number
  vy: number
  vida: number
  duracion: number
  largo: number
  tono: string
}

// Tonos estelares reales: blanco azulado, blanco, crema y algún ámbar.
const TONOS = ['226,236,255', '255,255,255', '255,244,224', '199,221,255', '255,214,170']
const TONOS_COMETA = ['186,230,253', '233,213,255', '254,240,138']

/** Cielo estrellado con titileo, deriva lenta y cometas fugaces. Lienzo fijo detrás de la página. */
export const StarfieldBackground: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let ancho = 0
    let alto = 0
    let estrellas: Estrella[] = []
    const cometas: Cometa[] = []
    let proximoCometa = performance.now() + 1200
    let raf = 0
    let ultimo = performance.now()

    const crearEstrellas = () => {
      const n = Math.min(Math.floor((ancho * alto) / 2600), 700)
      estrellas = Array.from({ length: n }, () => {
        const capa = Math.random() < 0.7 ? 0 : Math.random() < 0.8 ? 1 : 2
        return {
          x: Math.random() * ancho,
          y: Math.random() * alto,
          r: [0.5, 0.9, 1.5][capa] * (0.7 + Math.random() * 0.6),
          capa,
          fase: Math.random() * Math.PI * 2,
          vel: 0.6 + Math.random() * 2.2,
          tono: TONOS[Math.floor(Math.random() * TONOS.length)]
        }
      })
    }

    const ajustar = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      ancho = window.innerWidth
      alto = window.innerHeight
      canvas.width = ancho * dpr
      canvas.height = alto * dpr
      canvas.style.width = `${ancho}px`
      canvas.style.height = `${alto}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      crearEstrellas()
    }

    const lanzarCometa = () => {
      // Entran por arriba o por la izquierda y cruzan en diagonal descendente.
      const desdeArriba = Math.random() < 0.65
      const angulo = (Math.PI / 180) * (18 + Math.random() * 28)
      const rapidez = 0.9 + Math.random() * 0.9 // px/ms
      cometas.push({
        x: desdeArriba ? Math.random() * ancho * 0.9 : -40,
        y: desdeArriba ? -40 : Math.random() * alto * 0.5,
        vx: Math.cos(angulo) * rapidez,
        vy: Math.sin(angulo) * rapidez,
        vida: 0,
        duracion: 1100 + Math.random() * 900,
        largo: 140 + Math.random() * 180,
        tono: TONOS_COMETA[Math.floor(Math.random() * TONOS_COMETA.length)]
      })
    }

    const dibujar = (t: number) => {
      const dt = Math.min(t - ultimo, 50)
      ultimo = t
      ctx.clearRect(0, 0, ancho, alto)

      for (const e of estrellas) {
        if (!reducido) {
          // Deriva lenta con paralaje: las capas cercanas se mueven más.
          e.x -= (0.004 + e.capa * 0.006) * dt
          if (e.x < -2) e.x = ancho + 2
        }
        const brillo = reducido ? 0.8 : 0.55 + 0.45 * Math.sin(t * 0.001 * e.vel + e.fase)
        ctx.fillStyle = `rgba(${e.tono},${(0.35 + e.capa * 0.25) * brillo})`
        ctx.beginPath()
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2)
        ctx.fill()
        if (e.capa === 2 && brillo > 0.85) {
          // Destello en cruz de las estrellas más brillantes.
          ctx.strokeStyle = `rgba(${e.tono},${(brillo - 0.85) * 2})`
          ctx.lineWidth = 0.6
          ctx.beginPath()
          ctx.moveTo(e.x - e.r * 4, e.y)
          ctx.lineTo(e.x + e.r * 4, e.y)
          ctx.moveTo(e.x, e.y - e.r * 4)
          ctx.lineTo(e.x, e.y + e.r * 4)
          ctx.stroke()
        }
      }

      if (!reducido) {
        if (t > proximoCometa) {
          lanzarCometa()
          if (Math.random() < 0.2) lanzarCometa() // a veces llegan en pareja
          proximoCometa = t + 1600 + Math.random() * 3200
        }
        for (let i = cometas.length - 1; i >= 0; i--) {
          const c = cometas[i]
          c.vida += dt
          c.x += c.vx * dt
          c.y += c.vy * dt
          const p = c.vida / c.duracion
          if (p >= 1) {
            cometas.splice(i, 1)
            continue
          }
          const opacidad = Math.sin(Math.PI * p)
          const norma = Math.hypot(c.vx, c.vy)
          const colaX = c.x - (c.vx / norma) * c.largo
          const colaY = c.y - (c.vy / norma) * c.largo
          const grad = ctx.createLinearGradient(c.x, c.y, colaX, colaY)
          grad.addColorStop(0, `rgba(255,255,255,${opacidad})`)
          grad.addColorStop(0.15, `rgba(${c.tono},${opacidad * 0.7})`)
          grad.addColorStop(1, `rgba(${c.tono},0)`)
          ctx.strokeStyle = grad
          ctx.lineWidth = 1.8
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(c.x, c.y)
          ctx.lineTo(colaX, colaY)
          ctx.stroke()
          // Núcleo brillante con halo.
          const halo = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 7)
          halo.addColorStop(0, `rgba(255,255,255,${opacidad})`)
          halo.addColorStop(1, `rgba(${c.tono},0)`)
          ctx.fillStyle = halo
          ctx.beginPath()
          ctx.arc(c.x, c.y, 7, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      raf = requestAnimationFrame(dibujar)
    }

    ajustar()
    raf = requestAnimationFrame(dibujar)
    window.addEventListener('resize', ajustar)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', ajustar)
    }
  }, [])

  return (
    <>
      <div className="nebulosa-fondo pointer-events-none fixed inset-0 z-0" aria-hidden="true" />
      <canvas ref={ref} className="pointer-events-none fixed inset-0 z-0" aria-hidden="true" />
    </>
  )
}
