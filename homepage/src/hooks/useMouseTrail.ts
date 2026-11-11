import { useRef, useEffect } from 'react'

interface Heart {
  x: number
  y: number
  born: number
  size: number
  drift: number
  rise: number
  spin: number
}

const LIFE = 1100 // ms each heart lives
const SPAWN_EVERY = 35 // ms between hearts while moving
const MAX_HEARTS = 90
const PINK = '255,0,137' // #FF0089

function heartPath(ctx: CanvasRenderingContext2D, s: number) {
  // Heart centred on (0, 0), roughly s wide and s tall
  const t = s * 0.3
  ctx.beginPath()
  ctx.moveTo(0, t - s / 2)
  ctx.bezierCurveTo(0, -s / 2, -s / 2, -s / 2, -s / 2, t - s / 2)
  ctx.bezierCurveTo(-s / 2, (s + t) / 2 - s / 2, 0, (s + t) / 2 - s / 2, 0, s / 2)
  ctx.bezierCurveTo(0, (s + t) / 2 - s / 2, s / 2, (s + t) / 2 - s / 2, s / 2, t - s / 2)
  ctx.bezierCurveTo(s / 2, -s / 2, 0, -s / 2, 0, t - s / 2)
  ctx.closePath()
}

export function useMouseTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let hearts: Heart[] = []
    let last = 0
    let raf = 0
    let dpr = 1

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
    }
    resize()
    window.addEventListener('resize', resize)

    const spawn = (x: number, y: number) => {
      const now = performance.now()
      if (now - last < SPAWN_EVERY) return
      last = now
      hearts.push({
        x,
        y,
        born: now,
        size: 12 + Math.random() * 14,
        drift: (Math.random() - 0.5) * 50,
        rise: 40 + Math.random() * 40,
        spin: (Math.random() - 0.5) * 0.9,
      })
      if (hearts.length > MAX_HEARTS) hearts = hearts.slice(-MAX_HEARTS)
    }

    const onMove = (e: MouseEvent) => spawn(e.clientX, e.clientY)
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0]
      if (t) spawn(t.clientX, t.clientY)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('touchmove', onTouch, { passive: true })

    const draw = () => {
      const now = performance.now()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      hearts = hearts.filter(h => now - h.born < LIFE)

      for (const h of hearts) {
        const p = (now - h.born) / LIFE // 0 -> 1
        const ease = 1 - Math.pow(1 - p, 2)
        const alpha = 1 - p
        const scale = 0.55 + ease * 0.9
        const x = h.x + h.drift * ease
        const y = h.y - h.rise * ease

        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(h.spin * ease)
        ctx.shadowColor = `rgba(${PINK},${alpha})`
        ctx.shadowBlur = 16
        ctx.fillStyle = `rgba(${PINK},${alpha * 0.95})`
        heartPath(ctx, h.size * scale)
        ctx.fill()
        ctx.restore()
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchmove', onTouch)
      cancelAnimationFrame(raf)
    }
  }, [])

  return canvasRef
}
