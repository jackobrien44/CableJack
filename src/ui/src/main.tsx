import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

let scrollTimer: ReturnType<typeof setTimeout> | null = null

document.addEventListener('scroll', (e) => {
  const target = e.target as Element
  target.classList.add('is-scrolling')
  if (scrollTimer) clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => target.classList.remove('is-scrolling'), 1000)
}, { capture: true, passive: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
