import React, { useEffect, useRef } from 'react'

interface Destello {
  x: number
  y: number
  r: number
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
const TONOS_COMETA = ['186,230,253', '226,232,255', '254,240,138']
const FPS = 45

/**
 * Cielo estrellado con cometas fugaces, optimizado:
 * - las estrellas fijas se pintan UNA vez en un lienzo fuera de pantalla y cada fotograma solo se copia;
 * - solo un pequeño grupo de estrellas brillantes titila;
 * - las nebulosas se pintan en esa misma capa fija;
 * - el dibujo se limita a ~45 fps y se detiene con la pestaña oculta.
 */
export const StarfieldBackground: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d', { alpha: true })
    if (!canvas || !ctx) return

    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const capa = document.createElement('canvas')
    const ctxCapa = capa.getContext('2d')!
    let ancho = 0
    let alto = 0
    let dpr = 1
    let destellos: Destello[] = []
    const cometas: Cometa[] = []
    let proximoCometa = performance.now() + 1500
    let raf = 0
    let ultimo = performance.now()
    let acumulado = 0
    let deriva = 0

    const pintarCapaFija = () => {
      capa.width = ancho * dpr
      capa.height = alto * dpr
      ctxCapa.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctxCapa.clearRect(0, 0, ancho, alto)
      // Nebulosas pintadas una sola vez en la capa fija (antes eran una capa CSS animada aparte).
      const nebulosas: [number, number, number, string][] = [
        [0.18, 0.22, 0.45, '79,70,229,0.16'],
        [0.82, 0.3, 0.4, '14,165,233,0.13'],
        [0.65, 0.85, 0.5, '56,189,248,0.08'],
        [0.1, 0.8, 0.35, '45,212,191,0.08']
      ]
      for (const [fx, fy, fr, color] of nebulosas) {
        const r = Math.max(ancho, alto) * fr
        const g = ctxCapa.createRadialGradient(fx * ancho, fy * alto, 0, fx * ancho, fy * alto, r)
        g.addColorStop(0, `rgba(${color})`)
        g.addColorStop(1, 'rgba(0,0,0,0)')
        ctxCapa.fillStyle = g
        ctxCapa.fillRect(0, 0, ancho, alto)
      }
      const n = Math.min(Math.floor((ancho * alto) / 3200), 520)
      for (let i = 0; i < n; i++) {
        const grande = Math.random() < 0.12
        ctxCapa.fillStyle = `rgba(${TONOS[i % TONOS.length]},${grande ? 0.75 : 0.25 + Math.random() * 0.35})`
        ctxCapa.beginPath()
        ctxCapa.arc(Math.random() * ancho, Math.random() * alto, grande ? 1.1 : 0.45 + Math.random() * 0.4, 0, Math.PI * 2)
        ctxCapa.fill()
      }
      destellos = Array.from({ length: Math.min(60, Math.floor(n / 8)) }, () => ({
        x: Math.random() * ancho,
        y: Math.random() * alto,
        r: 1 + Math.random() * 0.9,
        fase: Math.random() * Math.PI * 2,
        vel: 0.6 + Math.random() * 1.8,
        tono: TONOS[Math.floor(Math.random() * TONOS.length)]
      }))
    }

    const ajustar = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      ancho = window.innerWidth
      alto = window.innerHeight
      canvas.width = ancho * dpr
      canvas.height = alto * dpr
      canvas.style.width = `${ancho}px`
      canvas.style.height = `${alto}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      pintarCapaFija()
    }

    const lanzarCometa = () => {
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
        largo: 140 + Math.random() * 160,
        tono: TONOS_COMETA[Math.floor(Math.random() * TONOS_COMETA.length)]
      })
    }

    const dibujar = (t: number) => {
      raf = requestAnimationFrame(dibujar)
      const dt = Math.min(t - ultimo, 100)
      ultimo = t
      acumulado += dt
      if (acumulado < 1000 / FPS) return
      const paso = acumulado
      acumulado = 0

      ctx.clearRect(0, 0, ancho, alto)
      // Deriva lenta de todo el cielo: dos copias de la capa fija para que el borde no se note.
      deriva = (deriva + paso * 0.006) % ancho
      ctx.drawImage(capa, -deriva, 0, ancho, alto)
      ctx.drawImage(capa, ancho - deriva, 0, ancho, alto)

      for (const d of destellos) {
        const brillo = 0.45 + 0.55 * Math.sin(t * 0.001 * d.vel + d.fase)
        ctx.fillStyle = `rgba(${d.tono},${brillo})`
        ctx.fillRect(d.x - d.r, d.y - d.r, d.r * 2, d.r * 2)
      }

      if (t > proximoCometa) {
        lanzarCometa()
        proximoCometa = t + 2200 + Math.random() * 3500
      }
      for (let i = cometas.length - 1; i >= 0; i--) {
        const c = cometas[i]
        c.vida += paso
        c.x += c.vx * paso
        c.y += c.vy * paso
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
        grad.addColorStop(0.2, `rgba(${c.tono},${opacidad * 0.6})`)
        grad.addColorStop(1, `rgba(${c.tono},0)`)
        ctx.strokeStyle = grad
        ctx.lineWidth = 1.6
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(c.x, c.y)
        ctx.lineTo(colaX, colaY)
        ctx.stroke()
      }
    }

    ajustar()
    if (reducido) {
      ctx.drawImage(capa, 0, 0, ancho, alto)
    } else {
      raf = requestAnimationFrame(dibujar)
    }

    let tResize = 0
    const alRedimensionar = () => {
      window.clearTimeout(tResize)
      tResize = window.setTimeout(() => {
        ajustar()
        if (reducido) ctx.drawImage(capa, 0, 0, ancho, alto)
      }, 150)
    }
    window.addEventListener('resize', alRedimensionar)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(tResize)
      window.removeEventListener('resize', alRedimensionar)
    }
  }, [])

  return (
    <canvas ref={ref} className="pointer-events-none fixed inset-0 z-0" aria-hidden="true" />
  )
}
