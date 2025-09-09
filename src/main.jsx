import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppRouter from './Router' // Import AppRouter

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppRouter /> {/* Render AppRouter */}
  </StrictMode>,
)
