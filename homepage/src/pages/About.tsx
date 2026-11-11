import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Particles from '../components/Particles'
import Reveal from '../components/Reveal'

const techniques = [
  { name: 'Packing', summary: 'The binary is compressed or encrypted and decompresses itself at runtime.', detail: 'Packers like UPX reduce file size or hide code from static analysis. When executed, a small stub decompresses the original code into memory. Detection relies on entropy analysis, since packed sections have near-random byte distributions, and on known packer signatures.' },
  { name: 'String Obfuscation', summary: 'Readable strings are encoded so they cannot be found through simple inspection.', detail: 'Malware authors encode strings like URLs, registry keys, and commands using XOR, Base64, or character-by-character stack construction. This prevents analysts from finding indicators of compromise through basic string extraction.' },
  { name: 'Control Flow Obfuscation', summary: "The program's logical flow is scrambled to make it harder to follow.", detail: 'Control flow flattening routes all code blocks through a central dispatcher, eliminating the natural top-to-bottom structure of a program. Opaque predicates insert conditional branches whose outcome is always fixed, adding noise that confuses both humans and automated tools.' },
  { name: 'Junk Code Insertion', summary: 'Useless instructions are added to inflate the binary and slow down analysis.', detail: 'Dead code that never executes, NOP sleds, and meaningless arithmetic operations are inserted throughout the binary. This increases analysis time without affecting runtime behavior, effectively slowing down reverse engineers.' },
  { name: 'Anti-Debugging', summary: 'The binary checks whether it is being analyzed and alters its behavior if it is.', detail: 'Calls to APIs like IsDebuggerPresent, NtQueryInformationProcess, and timing functions like GetTickCount detect the presence of a debugger. When detected, the program may terminate, behave differently, or delete itself, preventing dynamic analysis.' },
]

export default function About() {
  return (
    <div className="rv-page">
      <Particles />
      <Navbar />

      <main className="rv-main rv-narrow">
        <section className="rv-about-hero lg">
          <h1 className="rv-h1">What Is Obfuscation, and Why Does It Matter?</h1>
          <p className="rv-p">
            Obfuscation is the deliberate transformation of code to make it harder to understand, analyze, or detect, without changing what the code actually does. It is the primary technique used by malware authors to evade antivirus tools, slow down analysts, and extend the time a threat stays undetected.
          </p>
        </section>

        <Reveal>
          <section className="rv-block">
            <h2 className="rv-h2">Why Reversor Matters</h2>
            <p className="rv-p">
              Obfuscation exists to waste an analyst's time. Packed executables, encoded strings, and scrambled control flow hide what a file actually does, and working through each layer by hand takes specialist knowledge and a lot of patience. Until the obfuscation is understood, nothing else about the file can be trusted.
            </p>
            <p className="rv-p">
              Reversor handles that first step automatically. It identifies which obfuscation techniques are present, reverses the ones it can, and explains each finding in plain English, so the person reading the report does not need a background in assembly to understand it.
            </p>
            <p className="rv-p">
              That makes triage faster and puts the answer within reach of the people who need it: incident responders deciding what to do next, managers who need a clear summary, and students learning how obfuscation works. Every report can be exported as a PDF to share with the wider team.
            </p>
          </section>
        </Reveal>

        <Reveal>
          <section className="rv-block">
            <h2 className="rv-h2">Five Categories of Obfuscation</h2>
            <div className="rv-tech-grid">
              {techniques.map(t => (
                <div key={t.name} className="rv-tech lg">
                  <h3>{t.name}</h3>
                  <p className="sum">{t.summary}</p>
                  <p className="det">{t.detail}</p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section className="rv-block">
            <h2 className="rv-h2">How Reversor Works</h2>
            <p className="rv-p">
              Reversor uses a static analysis pipeline built on PE file parsing, entropy analysis, import table inspection, and control flow heuristics. Features are extracted from the binary and scored independently for each obfuscation category, producing a confidence value per technique.
            </p>
            <p className="rv-p">
              Where a technique is detected, the matching routine runs: UPX unpacking for packed binaries, XOR brute force with Base64 and ROT13 decoding for obfuscated strings, and API identification with patch guidance for anti-debugging. Control flow obfuscation and junk code are detected and explained, with guidance for manual follow-up.
            </p>
            <p className="rv-p">
              Reversor focuses on one job: identifying and reversing obfuscation. It is not a disassembler or a decompiler. All analysis is static, so the binary is never executed, which makes the tool safe to use with suspicious files.
            </p>
          </section>
        </Reveal>

        <Reveal>
          <section className="rv-block">
            <h2 className="rv-h2">Areesha Aftab</h2>
            <div className="rv-author lg">
              <p className="rv-p">
                I'm a cybersecurity graduate with a keen interest in reverse engineering. I'm specifically very intrigued by binary exploitation and malware development, and building solutions around them. This is my first ever deployed project, and I'm really excited for you guys to try it.
              </p>
            </div>
            <a href="mailto:areesha.aftab@proton.me" className="rv-mail lg">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M3 5h14a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1V6a1 1 0 011-1z" stroke="#FF0089" strokeWidth="1.3" />
                <path d="M3 6l7 5 7-5" stroke="#FF0089" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              areesha.aftab@proton.me
            </a>
          </section>
        </Reveal>
      </main>

      <Footer />
    </div>
  )
}
