import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { BrowserRouter } from 'react-router-dom'
import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion'
import { AppRoutes }     from './routes/AppRoutes'
import { AuthProvider }  from './features/auth/AuthContext'
import { UpdatePrompt }  from './components/ui/UpdatePrompt/UpdatePrompt'
import { useThemeColorMeta } from './hooks/useThemeColorMeta'
import { theme, cssVariablesResolver } from './theme/theme'

function ThemeColorSync() {
  useThemeColorMeta()
  return null
}

export default function App() {
  return (
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} defaultColorScheme="light">
      {/* LazyMotion + `m.*`: solo se carga el subconjunto de animaciones DOM.
          reducedMotion="user": con prefers-reduced-motion se anulan los
          desplazamientos y quedan solo fundidos de opacidad. */}
      <LazyMotion features={domAnimation} strict>
        <MotionConfig reducedMotion="user">
          <ThemeColorSync />
          <Notifications position="top-center" limit={3} zIndex={1100} />
          <AuthProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </AuthProvider>
          <UpdatePrompt />
        </MotionConfig>
      </LazyMotion>
    </MantineProvider>
  )
}
