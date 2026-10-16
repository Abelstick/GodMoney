import { Link } from 'react-router-dom'
import { LogoMark } from '@/components/ui/Logo/LogoMark'
import styles from './PrivacyPage.module.css'

const CONTACT = 'abelpantachira99@gmail.com'
const UPDATED = '16 de octubre de 2026'

export function TermsPage() {
  return (
    <main className={styles.page}>
      <article className={styles.doc}>
        <Link to="/login" className={styles.brand}>
          <LogoMark size={32} />
          <span>God<span className={styles.accent}>Money</span></span>
        </Link>

        <h1>Términos y condiciones de uso</h1>
        <p className={styles.updated}>Última actualización: {UPDATED}</p>

        <p>
          Estos términos regulan el uso de GodMoney (“la Aplicación”), un servicio gratuito de registro
          y organización de finanzas personales ofrecido por Abel Panta Chira (“el Titular”), persona natural
          con domicilio en Perú. Al crear una cuenta o usar la Aplicación declaras que los has leído y
          aceptas. Si no estás de acuerdo, no la uses.
        </p>

        <h2>1. Qué es (y qué no es) GodMoney</h2>
        <p>
          GodMoney es una herramienta para que <strong>tú mismo registres y organices</strong> tus ingresos,
          gastos, presupuestos, metas, préstamos y pagos. <strong>No es</strong> una entidad financiera,
          bancaria, aseguradora, casa de bolsa ni central de riesgo; no custodia, mueve ni transfiere dinero
          real, y no se conecta a tus cuentas bancarias. Los saldos y movimientos son los que tú ingresas.
        </p>

        <h2>2. No es asesoría profesional</h2>
        <p>
          Los cálculos, resúmenes, alertas, proyecciones, “score crediticio” y respuestas del asistente de IA
          son <strong>informativos y referenciales</strong>. No constituyen asesoría financiera, de inversión,
          legal, contable, tributaria ni crediticia, ni una recomendación personalizada. Las proyecciones son
          estimaciones estadísticas simples y no garantizan resultados futuros. El registro de “score
          crediticio” es un apunte personal tuyo y no equivale a un reporte oficial de ninguna central de
          riesgo. Antes de tomar decisiones económicas relevantes consulta a un profesional calificado.
        </p>

        <h2>3. Asistente de inteligencia artificial</h2>
        <p>
          El asistente funciona con modelos de IA de terceros (Google Gemini) y con tu propia clave de API.
          Puede generar respuestas incorrectas, incompletas o desactualizadas. Tú eres responsable de
          verificar la información y de cualquier decisión que tomes a partir de ella. El uso de tu clave
          de API puede generar costos o límites en tu cuenta de Google, de los que el Titular no se hace
          responsable. No incluyas en tus consultas información que no quieras compartir con Google.
        </p>

        <h2>4. Tu cuenta y tu responsabilidad</h2>
        <ul>
          <li>Debes ser mayor de 18 años o contar con autorización de tu representante legal.</li>
          <li>Eres responsable de la veracidad de los datos que ingresas y de mantener la confidencialidad de tu contraseña y de tu cuenta de Google.</li>
          <li>Eres responsable de las copias de respaldo de la información que consideres importante. Puedes eliminar tus datos desde la Aplicación o solicitándolo al contacto indicado abajo.</li>
          <li>No debes usar la Aplicación para actividades ilícitas, para intentar acceder a datos de otros usuarios, vulnerar su seguridad, hacer ingeniería inversa o sobrecargar el servicio.</li>
        </ul>

        <h2>5. Recordatorios y notificaciones</h2>
        <p>
          Los recordatorios de pagos (notificaciones push o Telegram) se ofrecen como ayuda adicional y
          <strong> no están garantizados</strong>: pueden retrasarse, no llegar o fallar por causas ajenas al
          Titular (tu dispositivo, tu conexión, permisos del navegador, el servicio de Telegram, etc.). No
          dependas exclusivamente de ellos para cumplir tus obligaciones de pago; el Titular no responde por
          multas, intereses, moras, cargos o perjuicios derivados de un recordatorio que no llegó o llegó tarde.
        </p>

        <h2>6. Disponibilidad y cambios del servicio</h2>
        <p>
          La Aplicación se ofrece <strong>“tal cual” y “según disponibilidad”</strong>, sin garantía de
          funcionamiento ininterrumpido, ausencia de errores ni de pérdida de datos. El Titular puede
          modificar, suspender o discontinuar el servicio, o funciones del mismo, en cualquier momento, con
          aviso razonable cuando sea posible. El servicio depende de proveedores externos (Supabase, Render,
          Google, Telegram) cuyas interrupciones el Titular no controla.
        </p>

        <h2>7. Limitación de responsabilidad</h2>
        <p>
          En la máxima medida permitida por la ley peruana, el Titular no responde por daños indirectos,
          lucro cesante, pérdida de oportunidades, pérdida de datos o decisiones económicas tomadas con base
          en la Aplicación, ni por errores de cálculo derivados de datos mal ingresados. Dado que el servicio
          es gratuito, en caso de que se determine alguna responsabilidad, esta se limitará al monto que hayas
          pagado por el servicio, que es cero. Nada en estos términos excluye la responsabilidad que no pueda
          limitarse por ley (por ejemplo, por dolo o culpa inexcusable) ni los derechos irrenunciables que
          la normativa de protección al consumidor te reconozca.
        </p>

        <h2>8. Seguridad</h2>
        <p>
          Aplicamos medidas razonables de seguridad (conexión HTTPS y aislamiento de datos por usuario), pero
          ningún sistema es infalible. Notifica cualquier vulnerabilidad o uso indebido que detectes a{' '}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>

        <h2>9. Propiedad intelectual</h2>
        <p>
          El software, diseño, marca y logotipo de GodMoney pertenecen al Titular. Se te concede una licencia
          personal, limitada, revocable y no exclusiva para usar la Aplicación. Los datos que ingresas siguen
          siendo tuyos.
        </p>

        <h2>10. Suspensión y terminación</h2>
        <p>
          Puedes dejar de usar la Aplicación y solicitar la eliminación de tu cuenta en cualquier momento. El
          Titular puede suspender o cerrar cuentas que incumplan estos términos o pongan en riesgo el servicio
          o a otros usuarios.
        </p>

        <h2>11. Datos personales</h2>
        <p>
          El tratamiento de tus datos personales se rige por la{' '}
          <Link to="/privacidad">política de privacidad</Link>, conforme a la Ley N.° 29733, Ley de Protección
          de Datos Personales, y su reglamento.
        </p>

        <h2>12. Cambios en estos términos</h2>
        <p>
          Podemos actualizar estos términos; la fecha de arriba indicará la última versión. Si los cambios son
          sustanciales, te lo informaremos en la Aplicación. El uso continuado después del cambio implica
          aceptación.
        </p>

        <h2>13. Ley aplicable y solución de controversias</h2>
        <p>
          Estos términos se rigen por las leyes de la República del Perú. Antes de iniciar cualquier acción,
          las partes intentarán resolver la controversia de buena fe escribiendo a{' '}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. De no lograrse un acuerdo, se someterán a los jueces y
          tribunales competentes del Perú, sin perjuicio de tu derecho de acudir ante el Indecopi u otras
          autoridades cuando la ley lo permita.
        </p>

        <h2>14. Contacto</h2>
        <p>
          Consultas, reclamos o ejercicio de derechos: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>

        <Link to="/login" className={styles.back}>← Volver al inicio</Link>
      </article>
    </main>
  )
}
