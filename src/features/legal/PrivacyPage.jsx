import { Link } from 'react-router-dom'
import { LogoMark } from '@/components/ui/Logo/LogoMark'
import styles from './PrivacyPage.module.css'

const CONTACT = 'abelpantachira99@gmail.com'
const UPDATED = '16 de octubre de 2026'

export function PrivacyPage() {
  return (
    <main className={styles.page}>
      <article className={styles.doc}>
        <Link to="/login" className={styles.brand}>
          <LogoMark size={32} />
          <span>God<span className={styles.accent}>Money</span></span>
        </Link>

        <h1>Política de privacidad</h1>
        <p className={styles.updated}>Última actualización: {UPDATED}</p>

        <p>
          GodMoney es una aplicación de finanzas personales. Esta política explica qué datos
          guardamos, para qué los usamos y qué control tienes sobre ellos.
        </p>

        <h2>Datos que guardamos</h2>
        <ul>
          <li><strong>Cuenta:</strong> tu correo electrónico y, si entras con Google, tu nombre y correo de Google.</li>
          <li><strong>Datos financieros que tú registras:</strong> ingresos, gastos, categorías, cuentas, presupuestos, metas, préstamos, pagos recurrentes, transferencias, etiquetas y notas.</li>
          <li><strong>Adjuntos:</strong> las fotos o PDF que decides adjuntar a un movimiento (ver “Google Drive”).</li>
        </ul>

        <h2>Para qué los usamos</h2>
        <p>
          Únicamente para ofrecerte las funciones de la aplicación: mostrar tus movimientos, calcular
          resúmenes, presupuestos y predicciones, y enviarte los recordatorios que actives.
          No vendemos tus datos ni los usamos para publicidad.
        </p>

        <h2>Google Drive</h2>
        <p>
          Si adjuntas archivos, GodMoney solicita el permiso <code>drive.file</code> de Google. Este permiso
          solo permite a la aplicación crear y acceder a <strong>los archivos que ella misma sube</strong>
          (en la carpeta “GodMoney - Adjuntos”); no puede ver ni modificar el resto de tu Drive.
          Los archivos permanecen en tu cuenta de Google y puedes borrarlos desde Drive en cualquier momento.
          GodMoney solo guarda en su base de datos el enlace, el nombre del archivo y una miniatura reducida.
        </p>
        <p>
          El uso de la información recibida de las API de Google cumple con la{' '}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
            Política de datos de usuario de los servicios de las API de Google
          </a>, incluidos los requisitos de uso limitado.
        </p>

        <h2>Proveedores que procesan datos</h2>
        <ul>
          <li><strong>Supabase:</strong> autenticación y base de datos donde se almacena tu información.</li>
          <li><strong>Google (Gemini):</strong> si usas el asistente de IA, el texto de tu consulta y el contexto financiero necesario para responderla se envían a Google para generar la respuesta.</li>
          <li><strong>Render:</strong> alojamiento de la aplicación.</li>
          <li><strong>Telegram y notificaciones push:</strong> solo si activas los recordatorios.</li>
        </ul>

        <h2>Seguridad</h2>
        <p>
          Las conexiones usan HTTPS y cada usuario solo puede acceder a sus propios datos mediante
          reglas de seguridad a nivel de fila en la base de datos.
        </p>

        <h2>Responsable del tratamiento y base legal</h2>
        <p>
          El responsable es Abel Panta Chira (Perú), contacto: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
          Tratamos tus datos conforme a la Ley N.° 29733, Ley de Protección de Datos Personales, y su
          reglamento. La base legal es tu consentimiento, que otorgas al crear tu cuenta aceptando esta
          política y los <Link to="/terminos">términos de uso</Link>. No solicitamos datos sensibles ni números
          de tarjetas o contraseñas bancarias: te recomendamos no escribirlos en notas ni adjuntos.
        </p>

        <h2>Conservación y transferencia internacional</h2>
        <p>
          Conservamos tus datos mientras mantengas tu cuenta y los eliminamos cuando lo solicites. Los
          proveedores listados arriba (Supabase, Google, Render, Telegram) pueden almacenar o procesar datos
          en servidores fuera del Perú; al aceptar esta política consientes dicha transferencia, limitada a lo
          necesario para prestar el servicio.
        </p>

        <h2>Menores de edad</h2>
        <p>
          La aplicación está dirigida a mayores de 18 años. Si detectamos una cuenta de un menor sin
          autorización de su representante, la eliminaremos.
        </p>

        <h2>Tus derechos</h2>
        <p>
          Puedes ejercer tus derechos de acceso, rectificación, cancelación y oposición (ARCO) escribiendo a{' '}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>; responderemos dentro de los plazos legales. También puedes
          editar o eliminar tus movimientos desde la aplicación y revocar el acceso a Drive en{' '}
          <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">
            myaccount.google.com/permissions
          </a>. Si consideras que no atendimos tu solicitud, puedes acudir a la Autoridad Nacional de
          Protección de Datos Personales (Ministerio de Justicia y Derechos Humanos).
        </p>

        <h2>Limitaciones</h2>
        <p>
          Aplicamos medidas razonables de seguridad, pero ningún sistema es infalible. La clave de API de
          Gemini que ingreses se guarda asociada a tu cuenta para operar el asistente; puedes borrarla en
          cualquier momento desde Configuración.
        </p>

        <h2>Cambios y contacto</h2>
        <p>
          Si esta política cambia, actualizaremos la fecha de arriba. Para cualquier consulta:{' '}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>

        <Link to="/login" className={styles.back}>← Volver al inicio</Link>
      </article>
    </main>
  )
}
