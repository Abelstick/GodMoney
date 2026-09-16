import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TextInput, PasswordInput, Button, Title,
  Text, Anchor, Alert, Stack, useMantineColorScheme,
} from '@mantine/core'
import {
  IconSun, IconMoon, IconMail, IconLock, IconArrowRight,
  IconTrendingUp, IconShieldCheck, IconDiamondFilled,
} from '@tabler/icons-react'
import { useAuth } from './AuthContext'
import styles from './LoginPage.module.css'

function ShowcasePanel() {
  return (
    <section className={styles.showcase}>
      <div className={styles.showcaseGlowTop} />
      <div className={styles.showcaseGlowBottom} />

      <div className={styles.showcaseLogo}>
        <div className={styles.logoMark}>
          <IconDiamondFilled size={20} />
        </div>
        <div className={styles.logoText}>
          God<span className={styles.logoAccent}>Money</span>
        </div>
      </div>

      <div className={styles.showcaseBody}>
        <h1 className={styles.showcaseTitle}>
          Tu <span className={styles.showcaseTitleAccent}>finanzas personales</span>, bajo control real
        </h1>
        <p className={styles.showcaseDesc}>
          Registra ingresos y gastos, organiza todo por categorías, arma presupuestos
          y objetivos de ahorro, y consulta tus finanzas con un asistente de IA — todo
          en un solo lugar.
        </p>

        <div className={styles.previewCard}>
          <div className={styles.previewTop}>
            <div>
              <span className={styles.previewLabel}>Profit del mes</span>
              <div className={styles.previewAmount}>S/ 1,240.32</div>
            </div>
            <div className={styles.previewIcon}>
              <IconTrendingUp size={20} stroke={1.75} />
            </div>
          </div>
          <div className={styles.previewBars}>
            {[45, 60, 35, 75, 55, 88, 100].map((h, i) => (
              <div key={i} className={styles.previewBarWrap}>
                <div className={styles.previewBar} style={{ height: `${h}%` }} />
              </div>
            ))}
          </div>
          <div className={styles.previewDays}>
            <span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span>
          </div>
        </div>
      </div>

      <div className={styles.showcaseFooter}>
        <div className={styles.showcaseFooterIcon}>
          <IconShieldCheck size={16} stroke={1.75} />
        </div>
        <div>
          <span className={styles.showcaseFooterTitle}>Tus datos, protegidos.</span>
          <span className={styles.showcaseFooterDesc}>Autenticación gestionada con Supabase Auth.</span>
        </div>
      </div>
    </section>
  )
}

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
      <ShowcasePanel />

      <section className={styles.formColumn}>
        <div className={styles.formHeader}>
          <span className={styles.mobileLogo}>
            <IconDiamondFilled size={16} />
            GodMoney
          </span>
          <button
            className={styles.themeBtn}
            onClick={toggleColorScheme}
            aria-label="Cambiar tema"
          >
            {colorScheme === 'dark' ? <IconSun size={18} stroke={1.75} /> : <IconMoon size={18} stroke={1.75} />}
          </button>
        </div>

        <div className={styles.formCenter}>
          <div className={styles.formWrap}>
            <Title order={2} className={styles.title}>
              {mode === 'login' ? 'Bienvenido de vuelta' : 'Crear cuenta'}
            </Title>
            <Text size="sm" className={styles.subtitle}>
              {mode === 'login'
                ? 'Ingresa tus credenciales para continuar'
                : 'Comienza a gestionar tus finanzas'}
            </Text>

            {error && (
              <Alert color="red" radius="md" variant="light" className={styles.alert}>
                {error}
              </Alert>
            )}
            {info && (
              <Alert color="green" radius="md" variant="light" className={styles.alert}>
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
                  radius="xl"
                  leftSection={<IconMail size={16} stroke={1.75} />}
                  classNames={{ input: styles.input, label: styles.inputLabel }}
                />
                <PasswordInput
                  label="Contraseña"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  radius="xl"
                  minLength={6}
                  leftSection={<IconLock size={16} stroke={1.75} />}
                  classNames={{ input: styles.input, label: styles.inputLabel }}
                />
                <Button
                  type="submit"
                  fullWidth
                  loading={loading}
                  radius="xl"
                  size="md"
                  className={styles.submitBtn}
                  rightSection={!loading && <IconArrowRight size={16} stroke={2} />}
                >
                  {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
                </Button>
              </Stack>
            </form>

            <Text ta="center" size="sm" className={styles.switchMode}>
              {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
              <Anchor
                component="button"
                type="button"
                fw={600}
                className={styles.switchModeLink}
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setInfo('') }}
              >
                {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
              </Anchor>
            </Text>
          </div>
        </div>
      </section>
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
