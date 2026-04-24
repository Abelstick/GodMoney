import { MantineProvider, createTheme } from '@mantine/core'
import { BrowserRouter } from 'react-router-dom'
import { AppRoutes }     from './routes/AppRoutes'
import { AuthProvider }  from './features/auth/AuthContext'

const theme = createTheme({
  primaryColor: 'violet',
  defaultRadius: 'md',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  colors: {
    violet: [
      '#eef2ff', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8',
      '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81',
    ],
  },
  components: {
    Button: {
      defaultProps: { radius: 'md' },
    },
    Paper: {
      defaultProps: { radius: 'md' },
    },
    Modal: {
      defaultProps: { radius: 'md', centered: true },
    },
    TextInput: {
      defaultProps: { radius: 'md' },
    },
    NativeSelect: {
      defaultProps: { radius: 'md' },
    },
    Progress: {
      defaultProps: { radius: 'xl' },
    },
  },
})

export default function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </MantineProvider>
  )
}
