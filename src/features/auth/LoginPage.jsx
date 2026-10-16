import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TextInput, PasswordInput, Button,
  Text, Anchor, Alert, Stack, useMantineColorScheme,
} from '@mantine/core'
import {
  IconSun, IconMoon, IconMail, IconLock, IconArrowRight,
  IconBrandGoogleFilled, IconShieldCheck,
} from '@tabler/icons-react'
import { useAuth } from './AuthContext'
import { LogoMark } from '@/components/ui/Logo/LogoMark'
import styles from './LoginPage.module.css'
import heroImg from '../../assets/login-hero.svg'

export function LoginPage() {
  const { signIn, signUp, signInWithGoogle, user, loading: authLoading } = useAuth()
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

  const isLogin = mode === 'login'

  async function handleGoogle() {
    setError('')
    setInfo('')
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(translateError(err.message))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      if (isLogin) {
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
    <main className={styles.page}>
      <aside className={styles.brandPanel}>
        <img src={heroImg} alt="" className={styles.heroImg} />
        <div className={styles.scrim} />

        <div className={styles.brandTop}>
          <LogoMark size={36} />
          <span className={styles.logoText}>
            God<span className={styles.logoAccent}>Money</span>
          </span>
        </div>

        <div className={styles.brandBottom}>
          <span className={styles.eyebrowLight}>Finanzas personales</span>
          <h1 className={styles.heroTitle}>
            Tus finanzas personales, bajo control real.
          </h1>
          <p className={styles.heroDesc}>
            Registra ingresos y gastos, arma presupuestos y metas de ahorro, y
            consulta todo con un asistente de IA.
          </p>
        </div>
      </aside>

      <section className={styles.formColumn}>
        <button
          className={styles.themeBtn}
          onClick={toggleColorScheme}
          aria-label="Cambiar tema"
        >
          {colorScheme === 'dark' ? <IconSun size={18} stroke={1.75} /> : <IconMoon size={18} stroke={1.75} />}
        </button>

        <div className={styles.formWrap}>
          <span className={styles.mobileLogo}>
            <LogoMark size={32} />
            <span>God<span className={styles.logoAccent}>Money</span></span>
          </span>

          <span className={styles.eyebrow}>Acceso seguro</span>
          <h2 className={styles.title}>{isLogin ? 'Iniciar sesión' : 'Crear cuenta'}</h2>
          <p className={styles.subtitle}>
            {isLogin ? 'Ingresa con tu correo y contraseña.' : 'Comienza a gestionar tus finanzas.'}
          </p>

          {error && (
            <Alert color="red" radius="sm" variant="light" className={styles.alert} role="alert">
              {error}
            </Alert>
          )}
          {info && (
            <Alert color="green" radius="sm" variant="light" className={styles.alert} role="status">
              {info}
            </Alert>
          )}

          <div className={styles.card}>
            <form onSubmit={handleSubmit}>
              <Stack gap="md">
                <TextInput
                  label="Correo electrónico"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  size="md"
                  radius="sm"
                  leftSection={<IconMail size={16} stroke={1.75} />}
                  classNames={{ input: styles.input, label: styles.inputLabel }}
                />
                <PasswordInput
                  label="Contraseña"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  size="md"
                  radius="sm"
                  minLength={6}
                  leftSection={<IconLock size={16} stroke={1.75} />}
                  classNames={{ input: styles.input, label: styles.inputLabel }}
                />
                <Button
                  type="submit"
                  fullWidth
                  loading={loading}
                  radius="sm"
                  size="lg"
                  className={styles.submitBtn}
                  rightSection={!loading && <IconArrowRight size={16} stroke={2} />}
                >
                  {isLogin ? 'Ingresar' : 'Crear cuenta'}
                </Button>
              </Stack>
            </form>

            <div className={styles.divider}><span>o</span></div>

            <Button
              type="button"
              fullWidth
              variant="default"
              radius="sm"
              size="md"
              className={styles.googleBtn}
              leftSection={<IconBrandGoogleFilled size={16} />}
              onClick={handleGoogle}
            >
              Continuar con Google
            </Button>
          </div>

          <div className={styles.footer}>
            <Text size="sm" className={styles.switchMode}>
              {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
              <Anchor
                component="button"
                type="button"
                fw={600}
                className={styles.switchModeLink}
                onClick={() => { setMode(isLogin ? 'register' : 'login'); setError(''); setInfo('') }}
              >
                {isLogin ? 'Crear cuenta' : 'Inicia sesión'}
              </Anchor>
            </Text>
            <span className={styles.secure}>
              <IconShieldCheck size={14} stroke={1.75} /> Conexión cifrada
            </span>
          </div>
        </div>
      </section>
    </main>
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
