import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Particles from '../components/Particles'
import Reveal from '../components/Reveal'

const features = [
  { n: '01', title: 'Packing Detection', description: 'Identifies UPX, MPRESS, and custom packers using entropy analysis and signature matching, and attempts unpacking where possible.' },
  { n: '02', title: 'String Obfuscation', description: 'Recovers hidden strings through XOR brute force, Base64 decoding, and ROT13, revealing concealed URLs, commands, and configuration data.' },
  { n: '03', title: 'Control Flow Analysis', description: 'Detects control flow flattening and opaque predicates through jump density analysis and section anomaly detection.' },
  { n: '04', title: 'Junk Code Detection', description: 'Identifies dead code and NOP sled padding through file size, import ratio, and instruction density heuristics.' },
  { n: '05', title: 'Anti-Debug Detection', description: 'Flags anti-debugging API calls and timing checks, then provides targeted patch guidance for each one found.' },
]

const steps = [
  { n: '01', t: 'Upload', d: 'Drop a PE binary into the browser. No installation and no account. Supports .exe, .dll, and .sys files.' },
  { n: '02', t: 'Analyze', d: 'The pipeline runs entropy checks, import table inspection, string extraction, and detection scoring, then applies the matching deobfuscation routines.' },
  { n: '03', t: 'Report', d: 'Get a plain-English breakdown of every detected technique, decoded strings, patch guidance, and a downloadable PDF.' },
]

const stats = [
  { v: '5', l: 'Techniques Detected' },
  { v: '3', l: 'Deobfuscation Methods' },
  { v: '< 10s', l: 'Analysis Time' },
  { v: 'PDF', l: 'Exportable Reports' },
]

const demoSteps = [
  { label: 'Parsing PE headers...', delay: 0 },
  { label: 'Calculating section entropy...', delay: 600 },
  { label: 'Scanning import table...', delay: 1200 },
  { label: 'Running packer signature check...', delay: 1800 },
  { label: 'Extracting ASCII and wide strings...', delay: 2400 },
  { label: 'Running XOR brute force (255 keys)...', delay: 3000 },
  { label: 'Analyzing jump instruction density...', delay: 3600 },
  { label: 'Checking anti-debug API imports...', delay: 4200 },
  { label: 'Scoring detections...', delay: 4800 },
  { label: 'Analysis complete.', delay: 5400 },
]

const demoResults = [
  { technique: 'Packing', detected: true, confidence: 94 },
  { technique: 'String Obfuscation', detected: true, confidence: 78 },
  { technique: 'Control Flow', detected: false, confidence: 12 },
  { technique: 'Junk Code', detected: false, confidence: 8 },
  { technique: 'Anti-Debugging', detected: true, confidence: 87 },
]

