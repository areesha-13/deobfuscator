import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Particles from '../components/Particles'

const bg: React.CSSProperties = {
  background: 'linear-gradient(135deg, #000 0%, #1a0010 35%, #3d0025 60%, #000 100%)',
  minHeight: '100vh', color: '#fff',
}

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(24px) saturate(1.4)',
  WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 16,
}

const divider: React.CSSProperties = {
  height: 1,
  background: 'linear-gradient(90deg, transparent, rgba(255,0,128,0.4), transparent)',
  margin: '80px 0',
}

const features = [
  { title: "Packing Detection", icon: "📦", description: "Identifies UPX, MPRESS, and custom packers using entropy analysis and signature matching. Automatically attempts unpacking where possible." },
  { title: "String Obfuscation", icon: "🔤", description: "Recovers hidden strings through XOR brute force, Base64 decoding, and ROT13 — revealing concealed URLs, commands, and configuration data." },
  { title: "Control Flow Analysis", icon: "🔀", description: "Detects control flow flattening and opaque predicates through jump density analysis and section anomaly detection." },
  { title: "Junk Code Detection", icon: "🗑️", description: "Identifies dead code and NOP sled padding through file size, import ratio, and instruction density heuristics." },
  { title: "Anti-Debug Detection", icon: "🛡️", description: "Flags anti-debugging API calls and timing checks, then provides targeted patch guidance for each one found." },
]

const demoSteps = [
  { label: "Parsing PE headers...", delay: 0 },
  { label: "Calculating section entropy...", delay: 600 },
  { label: "Scanning import table...", delay: 1200 },
  { label: "Running packer signature check...", delay: 1800 },
  { label: "Extracting ASCII and wide strings...", delay: 2400 },
  { label: "Running XOR brute force (255 keys)...", delay: 3000 },
  { label: "Analysing jump instruction density...", delay: 3600 },
  { label: "Checking anti-debug API imports...", delay: 4200 },
  { label: "Running ML classifier...", delay: 4800 },
  { label: "Analysis complete.", delay: 5400 },
]

const demoResults = [
  { technique: "Packing", detected: true, confidence: 94 },
  { technique: "String Obfuscation", detected: true, confidence: 78 },
  { technique: "Control Flow", detected: false, confidence: 12 },
  { technique: "Junk Code", detected: false, confidence: 8 },
  { technique: "Anti-Debugging", detected: true, confidence: 87 },
]

