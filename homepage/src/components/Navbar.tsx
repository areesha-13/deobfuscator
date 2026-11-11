import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const { pathname } = useLocation()
  return (
    <header className="rv-nav-wrap">
      <nav className="rv-nav lg">
        <Link to="/" className="rv-logo">REVERSOR</Link>
        <div className="rv-nav-links">
          <Link to="/" className={'rv-nav-link' + (pathname === '/' ? ' active' : '')}>Home</Link>
          <Link to="/about" className={'rv-nav-link' + (pathname === '/about' ? ' active' : '')}>About</Link>
          <Link to="/tool" className="rv-btn rv-btn-sm">Launch Tool</Link>
        </div>
      </nav>
    </header>
  )
}
