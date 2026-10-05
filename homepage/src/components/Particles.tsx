import { useEffect, useRef } from 'react'

interface Particle {
  x: number; y: number; vx: number; vy: number
  size: number; opacity: number; pulse: number; pulseSpeed: number
}

export default function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particles = useRef<Particle[]>([])
  const raf = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const init = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      particles.current = Array.from({ length: 60 }, () => ({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.5, opacity: Math.random() * 0.4 + 0.1,
        pulse: Math.random() * Math.PI * 2, pulseSpeed: Math.random() * 0.02 + 0.005,
      }))
    }
    init()
    window.addEventListener('resize', init)
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of particles.current) {
        p.x += p.vx; p.y += p.vy; p.pulse += p.pulseSpeed
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0
        const alpha = p.opacity * (0.6 + 0.4 * Math.sin(p.pulse))
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,0,128,${alpha})`
        ctx.fill()
      }
      raf.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { window.removeEventListener('resize', init); cancelAnimationFrame(raf.current) }
  }, [])

  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 2, width: '100vw', height: '100vh' }} />
}