function LiveDemo() {
  const [visibleSteps, setVisibleSteps] = useState<number[]>([])
  const [showResults, setShowResults] = useState(false)
  const [animatedBars, setAnimatedBars] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const hasRun = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasRun.current) {
          hasRun.current = true
          demoSteps.forEach((step, i) => {
            setTimeout(() => {
              setVisibleSteps(prev => [...prev, i])
              if (i === demoSteps.length - 1) {
                setTimeout(() => {
                  setShowResults(true)
                  setTimeout(() => setAnimatedBars(true), 100)
                }, 400)
              }
            }, step.delay)
          })
        }
      },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} style={{ ...glass, padding: 0, overflow: 'hidden', border: '1px solid rgba(255,0,128,0.2)' }}>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.3)' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
        <span style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginLeft: 12 }}>reversor — analysis pipeline</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 280 }}>
        <div style={{ padding: '20px 24px', borderRight: '1px solid rgba(255,255,255,0.06)', fontFamily: 'Roboto Mono, monospace', fontSize: '0.78rem', lineHeight: 2 }}>
          {visibleSteps.length === 0 && <p style={{ color: 'rgba(255,255,255,0.25)', margin: 0 }}>Initializing...</p>}
          {visibleSteps.map(i => (
            <div key={i} style={{ display: 'flex', gap: 10 }}>
              <span style={{ color: '#FF0089' }}>{'>'}</span>
              <span style={{ color: i === demoSteps.length - 1 ? '#00CC66' : 'rgba(255,255,255,0.85)' }}>{demoSteps[i].label}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: '20px 24px' }}>
          {!showResults ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <p style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '0.8rem', color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>Awaiting results...</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.6rem', letterSpacing: '0.14em', color: '#FF0089', margin: '0 0 4px' }}>DETECTION RESULTS</p>
              {demoResults.map((r, i) => (
                <div key={r.technique}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '0.78rem', color: r.detected ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)', fontWeight: r.detected ? 600 : 400 }}>{r.technique}</span>
                    <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.7rem', color: r.detected ? '#FF0089' : 'rgba(255,255,255,0.25)' }}>{r.detected ? '✓' : '✗'} {r.confidence}%</span>
                  </div>
                  <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2 }}>
                    <div style={{ height: '100%', borderRadius: 2, width: animatedBars ? r.confidence + '%' : '0%', background: r.detected ? 'linear-gradient(90deg, #FF0089, #FF66B2)' : 'rgba(255,255,255,0.15)', boxShadow: r.detected ? '0 0 8px rgba(255,0,137,0.6)' : 'none', transition: 'width 0.8s ease ' + (i * 0.1) + 's' }} />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(255,0,137,0.08)', border: '1px solid rgba(255,0,137,0.2)', borderRadius: 8 }}>
                <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.62rem', letterSpacing: '0.1em', color: '#FF6600' }}>HIGH RISK — 3 techniques detected</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ title, icon, description }: { title: string; icon: string; description: string }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ ...glass, padding: 28, cursor: "default", transform: hovered ? "translateY(-6px)" : "translateY(0)", borderColor: hovered ? "rgba(255,0,128,0.35)" : "rgba(255,255,255,0.1)", boxShadow: hovered ? "0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(255,0,128,0.12)" : "none", transition: "transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease" }}>
      <h3 style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: "1rem", color: hovered ? "#FF0080" : "#fff", margin: "0 0 10px", transition: "color 0.2s" }}>{title}</h3>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.875rem", color: "rgba(255,255,255,0.85)", lineHeight: 1.7, margin: 0 }}>{description}</p>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const [vis, setVis] = useState({ title: false, sub: false, cta: false })
  useEffect(() => {
    const t1 = setTimeout(() => setVis(v => ({ ...v, title: true })), 100)
    const t2 = setTimeout(() => setVis(v => ({ ...v, sub: true })), 500)
    const t3 = setTimeout(() => setVis(v => ({ ...v, cta: true })), 900)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  return (
    <div style={bg}>
      <Particles />
      <Navbar />

      <section style={{ position: "relative", overflow: "hidden", height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 48px", textAlign: "center" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 80% 65% at 50% 40%, rgba(255,0,128,0.15) 0%, rgba(255,0,128,0.05) 50%, transparent 80%)", zIndex: 0 }} />
        <div style={{ position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)", width: 700, height: 500, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(255,0,128,0.2) 0%, transparent 70%)", filter: "blur(50px)", pointerEvents: "none", zIndex: 0 }} />

        <div style={{ position: "relative", zIndex: 3, maxWidth: 800, width: "100%" }}>
          
          <h1 style={{ fontFamily: "Orbitron, sans-serif", fontWeight: 900, fontSize: "clamp(3.5rem, 9vw, 7rem)", color: "#FF0080", textShadow: "0 0 20px rgba(255,0,128,1), 0 0 60px rgba(255,0,128,0.6), 0 0 120px rgba(255,0,128,0.3)", letterSpacing: "0.06em", margin: "0 0 20px", lineHeight: 1, opacity: vis.title ? 1 : 0, transform: vis.title ? "translateY(0)" : "translateY(20px)", transition: "opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s" }}>
            REVERSOR
          </h1>

          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "clamp(1rem, 2.2vw, 1.3rem)", color: "rgba(255,255,255,0.9)", margin: "0 auto 12px", opacity: vis.sub ? 1 : 0, transform: vis.sub ? "translateY(0)" : "translateY(16px)", transition: "opacity 0.6s ease, transform 0.6s ease" }}>
            Automated Reverse Engineering, Built for Everyone.
          </p>

          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", opacity: vis.cta ? 1 : 0, transform: vis.cta ? "translateY(0)" : "translateY(16px)", transition: "opacity 0.6s ease, transform 0.6s ease" }}>
            <button onClick={() => navigate("/tool")} onMouseEnter={e => (e.target as HTMLElement).style.transform = "translateY(-2px)"} onMouseLeave={e => (e.target as HTMLElement).style.transform = "translateY(0)"} style={{ fontFamily: "Orbitron, sans-serif", fontWeight: 700, fontSize: "0.85rem", letterSpacing: "0.15em", padding: "14px 36px", background: "#FF0080", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", boxShadow: "0 0 24px rgba(255,0,128,0.7), 0 0 60px rgba(255,0,128,0.3)", transition: "transform 0.15s" }}>ANALYZE A BINARY</button>
          </div>

          <div style={{ display: "flex", gap: 40, justifyContent: "center", marginTop: 52, flexWrap: "wrap", opacity: vis.cta ? 1 : 0, transition: "opacity 0.6s ease 0.3s" }}>
            {[["5", "Techniques Detected"], ["3", "Deobfuscation Methods"], ["< 10s", "Analysis Time"], ["PDF", "Exportable Reports"]].map(([v, l]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <p style={{ fontFamily: "Orbitron, sans-serif", fontWeight: 900, fontSize: "1.6rem", color: "#FF0080", textShadow: "0 0 10px rgba(255,0,128,0.7)", margin: "0 0 4px" }}>{v}</p>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.75rem", color: "rgba(255,255,255,0.85)", margin: 0 }}>{l}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 3, opacity: 0.4 }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ animation: "bounce 2s infinite" }}>
            <path d="M5 8l5 5 5-5" stroke="#FF0080" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <style>{`@keyframes bounce{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(6px)}}`}</style>
      </section>

      <section style={{ padding: "80px 48px", maxWidth: 900, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: "clamp(1.6rem, 3vw, 2.4rem)", color: "#fff", margin: "0 0 24px", lineHeight: 1.3 }}>Reverse engineering is fragmented.<br />Reversor unifies it.</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "1.05rem", color: "rgba(255,255,255,0.88)", lineHeight: 1.8, margin: "0 0 16px" }}>Security analysts today switch between Ghidra, IDA Pro, FLOSS, and Detect-It-Easy just to understand a single binary. Each tool solves one piece of the problem — none of them talk to each other, and none produce output a non-technical stakeholder can read.</p>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "1.05rem", color: "rgba(255,255,255,0.88)", lineHeight: 1.8, margin: 0 }}>Reversor is the unified layer. One upload, one pipeline, one plain-English report — covering identification and reversal of the most common obfuscation techniques.</p>
      </section>

      <div style={divider} />

      <section style={{ padding: "0 48px 80px", maxWidth: 1000, margin: "0 auto" }}>
        <p style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.9rem", letterSpacing: "0.2em", color: "#FF0080", marginBottom: 16, textAlign: "center" }}>DEMONSTRATION</p>
        <LiveDemo />
      </section>

      <div style={divider} />

      <section style={{ padding: "0 48px 80px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
          {features.map(f => <FeatureCard key={f.title} {...f} />)}
        </div>
      </section>

      <div style={divider} />

      <section style={{ padding: '0 48px 80px', maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', color: '#FF0089', textShadow: '0 0 20px rgba(255,0,137,0.5)', margin: '0 0 56px', textAlign: 'center', letterSpacing: '0.06em' }}>HOW IT WORKS</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, position: 'relative' }}>
          {/* Connector line */}
          <div style={{ position: 'absolute', top: 36, left: '16.6%', right: '16.6%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,0,137,0.5), rgba(255,0,137,0.5), transparent)', zIndex: 0 }} />
          {[
            { n: '01', t: 'Upload', d: 'Drop a PE binary into the browser. No installation. No account. Supports .exe, .dll, and .sys files up to 10MB.' },
            { n: '02', t: 'Analyze', d: 'The pipeline runs entropy checks, import table inspection, string extraction, and ML classification — all in under ten seconds.' },
            { n: '03', t: 'Report', d: 'Get a plain-English breakdown of every detected technique, decoded strings, patch guidance, and a downloadable PDF.' },
          ].map((s, i) => (
            <div key={s.n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 24px', position: 'relative', zIndex: 1 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,0,137,0.1)', border: '1px solid rgba(255,0,137,0.4)', boxShadow: '0 0 24px rgba(255,0,137,0.2)', marginBottom: 24, flexShrink: 0 }}>
                <span style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.1rem', color: '#FF0089' }}>{s.n}</span>
              </div>
              <h3 style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: '0.85rem', color: '#fff', margin: '0 0 12px', letterSpacing: '0.1em' }}>{s.t.toUpperCase()}</h3>
              <p style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '0.82rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, margin: 0 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <div style={divider} />

      <section style={{ padding: "0 48px 120px", textAlign: "center" }}>
        <h2 style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: "clamp(1.6rem, 3vw, 2.2rem)", color: "#fff", margin: "0 0 16px" }}>Ready to analyze a binary?</h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "1rem", color: "rgba(255,255,255,0.85)", margin: "0 0 40px" }}>Upload directly and get Results in seconds.</p>
        <button onClick={() => navigate("/tool")} onMouseEnter={e => (e.target as HTMLElement).style.transform = "translateY(-2px)"} onMouseLeave={e => (e.target as HTMLElement).style.transform = "translateY(0)"} style={{ fontFamily: "Orbitron, sans-serif", fontWeight: 700, fontSize: "0.85rem", letterSpacing: "0.15em", padding: "16px 44px", background: "#FF0080", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", boxShadow: "0 0 24px rgba(255,0,128,0.7), 0 0 60px rgba(255,0,128,0.3)", transition: "transform 0.15s" }}>LAUNCH REVERSOR →</button>
      </section>

      <Footer />
    </div>
  )
}
