import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Particles from '../components/Particles'
import { useNavigate } from 'react-router-dom'

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
  margin: '60px 0',
}

const techniques = [
  { name: 'Packing', summary: 'The binary is compressed or encrypted and decompresses itself at runtime.', detail: 'Packers like UPX reduce file size or hide code from static analysis. When executed, a small stub decompresses the original code into memory. Detection relies on entropy analysis — packed sections have near-random byte distributions — and known packer signatures.' },
  { name: 'String Obfuscation', summary: 'Readable strings are encoded so they cannot be found through simple inspection.', detail: 'Malware authors encode strings like URLs, registry keys, and commands using XOR, Base64, or character-by-character stack construction. This prevents analysts from finding indicators of compromise through basic string extraction.' },
  { name: 'Control Flow Obfuscation', summary: "The program's logical flow is scrambled to make it harder to follow.", detail: 'Control flow flattening routes all code blocks through a central dispatcher, eliminating the natural top-to-bottom structure of a program. Opaque predicates insert conditional branches whose outcome is always fixed, adding noise that confuses both humans and automated tools.' },
  { name: 'Junk Code Insertion', summary: 'Useless instructions are added to inflate the binary and slow down analysis.', detail: 'Dead code that never executes, NOP sleds, and meaningless arithmetic operations are inserted throughout the binary. This increases analysis time without affecting runtime behaviour, effectively slowing down reverse engineers.' },
  { name: 'Anti-Debugging', summary: 'The binary checks whether it is being analyzed and alters its behaviour if it is.', detail: 'Calls to APIs like IsDebuggerPresent, NtQueryInformationProcess, and timing functions like GetTickCount detect the presence of a debugger. When detected, the program may terminate, behave differently, or delete itself — preventing dynamic analysis.' },
]

export default function About() {
  const navigate = useNavigate()

  return (
    <div style={bg}>
      <Particles />
      <Navbar />

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '100px 24px 0' }}>

        <div style={{ paddingTop: 40, marginBottom: 60 }}>
          <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem', letterSpacing: '0.2em', color: '#FF0080', marginBottom: 16 }}>ABOUT REVERSOR</p>
          <h1 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#fff', margin: '0 0 20px', lineHeight: 1.25 }}>
            What is obfuscation,<br />and why does it matter?
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '1.05rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, maxWidth: 680, margin: 0 }}>
            Obfuscation is the deliberate transformation of code to make it harder to understand, analyze, or detect — without changing what the code actually does. It is the primary technique used by malware authors to evade antivirus tools, slow down analysts, and extend the time a threat stays undetected.
          </p>
        </div>

        <div style={divider} />

        <div style={{ marginBottom: 60 }}>
          <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem', letterSpacing: '0.2em', color: '#FF0080', marginBottom: 16 }}>THE CHALLENGE</p>
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: '#fff', margin: '0 0 20px' }}>Why existing tools fall short</h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '1rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, margin: '0 0 16px' }}>
            The reverse engineering toolchain today is fragmented. Ghidra and IDA Pro are industry-standard disassemblers, but they require significant expertise and produce raw assembly output. FLOSS recovers obfuscated strings but only addresses one technique. Detect-It-Easy identifies packers but cannot reverse them. No single tool handles the full obfuscation identification and reversal pipeline.
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '1rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, margin: 0 }}>
            More critically, none of these tools produce output that a non-technical stakeholder can read. A security manager or incident responder who needs to understand what a suspicious binary does cannot use raw disassembly. Reversor was built to close that gap — automated analysis, plain-English output, and exportable reports.
          </p>
        </div>

        <div style={divider} />

        <div style={{ marginBottom: 60 }}>
          <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem', letterSpacing: '0.2em', color: '#FF0080', marginBottom: 16 }}>TECHNIQUES COVERED</p>
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: '#fff', margin: '0 0 32px' }}>Five categories of obfuscation</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {techniques.map(t => (
              <div key={t.name} style={{ ...glass, padding: '24px 28px' }}>
                <h3 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#fff', margin: '0 0 6px' }}>{t.name}</h3>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', color: '#FF0080', margin: '0 0 12px', fontStyle: 'italic' }}>{t.summary}</p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, margin: 0 }}>{t.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={divider} />

        <div style={{ marginBottom: 60 }}>
          <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem', letterSpacing: '0.2em', color: '#FF0080', marginBottom: 16 }}>TECHNICAL APPROACH</p>
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: '#fff', margin: '0 0 20px' }}>How Reversor works</h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '1rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, margin: '0 0 16px' }}>
            Reversor uses a static analysis pipeline built on PE file parsing, entropy analysis, import table inspection, and control flow heuristics. Features are extracted from the binary and passed through a multi-label classifier that produces a confidence score for each obfuscation category independently.
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '1rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, margin: '0 0 16px' }}>
            Where detection is confirmed, targeted deobfuscation routines run automatically — UPX unpacking for packed binaries, XOR brute force and Base64 decoding for obfuscated strings, and API identification with patch guidance for anti-debugging techniques.
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '1rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, margin: 0 }}>
            All analysis is static — the binary is never executed, making the tool safe to use with suspicious or malicious files.
          </p>
        </div>

        <div style={divider} />

        {/* Try it CTA */}
        <div style={{ ...glass, padding: '40px 36px', marginBottom: 60, textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '1.4rem', color: '#fff', margin: '0 0 12px' }}>Try it yourself</h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)', margin: '0 0 28px' }}>Upload a binary and see the full analysis pipeline in action.</p>
          <button
            onClick={() => navigate('/tool')}
            style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.15em', padding: '13px 36px', background: '#FF0080', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', boxShadow: '0 0 20px rgba(255,0,128,0.6)' }}
          >
            LAUNCH REVERSOR →
          </button>
        </div>

        <div style={divider} />

        {/* About the author */}
        <div style={{ marginBottom: 80 }}>
          <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '0.7rem', letterSpacing: '0.2em', color: '#FF0080', marginBottom: 16 }}>THE PERSON BEHIND IT</p>
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: '#fff', margin: '0 0 28px' }}>Areesha Aftab</h2>

          <div style={{ ...glass, padding: '32px 36px', marginBottom: 24 }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '1.05rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.9, margin: 0 }}>
              I'm a cybersecurity graduate with a keen interest in reverse engineering. I'm specifically very intrigued by binary exploitation and malware development, and building solutions around them. This is my first ever deployed project, and I'm really excited for you guys to try it.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px', background: 'rgba(255,0,128,0.06)', border: '1px solid rgba(255,0,128,0.2)', borderRadius: 12 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
              <path d="M3 5h14a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1V6a1 1 0 011-1z" stroke="#FF0080" strokeWidth="1.2" />
              <path d="M3 6l7 5 7-5" stroke="#FF0080" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Get in touch</p>
              <a href="mailto:areesha.aftab@proton.me" style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.95rem', color: '#FF0080', textDecoration: 'none', fontWeight: 500 }}>
                areesha.aftab@proton.me
              </a>
            </div>
          </div>
        </div>

      </div>

      <Footer />
    </div>
  )
}
