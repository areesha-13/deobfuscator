import { useRef, useEffect, useCallback } from 'react'

interface TrailDot {
  x: number
  y: number
  age: number
  size: number
}

export function useMouseTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dotsRef = useRef<TrailDot[]>([])
  const mouseRef = useRef({ x: -999, y: -999 })
  const rafRef = useRef<number>(0)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    dotsRef.current.push({
      x: mouseRef.current.x,
      y: mouseRef.current.y,
      age: 0,
      size: 10 + Math.random() * 6,
    })
    dotsRef.current = dotsRef.current
      .map(d => ({ ...d, age: d.age + 0.025 }))
      .filter(d => d.age < 1)
    for (const d of dotsRef.current) {
      const alpha = 1 - d.age
      const radius = d.size * (1 - d.age * 0.5)
      const grad = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, radius * 3)
      grad.addColorStop(0, `rgba(255,0,128,${alpha * 0.9})`)
      grad.addColorStop(0.4, `rgba(255,0,128,${alpha * 0.4})`)
      grad.addColorStop(1, `rgba(255,0,128,0)`)
      ctx.beginPath()
      ctx.arc(d.x, d.y, radius * 3, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()
    }
    rafRef.current = requestAnimationFrame(draw)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)
    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', onMove)
    rafRef.current = requestAnimationFrame(draw)
    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(rafRef.current)
    }
  }, [draw])

  return canvasRef
}
