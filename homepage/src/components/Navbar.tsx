import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const location = useLocation()
  const active = (path: string) => location.pathname === path

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 60, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 48px',
      background: 'rgba(0,0,0,0.55)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
    }}>
      <Link to="/" style={{ textDecoration: 'none' }}>
        <span style={{
          fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: '1.1rem',
          color: '#FF0080', letterSpacing: '0.08em',
          textShadow: '0 0 12px rgba(255,0,128,0.8), 0 0 30px rgba(255,0,128,0.4)',
        }}>REVERSOR</span>
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
        {[['/', 'Home'], ['/about', 'About']].map(([path, label]) => (
          <Link key={path} to={path} style={{
            fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', fontWeight: 500,
            color: active(path) ? '#FF0080' : 'rgba(255,255,255,0.65)',
            textDecoration: 'none', transition: 'color 0.2s',
          }}>{label}</Link>
        ))}
        <Link to="/tool" style={{
          fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', fontWeight: 600,
          color: '#fff', textDecoration: 'none', padding: '8px 20px',
          background: '#FF0080', borderRadius: 8,
          boxShadow: '0 0 16px rgba(255,0,128,0.5)',
        }}>Launch Tool</Link>
      </div>
    </nav>
  )
}
