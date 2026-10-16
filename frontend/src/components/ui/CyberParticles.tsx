import React, { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  baseRadius: number
  color: string
  alpha: number
}

export const CyberParticles: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    // Colores de partículas cyberpunk neón
    const colors = [
      'rgba(0, 245, 255, ',    // Electric Cyan
      'rgba(168, 85, 247, ',   // Hyper Violet
      'rgba(255, 0, 122, ',    // Neon Magenta
      'rgba(0, 255, 170, '     // Mint Glow
    ]

    const particleCount = Math.min(Math.floor((width * height) / 16000), 75)
    const particles: Particle[] = []

    for (let i = 0; i < particleCount; i++) {
      const colorBase = colors[Math.floor(Math.random() * colors.length)]
      const radius = Math.random() * 2 + 1
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius,
        baseRadius: radius,
        color: colorBase,
        alpha: Math.random() * 0.5 + 0.25
      })
    }

    // Interacción con el cursor
    const mouse = { x: -1000, y: -1000, radius: 140 }

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
    }

    const handleMouseLeave = () => {
      mouse.x = -1000
      mouse.y = -1000
    }

    const handleResize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('mouseleave', handleMouseLeave)
    window.addEventListener('resize', handleResize)

    const maxLineDist = 115

    const render = () => {
      ctx.clearRect(0, 0, width, height)

      // Actualizar y dibujar partículas
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        p.x += p.vx
        p.y += p.vy

        // Rebote en bordes
        if (p.x < 0) { p.x = 0; p.vx *= -1 }
        else if (p.x > width) { p.x = width; p.vx *= -1 }
        if (p.y < 0) { p.y = 0; p.vy *= -1 }
        else if (p.y > height) { p.y = height; p.vy *= -1 }

        // Interacción suave con el cursor
        const dx = mouse.x - p.x
        const dy = mouse.y - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < mouse.radius) {
          const force = (mouse.radius - dist) / mouse.radius
          p.x -= (dx / dist) * force * 1.5
          p.y -= (dy / dist) * force * 1.5
          p.radius = p.baseRadius * 1.8
        } else {
          p.radius = p.baseRadius
        }

        // Dibujar partícula con brillo halo
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = `${p.color}${p.alpha})`
        ctx.shadowColor = `${p.color}0.8)`
        ctx.shadowBlur = 8
        ctx.fill()
        ctx.shadowBlur = 0

        // Conectar con líneas a partículas vecinas
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]
          const ldx = p.x - p2.x
          const ldy = p.y - p2.y
          const ldist = Math.sqrt(ldx * ldx + ldy * ldy)

          if (ldist < maxLineDist) {
            const lineAlpha = (1 - ldist / maxLineDist) * 0.22
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `rgba(0, 245, 255, ${lineAlpha})`
            ctx.lineWidth = 0.75
            ctx.stroke()
          }
        }
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-80"
    />
  )
}
