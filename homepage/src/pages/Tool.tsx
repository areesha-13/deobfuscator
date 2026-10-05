import { useRef, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

const ACCEPTED = '.exe,.dll,.sys'

interface TrailDot { x: number; y: number; age: number; size: number }

const bg: React.CSSProperties = {
  background: 'linear-gradient(135deg, #000 0%, #1a0010 35%, #3d0025 60%, #000 100%)',
  minHeight: '100vh',
  color: '#fff',
}

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(24px) saturate(1.4)',
  WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 16,
}

const riskColor = (level: string) => {
  if (level === 'CRITICAL') return '#FF0000'
  if (level === 'HIGH') return '#FF6600'
  if (level === 'MEDIUM') return '#FFAA00'
  return '#00CC66'
}

export default function Tool() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dotsRef = useRef<TrailDot[]>([])
  const mouseRef = useRef({ x: -999, y: -999 })
  const rafRef = useRef<number>(0)

  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    dotsRef.current.push({ x: mouseRef.current.x, y: mouseRef.current.y, age: 0, size: 10 + Math.random() * 6 })
    dotsRef.current = dotsRef.current.map(d => ({ ...d, age: d.age + 0.025 })).filter(d => d.age < 1)
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
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)
    const onMove = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY } }
    window.addEventListener('mousemove', onMove)
    rafRef.current = requestAnimationFrame(draw)
    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(rafRef.current)
    }
  }, [draw])

  function handleFile(f: File) { setFile(f); setResult(null); setError(null) }
  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) { const f = e.target.files?.[0]; if (f) handleFile(f) }
  function onDrop(e: React.DragEvent) { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f) }

  async function handleAnalyze() {
    if (!file) return
    setLoading(true); setError(null); setResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('http://localhost:8000/analyze', { method: 'POST', body: formData })
      if (!response.ok) { const err = await response.json(); throw new Error(err.detail || 'Analysis failed') }
      setResult(await response.json())
    } catch (err: any) {
      setError(err.message || 'Could not connect to backend. Make sure it is running.')
    } finally { setLoading(false) }
  }

  async function handleDownloadReport() {
    if (!result) return
    try {
      const response = await fetch('http://localhost:8000/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      })
      if (!response.ok) throw new Error('PDF generation failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reversor_report_${result.filename ?? 'output'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      alert('Failed to download report: ' + err.message)
    }
  }

  // ── Upload screen ──────────────────────────────────────────────────────────
  if (!result) {
    return (
      <div style={{ ...bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', mixBlendMode: 'screen', zIndex: 5 }} />
        <Navbar />

        <div style={{ position: 'relative', zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, width: '100%', maxWidth: 560, padding: '80px 24px 0' }}>

          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: '#FF0080', textShadow: '0 0 20px rgba(255,0,128,0.9), 0 0 60px rgba(255,0,128,0.4)', letterSpacing: '0.06em', margin: '0 0 12px' }}>
              REVERSOR
            </h1>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '1rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
              Upload a PE binary to begin analysis
            </p>
          </div>

          {/* Drop zone */}
          <div
            style={{
              ...glass,
              width: '100%',
              padding: '40px 32px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 20,
              cursor: 'pointer',
              borderColor: dragging ? 'rgba(255,0,128,0.6)' : 'rgba(255,255,255,0.1)',
              boxShadow: dragging ? '0 0 40px rgba(255,0,128,0.2)' : 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <div style={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,0,128,0.1)', border: '1px solid rgba(255,0,128,0.35)', borderRadius: 12, boxShadow: '0 0 20px rgba(255,0,128,0.2)' }}>
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                <path d="M13 17V5M13 5L8.5 9.5M13 5L17.5 9.5" stroke="#FF0080" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 19.5H22" stroke="#FF0080" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
              </svg>
            </div>

            {file ? (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, color: '#FF0080', fontSize: '0.95rem', letterSpacing: '0.04em', margin: '0 0 6px' }}>{file.name}</p>
                <p style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', margin: 0 }}>{(file.size / 1024).toFixed(1)} KB · click to change</p>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', margin: '0 0 6px' }}>Drop a file or click to browse</p>
                <p style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', margin: 0 }}>.EXE · .DLL · .SYS</p>
              </div>
            )}

            <input ref={inputRef} type="file" accept={ACCEPTED} style={{ display: 'none' }} onChange={onInputChange} />
          </div>

          {error && (
            <div style={{ ...glass, width: '100%', padding: '14px 20px', borderColor: 'rgba(255,0,0,0.3)', color: '#FF5555', fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', textAlign: 'center' }}>
              {error}
            </div>
          )}

          {file && (
            <button
              onClick={handleAnalyze}
              disabled={loading}
              style={{
                fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: '0.82rem',
                letterSpacing: '0.18em', padding: '14px 40px',
                background: '#FF0080', color: '#fff', border: 'none', borderRadius: 10,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                boxShadow: '0 0 20px rgba(255,0,128,0.6), 0 0 50px rgba(255,0,128,0.25)',
              }}
            >
              {loading ? 'ANALYZING...' : 'ANALYZE →'}
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Results screen ─────────────────────────────────────────────────────────
  const summary = result.analysis.summary
  const detections = result.analysis.detections
  const meta = result.analysis.metadata
  const deobfuscation = result.deobfuscation

  const detectedTechniques = Object.entries(detections).filter(([, d]: [string, any]) => d.detected)

  return (
    <div style={{ ...bg, paddingBottom: 80 }}>
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', mixBlendMode: 'screen', zIndex: 5 }} />
      <Navbar />

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '100px 24px 0', position: 'relative', zIndex: 10 }}>

        {/* Top summary bar */}
        <div style={{ ...glass, padding: '20px 28px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: '0.75rem', letterSpacing: '0.12em', color: riskColor(summary.risk_level), textShadow: `0 0 10px ${riskColor(summary.risk_level)}`, padding: '5px 12px', border: `1px solid ${riskColor(summary.risk_level)}`, borderRadius: 6 }}>
              {summary.risk_level} RISK
            </span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{result.filename}</span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)' }}>{(result.file_size_bytes / 1024).toFixed(1)} KB</span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)' }}>{summary.detected_count} technique{summary.detected_count !== 1 ? 's' : ''} detected</span>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleDownloadReport}
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.82rem', padding: '8px 18px', background: '#FF0080', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', boxShadow: '0 0 14px rgba(255,0,128,0.5)' }}
            >
              Download PDF
            </button>
            <button
              onClick={() => { setResult(null); setFile(null) }}
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: '0.82rem', padding: '8px 16px', background: 'transparent', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, cursor: 'pointer' }}
            >
              New File
            </button>
          </div>
        </div>

        {/* Technique pills */}
        {detectedTechniques.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
            {detectedTechniques.map(([name]: [string, any]) => (
              <span key={name} style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.78rem', fontWeight: 600, padding: '4px 12px', background: 'rgba(255,0,128,0.12)', border: '1px solid rgba(255,0,128,0.35)', borderRadius: 100, color: '#FF0080' }}>
                {name.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}

        {/* Per-technique sections */}
        {detectedTechniques.length === 0 && (
          <div style={{ ...glass, padding: 32, marginBottom: 24, textAlign: 'center' }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '1rem', color: 'rgba(255,255,255,0.6)', margin: 0 }}>No obfuscation techniques detected. This binary appears clean.</p>
          </div>
        )}

        {detectedTechniques.map(([name, data]: [string, any]) => (
          <TechniqueSection key={name} name={name} data={data} deobfuscation={deobfuscation} />
        ))}

        {/* Binary metadata */}
        <Section title="Binary Metadata">
          <MetaRow label="Sections" value={`${meta.sections.length} sections`} />
          <MetaRow label="Imports" value={`${meta.import_count} functions from ${meta.dll_count} DLL(s)`} />
          {meta.packer_signatures?.length > 0 && <MetaRow label="Packer signatures" value={meta.packer_signatures.join(', ')} highlight />}
          {meta.anti_debug_imports?.length > 0 && <MetaRow label="Anti-debug APIs" value={meta.anti_debug_imports.join(', ')} highlight />}
          {meta.suspicious_imports?.length > 0 && <MetaRow label="Suspicious APIs" value={meta.suspicious_imports.join(', ')} />}
          <div style={{ marginTop: 16 }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sections</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
              {meta.sections.map((s: any) => (
                <div key={s.name} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${s.entropy_flag ? 'rgba(255,0,128,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 8, padding: '8px 12px' }}>
                  <p style={{ fontFamily: "'Courier New', monospace", fontSize: '0.8rem', color: s.entropy_flag ? '#FF0080' : 'rgba(255,255,255,0.7)', margin: '0 0 2px' }}>{s.name || '(unnamed)'}</p>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', margin: 0 }}>Entropy: {s.entropy}{s.entropy_flag ? ' ⚠' : ''}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Sample strings */}
        {meta.strings_sample?.length > 0 && (
          <Section title="Extracted Strings">
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', margin: '0 0 16px' }}>
              {meta.total_strings_found} strings found. Showing first {Math.min(meta.strings_sample.length, 20)}.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {meta.strings_sample.slice(0, 20).map((s: string, i: number) => (
                <p key={i} style={{ fontFamily: "'Courier New', monospace", fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', margin: 0, padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  {s}
                </p>
              ))}
            </div>
          </Section>
        )}

      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: 14,
      padding: '24px 28px',
      marginBottom: 16,
    }}>
      <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.65rem', letterSpacing: '0.16em', color: '#FF0080', margin: '0 0 18px', textTransform: 'uppercase' }}>{title}</p>
      {children}
    </div>
  )
}

function MetaRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: 16 }}>
      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', color: highlight ? '#FF0080' : 'rgba(255,255,255,0.8)', textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
    </div>
  )
}

function TechniqueSection({ name, data, deobfuscation }: { name: string; data: any; deobfuscation: any }) {
  const label = name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const deo = deobfuscation?.[name]

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,0,128,0.15)',
      borderRadius: 14,
      padding: '24px 28px',
      marginBottom: 16,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem', letterSpacing: '0.16em', color: '#FF0080', margin: 0 }}>{label.toUpperCase()}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>Confidence</span>
          <div style={{ width: 100, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
            <div style={{ height: '100%', width: `${data.confidence * 100}%`, background: 'linear-gradient(90deg, #FF0080, #FF66B2)', borderRadius: 2, boxShadow: '0 0 8px rgba(255,0,128,0.6)' }} />
          </div>
          <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.75rem', color: '#FF0080' }}>{(data.confidence * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* Plain English explanation */}
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.95rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, margin: '0 0 16px' }}>
        {data.explanation}
      </p>

      {/* Deobfuscation output */}
      {deo && <DeobfuscationOutput name={name} deo={deo} />}
    </div>
  )
}

function DeobfuscationOutput({ name, deo }: { name: string; deo: any }) {
  if (name === 'packing') {
    return (
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Unpacking Result</p>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', color: deo.status === 'success' ? '#00CC66' : 'rgba(255,255,255,0.6)', margin: '0 0 8px' }}>{deo.message}</p>
        {deo.size_before_bytes && (
          <p style={{ fontFamily: "'Courier New', monospace", fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            {deo.size_before_bytes} bytes → {deo.size_after_bytes} bytes ({deo.size_reduction_percent}% reduction)
          </p>
        )}
        {deo.manual_steps && <StepList steps={deo.manual_steps} />}
      </div>
    )
  }

  if (name === 'string_obfuscation') {
    const methods = deo.methods || {}
    const b64 = methods.base64_decoded?.decoded_strings || []
    const xor = methods.xor_brute_force?.decoded_strings || []
    const rot = methods.rot13_decoded?.decoded_strings || []
    const total = deo.total_decoded_strings || 0

    return (
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
          Decoded Output — {total} string{total !== 1 ? 's' : ''} recovered
        </p>
        {b64.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', margin: '0 0 6px' }}>Base64</p>
            {b64.slice(0, 5).map((e: any, i: number) => (
              <p key={i} style={{ fontFamily: "'Courier New', monospace", fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', margin: '0 0 4px', padding: '4px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 4 }}>"{e.decoded}"</p>
            ))}
          </div>
        )}
        {xor.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', margin: '0 0 6px' }}>XOR Brute Force — {methods.xor_brute_force?.keys_with_results} key(s) produced results</p>
            {xor.slice(0, 3).map((entry: any, i: number) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', margin: '0 0 3px' }}>Key {entry.key}</p>
                {entry.strings_found?.slice(0, 3).map((s: string, j: number) => (
                  <p key={j} style={{ fontFamily: "'Courier New', monospace", fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', margin: '0 0 3px', padding: '4px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 4 }}>"{s}"</p>
                ))}
              </div>
            ))}
          </div>
        )}
        {rot.length > 0 && (
          <div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', margin: '0 0 6px' }}>ROT13</p>
            {rot.slice(0, 5).map((e: any, i: number) => (
              <p key={i} style={{ fontFamily: "'Courier New', monospace", fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', margin: '0 0 4px', padding: '4px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 4 }}>"{e.original}" → "{e.decoded}"</p>
            ))}
          </div>
        )}
        {total === 0 && <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>No strings successfully decoded.</p>}
      </div>
    )
  }

  if (name === 'anti_debugging') {
    return (
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
        {deo.identified_apis?.length > 0 && (
          <>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Identified Anti-Debug APIs</p>
            {deo.identified_apis.map((api: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(255,0,128,0.06)', border: '1px solid rgba(255,0,128,0.15)', borderRadius: 6, marginBottom: 6 }}>
                <span style={{ fontFamily: "'Courier New', monospace", fontSize: '0.82rem', color: '#FF0080' }}>{api.api}</span>
                <span style={{ fontFamily: "'Courier New', monospace", fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)' }}>{api.dll} @ {api.address}</span>
              </div>
            ))}
          </>
        )}
        {deo.patch_guidance?.length > 0 && <StepList steps={deo.patch_guidance} label="Patch Guidance" />}
      </div>
    )
  }

  if (name === 'control_flow_obfuscation' || name === 'junk_code') {
    return (
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, margin: '0 0 12px' }}>{deo.message}</p>
        {deo.manual_steps?.length > 0 && <StepList steps={deo.manual_steps} label="Manual Steps" />}
      </div>
    )
  }

  return null
}

function StepList({ steps, label }: { steps: string[]; label?: string }) {
  return (
    <div style={{ marginTop: 12 }}>
      {label && <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>{label}</p>}
      {steps.map((s: string, i: number) => (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 6 }}>
          <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.65rem', color: '#FF0080', marginTop: 2, flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.6 }}>{s}</p>
        </div>
      ))}
    </div>
  )
}
