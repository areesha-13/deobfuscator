import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MouseTrail from './components/MouseTrail'
import Landing from './pages/Landing'
import Tool from './pages/Tool'
import About from './pages/About'

export default function App() {
  return (
    <BrowserRouter>
      <MouseTrail />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/tool" element={<Tool />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </BrowserRouter>
  )
}