// Runs once, the first time it scrolls into view, then stays on the final output.
function LiveDemo() {
  const [visible, setVisible] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [barsOn, setBarsOn] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const timers: number[] = []
    let started = false

    const start = () => {
      if (started) return
      started = true
      demoSteps.forEach((s, i) => {
        timers.push(window.setTimeout(() => setVisible(i + 1), s.delay))
      })
      const end = demoSteps[demoSteps.length - 1].delay
      timers.push(window.setTimeout(() => setShowResults(true), end + 500))
      timers.push(window.setTimeout(() => setBarsOn(true), end + 650))
    }
    const stop = () => timers.forEach(t => window.clearTimeout(t))

    if (typeof IntersectionObserver === 'undefined') {
      start()
      return stop
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          start()
          io.disconnect()
        }
      },
      { threshold: 0.35 }
    )
    io.observe(el)
    return () => {
      io.disconnect()
      stop()
    }
  }, [])

  const pct = Math.round((visible / demoSteps.length) * 100)

  return (
    <div ref={ref} className="rv-demo lg">
      <div className="rv-demo-bar">
        <span className="rv-demo-dot" />
        <span className="rv-demo-dot" />
        <span className="rv-demo-dot" />
        <span className="rv-demo-title">reversor / analysis-pipeline</span>
      </div>
      <div className="rv-demo-progress"><i style={{ width: pct + '%' }} /></div>
      <div className="rv-demo-body">
        <div className="rv-demo-log">
          {visible === 0 && <p className="rv-muted">Waiting for input...</p>}
          {demoSteps.slice(0, visible).map((s, i) => (
            <div key={s.label} className="rv-log-line">
              <span className="rv-log-caret">&gt;</span>
              <span className={i === demoSteps.length - 1 ? 'rv-log-done' : ''}>{s.label}</span>
            </div>
          ))}
        </div>
        <div className="rv-demo-results">
          {!showResults ? (
            <div className="rv-center rv-muted">Awaiting results...</div>
          ) : (
            <>
              <p className="rv-label">Detection Results</p>
              {demoResults.map((r, i) => (
                <div key={r.technique} className="rv-result">
                  <div className="rv-result-row">
                    <span className={'rv-result-name' + (r.detected ? ' hit' : '')}>{r.technique}</span>
                    <span className={'rv-result-pct' + (r.detected ? ' hit' : '')}>
                      {r.detected ? 'Detected' : 'Clean'} · {r.confidence}%
                    </span>
                  </div>
                  <div className="rv-bar">
                    <i
                      className={r.detected ? 'on' : 'off'}
                      style={{ width: barsOn ? r.confidence + '%' : '0%', transitionDelay: i * 100 + 'ms' }}
                    />
                  </div>
                </div>
              ))}
              <div className="rv-verdict">High Risk — 3 Techniques Detected</div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 60)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <div className="rv-page">
      <Particles />
      <Navbar />

      <main className="rv-main">
        {/* ---------- HERO ---------- */}
        <section className={'rv-hero' + (ready ? ' ready' : '')}>
          <div className="rv-hero-grid">
            <div className="rv-hero-copy">
              <h1 className="rv-title">REVERSOR</h1>
              <p className="rv-tagline">Automated Reverse Engineering, Built for Everyone.</p>
              <div>
                <button className="rv-btn" onClick={() => navigate('/tool')}>Analyze a Binary</button>
              </div>
            </div>

            <div className="rv-hero-art" aria-hidden="true">
              <div className="rv-sphere" />
              <div className="rv-sphere-shadow" />
              <div className="rv-chip lg rv-chip-a"><span className="rv-dot" />Packing <b>94%</b></div>
              <div className="rv-chip lg rv-chip-b"><span className="rv-dot" />Anti-Debugging <b>87%</b></div>
              <div className="rv-chip lg rv-chip-c"><span className="rv-dot" />String Obfuscation <b>78%</b></div>
            </div>
          </div>

          <div className="rv-stats lg">
            {stats.map(s => (
              <div key={s.l} className="rv-stat">
                <div className="rv-stat-v">{s.v}</div>
                <div className="rv-stat-l">{s.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- PROBLEM ---------- */}
        <section className="rv-section">
          <Reveal>
            <div className="rv-panel lg">
              <h2 className="rv-h2">Reverse Engineering Is Fragmented. Reversor Unifies It.</h2>
              <p className="rv-p">
                Security analysts today switch between Ghidra, IDA Pro, FLOSS, and Detect-It-Easy just to understand a single binary. Each tool solves one piece of the problem. None of them talk to each other, and none produce output a non-technical stakeholder can read.
              </p>
              <p className="rv-p">
                Reversor is the unified layer. One upload, one pipeline, one plain-English report, covering identification and reversal of the most common obfuscation techniques.
              </p>
            </div>
          </Reveal>
        </section>

        {/* ---------- LIVE DEMO ---------- */}
        <section className="rv-section">
          <Reveal>
            <LiveDemo />
          </Reveal>
        </section>

        {/* ---------- FEATURES ---------- */}
        <section className="rv-section">
          <Reveal>
            <div className="rv-features">
              {features.map(f => (
                <div key={f.n} className="rv-feature lg">
                  <span className="rv-feature-n">{f.n}</span>
                  <h3>{f.title}</h3>
                  <p>{f.description}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ---------- HOW IT WORKS ---------- */}
        <section className="rv-section">
          <Reveal>
            <h2 className="rv-h2 rv-h2-pink">HOW IT WORKS</h2>
            <div className="rv-steps">
              {steps.map(s => (
                <div key={s.n} className="rv-step lg">
                  <div className="rv-orb">{s.n}</div>
                  <h3>{s.t}</h3>
                  <p>{s.d}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ---------- CTA ---------- */}
        <section className="rv-section">
          <Reveal>
            <div className="rv-cta lg">
              <h2 className="rv-h2">Ready to Analyze a Binary?</h2>
              <p>No Account Required. Upload Directly and Get Results in Seconds.</p>
              <button className="rv-btn" onClick={() => navigate('/tool')}>Launch Reversor →</button>
            </div>
          </Reveal>
        </section>
      </main>

      <Footer />
    </div>
  )
}
