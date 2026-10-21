import '@fontsource-variable/newsreader'
import './index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { BrandLab } from './components/dev/brand-lab'
import { initBrand } from './lib/brand'
import { applyPowerTier } from './lib/device'

initBrand()
// The tier decides how much the stylesheet may frost. It is set before the
// first paint, so the first frame is already the cheap one.
applyPowerTier()

const container = document.getElementById('root')
if (!container) throw new Error('Root element is missing')

createRoot(container).render(
  <StrictMode>
    <App />
    <BrandLab />
  </StrictMode>,
)
