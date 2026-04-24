import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TextInput, PasswordInput, Button, Paper, Title,
  Text, Anchor, Alert, Stack, Divider, Center,
} from '@mantine/core'
import { useMantineColorScheme } from '@mantine/core'
import { useAuth } from './AuthContext'
import styles from './LoginPage.module.css'

export function LoginPage() {
  const { signIn, signUp, user, loading: authLoading } = useAuth()
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()
  const navigate = useNavigate()

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (!authLoading && user) navigate('/', { replace: true })
  }, [user, authLoading, navigate])

  const [mode, setMode]         = useState('login') // 'login' | 'register'
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [info, setInfo]         = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
        navigate('/', { replace: true })
      } else {
        await signUp(email, password)
        setInfo('Revisa tu correo para confirmar tu cuenta.')
        setMode('login')
      }
    } catch (err) {
      setError(translateError(err.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.bg} />

      <button
        className={styles.themeBtn}
        onClick={toggleColorScheme}
        aria-label="Cambiar tema"
      >
        {colorScheme === 'dark' ? '☀️' : '🌙'}
      </button>

      <Center className={styles.center}>
        <div className={styles.formWrap}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>💎</span>
            <span className={styles.logoText}>GodMoney</span>
          </div>

          <Paper shadow="md" className={styles.card}>
            <Title order={2} className={styles.title}>
              {mode === 'login' ? 'Bienvenido de vuelta' : 'Crear cuenta'}
            </Title>
            <Text size="sm" className={styles.subtitle}>
              {mode === 'login'
                ? 'Ingresa tus credenciales para continuar'
                : 'Comienza a gestionar tus finanzas'}
            </Text>

            <Divider my="md" />

            {error && (
              <Alert color="red" mb="md" radius="md" variant="light">
                {error}
              </Alert>
            )}
            {info && (
              <Alert color="green" mb="md" radius="md" variant="light">
                {info}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <Stack gap="md">
                <TextInput
                  label="Correo electrónico"
                  type="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  radius="md"
                />
                <PasswordInput
                  label="Contraseña"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  radius="md"
                  minLength={6}
                />
                <Button
                  type="submit"
                  fullWidth
                  loading={loading}
                  color="violet"
                  radius="md"
                  size="md"
                >
                  {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
                </Button>
              </Stack>
            </form>

            <Text ta="center" size="sm" mt="lg" c="dimmed">
              {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
              <Anchor
                component="button"
                type="button"
                c="violet"
                fw={600}
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setInfo('') }}
              >
                {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
              </Anchor>
            </Text>
          </Paper>
        </div>
      </Center>
    </div>
  )
}

function translateError(msg) {
  if (msg.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.'
  if (msg.includes('Email not confirmed'))        return 'Confirma tu correo antes de iniciar sesión.'
  if (msg.includes('User already registered'))    return 'Este correo ya está registrado.'
  if (msg.includes('Password should be'))         return 'La contraseña debe tener al menos 6 caracteres.'
  if (msg.includes('rate limit'))                 return 'Demasiados intentos. Espera unos minutos.'
  return msg
}
