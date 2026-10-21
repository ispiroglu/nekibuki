import '@fontsource-variable/newsreader'
import './index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { BrandLab } from './components/dev/brand-lab'
import { initBrand } from './lib/brand'

initBrand()

const container = document.getElementById('root')
if (!container) throw new Error('Root element is missing')

createRoot(container).render(
  <StrictMode>
    <App />
    <BrandLab />
  </StrictMode>,
)
