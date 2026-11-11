import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="rv-footer-wrap">
      <div className="rv-footer lg">
        <span className="rv-logo">REVERSOR</span>
        <div className="rv-footer-links">
          <Link to="/">Home</Link>
          <Link to="/tool">Tool</Link>
          <Link to="/about">About</Link>
        </div>
        <span className="rv-footer-note">Built for Security Research and Analysis.</span>
      </div>
    </footer>
  )
}
