import { StrictMode } from 'react'
import { createRoot }  from 'react-dom/client'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@/styles/global.css'
import App from './App'

// Un chunk lazy que ya no existe en el servidor (se desplegó una versión nueva
// con la pestaña abierta) se recupera recargando una vez, en vez de dejar la
// pantalla en blanco.
window.addEventListener('vite:preloadError', (event) => {
  const KEY = 'gm.preload-reload'
  if (sessionStorage.getItem(KEY)) return
  sessionStorage.setItem(KEY, '1')
  event.preventDefault()
  window.location.reload()
})
// Si tras recargar la app se mantiene estable, se permite otro intento futuro
// (sin esta espera, un despliegue roto entraría en un bucle de recargas).
window.addEventListener('load', () => {
  setTimeout(() => sessionStorage.removeItem('gm.preload-reload'), 15000)
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
