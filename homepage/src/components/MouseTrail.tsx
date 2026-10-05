import { useMouseTrail } from '../hooks/useMouseTrail'

export default function MouseTrail() {
  const canvasRef = useMouseTrail()
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        mixBlendMode: 'screen',
        zIndex: 9999,
        width: '100vw',
        height: '100vh',
      }}
    />
  )
}
