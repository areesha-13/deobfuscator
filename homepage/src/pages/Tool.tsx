import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import Navbar from '../components/Navbar'
import Particles from '../components/Particles'

// Local dev uses localhost. For production, set VITE_API_URL in Vercel to your backend URL.
const API = ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000').replace(/\/$/, '')
const ACCEPTED = '.exe,.dll,.sys'

const riskColor = (level: string) => {
  if (level === 'CRITICAL') return '#FF2D55'
  if (level === 'HIGH') return '#FF7A2F'
  if (level === 'MEDIUM') return '#FFC233'
  return '#00CC66'
}

export default function Tool() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  function handleFile(f: File) {
    setFile(f)
    setResult(null)
    setError(null)
  }
  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  async function handleAnalyze() {
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch(`${API}/analyze`, { method: 'POST', body: formData })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.detail || 'Analysis failed')
      }
      setResult(await response.json())
    } catch (err: any) {
      setError(err.message === 'Failed to fetch' ? 'Could not reach the analysis server. Make sure the backend is running.' : err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDownloadReport() {
    if (!result) return
    try {
      const response = await fetch(`${API}/report`, {
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

  /* ---------------- UPLOAD SCREEN ---------------- */
  if (!result) {
    return (
      <div className="rv-page">
        <Particles />
        <Navbar />
        <main className="rv-main rv-tool">
          <div className="rv-tool-inner">
            <h1 className="rv-title rv-title-md">REVERSOR</h1>

            <div
              className={'rv-upload lg' + (dragging ? ' drag' : '')}
              onClick={() => inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <div className="rv-upload-icon">
                <svg width="28" height="28" viewBox="0 0 26 26" fill="none" aria-hidden="true">
                  <path d="M13 17V5M13 5L8.5 9.5M13 5L17.5 9.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 19.5H22" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
                </svg>
              </div>
              {file ? (
                <div>
                  <p className="rv-file-name">{file.name}</p>
                  <p className="rv-muted">{(file.size / 1024).toFixed(1)} KB · Click to Change</p>
                </div>
              ) : (
                <div>
                  <p className="rv-upload-main">Drop a File or Click to Browse</p>
                  <p className="rv-muted">.EXE · .DLL · .SYS</p>
                </div>
              )}
            </div>
            <input ref={inputRef} type="file" accept={ACCEPTED} style={{ display: 'none' }} onChange={onInputChange} />

            {error && <div className="rv-error">{error}</div>}

            {file && (
              <button className="rv-btn" onClick={handleAnalyze} disabled={loading}>
                {loading ? 'Analyzing...' : 'Analyze →'}
              </button>
            )}
          </div>
        </main>
      </div>
    )
  }

  /* ---------------- RESULTS SCREEN ---------------- */
  const summary = result.analysis.summary
  const detections = result.analysis.detections
  const meta = result.analysis.metadata
  const deobfuscation = result.deobfuscation
  const detected = Object.entries(detections).filter(([, d]: [string, any]) => d.detected)
  const rc = riskColor(summary.risk_level)

  return (
    <div className="rv-page">
      <Particles />
      <Navbar />
      <main className="rv-main rv-results">
        <div className="rv-summary lg">
          <div className="rv-summary-left">
            <span className="rv-risk" style={{ color: rc, borderColor: rc, textShadow: `0 0 12px ${rc}` }}>
              {summary.risk_level} Risk
            </span>
            <span className="rv-summary-file">{result.filename}</span>
            <span className="rv-muted">{(result.file_size_bytes / 1024).toFixed(1)} KB</span>
            <span className="rv-muted">
              {summary.detected_count} technique{summary.detected_count !== 1 ? 's' : ''} detected
            </span>
          </div>
          <div className="rv-summary-actions">
            <button className="rv-btn rv-btn-sm" onClick={handleDownloadReport}>Download PDF</button>
            <button className="rv-btn rv-btn-sm rv-btn-ghost" onClick={() => { setResult(null); setFile(null); setError(null) }}>
              New File
            </button>
          </div>
        </div>

        {detected.length > 0 && (
          <div className="rv-pills">
            {detected.map(([name]) => (
              <span key={name} className="rv-pill">{name.replace(/_/g, ' ')}</span>
            ))}
          </div>
        )}

        {detected.length === 0 && (
          <div className="rv-card rv-card-clean lg">
            <p className="rv-p">No obfuscation techniques detected. This binary appears clean.</p>
          </div>
        )}

        {detected.map(([name, data]: [string, any]) => (
          <TechniqueCard key={name} name={name} data={data} deo={deobfuscation?.[name]} />
        ))}

        <Block title="Binary Metadata">
          <MetaRow label="Sections" value={`${meta.sections.length} sections`} />
          <MetaRow label="Imports" value={`${meta.import_count} functions from ${meta.dll_count} DLL(s)`} />
          {meta.packer_signatures?.length > 0 && <MetaRow label="Packer Signatures" value={meta.packer_signatures.join(', ')} hl />}
          {meta.anti_debug_imports?.length > 0 && <MetaRow label="Anti-Debug APIs" value={meta.anti_debug_imports.join(', ')} hl />}
          {meta.suspicious_imports?.length > 0 && <MetaRow label="Suspicious APIs" value={meta.suspicious_imports.join(', ')} />}
          <div className="rv-sections">
            {meta.sections.map((s: any, i: number) => (
              <div key={s.name + i} className={'rv-sec' + (s.entropy_flag ? ' flag' : '')}>
                <p className="n">{s.name || '(unnamed)'}</p>
                <p className="e">Entropy {s.entropy}{s.entropy_flag ? ' · High' : ''}</p>
              </div>
            ))}
          </div>
        </Block>

        {meta.strings_sample?.length > 0 && (
          <Block title="Extracted Strings">
            <p className="rv-muted" style={{ marginBottom: 14 }}>
              {meta.total_strings_found} strings found. Showing the first {Math.min(meta.strings_sample.length, 20)}.
            </p>
            {meta.strings_sample.slice(0, 20).map((s: string, i: number) => (
              <p key={i} className="rv-string">{s}</p>
            ))}
          </Block>
        )}
      </main>
    </div>
  )
}

/* ---------------- Sub-components ---------------- */

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rv-card lg">
      <p className="rv-label">{title}</p>
      {children}
    </div>
  )
}

function MetaRow({ label, value, hl }: { label: string; value: string; hl?: boolean }) {
  return (
    <div className={'rv-meta-row' + (hl ? ' hl' : '')}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function StepList({ steps, label }: { steps: string[]; label?: string }) {
  return (
    <div style={{ marginTop: 14 }}>
      {label && <p className="rv-sub">{label}</p>}
      {steps.map((s, i) => (
        <div key={i} className="rv-step-row">
          <b>{String(i + 1).padStart(2, '0')}</b>
          <span>{s}</span>
        </div>
      ))}
    </div>
  )
}

function TechniqueCard({ name, data, deo }: { name: string; data: any; deo: any }) {
  return (
    <div className="rv-card lg">
      <div className="rv-tech-head">
        <h3 className="rv-tech-title">{name.replace(/_/g, ' ')}</h3>
        <div className="rv-conf">
          <span className="rv-muted">Confidence</span>
          <div className="rv-bar"><i className="on" style={{ width: `${data.confidence * 100}%` }} /></div>
          <b>{(data.confidence * 100).toFixed(0)}%</b>
        </div>
      </div>
      <p className="rv-p">{data.explanation}</p>
      {deo && <DeobfuscationOutput name={name} deo={deo} />}
    </div>
  )
}

function DeobfuscationOutput({ name, deo }: { name: string; deo: any }) {
  if (name === 'packing') {
    return (
      <div className="rv-out">
        <p className="rv-sub">Unpacking Result</p>
        <p className={deo.status === 'success' ? 'rv-out-ok' : 'rv-out-text'}>{deo.message}</p>
        {deo.size_before_bytes && (
          <code className="rv-code">
            {deo.size_before_bytes} bytes → {deo.size_after_bytes} bytes ({deo.size_reduction_percent}% reduction)
          </code>
        )}
        {deo.manual_steps && <StepList steps={deo.manual_steps} label="Manual Steps" />}
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
      <div className="rv-out">
        <p className="rv-sub">Decoded Output · {total} string{total !== 1 ? 's' : ''} recovered</p>
        {b64.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <p className="rv-sub">Base64</p>
            {b64.slice(0, 5).map((e: any, i: number) => <code key={i} className="rv-code">"{e.decoded}"</code>)}
          </div>
        )}
        {xor.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <p className="rv-sub">XOR Brute Force · {methods.xor_brute_force?.keys_with_results} key(s) produced results</p>
            {xor.slice(0, 3).map((entry: any, i: number) => (
              <div key={i}>
                <p className="rv-muted" style={{ margin: '6px 0 4px' }}>Key {entry.key}</p>
                {entry.strings_found?.slice(0, 3).map((s: string, j: number) => <code key={j} className="rv-code">"{s}"</code>)}
              </div>
            ))}
          </div>
        )}
        {rot.length > 0 && (
          <div>
            <p className="rv-sub">ROT13</p>
            {rot.slice(0, 5).map((e: any, i: number) => <code key={i} className="rv-code">"{e.original}" → "{e.decoded}"</code>)}
          </div>
        )}
        {total === 0 && <p className="rv-out-text">No strings were successfully decoded.</p>}
      </div>
    )
  }

  if (name === 'anti_debugging') {
    return (
      <div className="rv-out">
        {deo.identified_apis?.length > 0 && (
          <>
            <p className="rv-sub">Identified Anti-Debug APIs</p>
            {deo.identified_apis.map((api: any, i: number) => (
              <div key={i} className="rv-api">
                <span>{api.api}</span>
                <span>{api.dll} @ {api.address}</span>
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
      <div className="rv-out">
        <p className="rv-out-text">{deo.message}</p>
        {deo.manual_steps?.length > 0 && <StepList steps={deo.manual_steps} label="Manual Steps" />}
      </div>
    )
  }

  return null
}
