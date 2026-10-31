import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { BrowserRouter } from 'react-router-dom'
import { AppRoutes }     from './routes/AppRoutes'
import { AuthProvider }  from './features/auth/AuthContext'
import { theme, cssVariablesResolver } from './theme/theme'

export default function App() {
  return (
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} defaultColorScheme="light">
      <Notifications position="top-center" limit={3} zIndex={1100} />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </MantineProvider>
  )
}
