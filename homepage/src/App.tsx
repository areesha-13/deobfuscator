import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import MouseTrail from './components/MouseTrail'
import Landing from './pages/Landing'
import Tool from './pages/Tool'
import About from './pages/About'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <MouseTrail />
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/tool" element={<Tool />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </BrowserRouter>
  )
}