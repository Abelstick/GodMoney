<div align="center">

# 💰 GodMoney

### Tus finanzas personales, bajo control real

[![Demo](https://img.shields.io/badge/🌐_Demo_en_vivo-godmoney.onrender.com-4C9BE8?style=for-the-badge)](https://godmoney-hxs3.onrender.com/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/es/docs/Web/JavaScript)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

</div>

---

## 📖 ¿Qué es GodMoney?

GodMoney es una aplicación web para gestionar **finanzas personales** de forma simple pero clara. La idea es tener control real de ingresos, gastos y hábitos financieros **sin depender de hojas de cálculo**.

No intenta ser un sistema contable complejo, sino una **herramienta práctica para uso diario**.

---

## ✨ Funcionalidades

| Función | Descripción |
|---|---|
| 📥 **Ingresos y gastos** | Registro rápido, filtros, búsqueda, agrupación por categoría y exportación a Excel (CSV) |
| 🗂️ **Categorías** | Personalizables; una categoría puede marcarse como **ahorro** |
| 🏦 **Cuentas** | Saldos de tus cuentas y billeteras, con depósitos y retiros manuales |
| 🎯 **Objetivos** | Metas de ahorro vinculadas a tus cuentas: avanzan solas cuando la cuenta crece |
| 🐷 **Ahorro** | Aparta dinero como "gasto que no se toca" y envíalo directo a una cuenta |
| 🤝 **Préstamos y deudas** | Lo que prestaste y lo que debes, con cuotas, intereses, pagos parciales y alertas de vencimiento |
| 📋 **Presupuestos** | Límites por categoría con alertas al acercarte o pasarte |
| 📊 **Dashboard** | Resumen del mes, gasto real vs ahorro, tasa de ahorro, patrimonio y evolución mensual |
| 💡 **Insights** | Proyección de fin de mes, disponible por día, gastos inusuales y rachas |
| 📈 **Predicciones** | Proyección de ingresos y gastos de los próximos meses |
| 💳 **Score crediticio** | Seguimiento de tu score a lo largo del tiempo |
| 🔔 **Pagos recurrentes** | Pagos obligatorios con recordatorios en la app, push y Telegram |
| 🤖 **Asistente IA** | Consulta tus finanzas en lenguaje natural (Gemini) |

---

## 🎯 Objetivos vinculados a cuentas

Un objetivo puede tomar dinero de una o varias cuentas, de dos formas:

- **Toda la cuenta**: el saldo completo cuenta para el objetivo. Cada vez que depositas, el objetivo avanza solo.
- **Monto fijo**: reservas solo una parte (*"de mis ahorros, S/ 500 son para el auto"*).

Ambos modos se combinan en una misma cuenta: primero se cubren los montos fijos y el resto va a los objetivos de "toda la cuenta". Si el saldo no alcanza, lo asignado se reparte en proporción entre los objetivos.

**Monto potencial**: si prestaste dinero desde una cuenta vinculada, el objetivo muestra cuánto tendría si te devolvieran todo, con el detalle de cada préstamo considerado.

---

## 🐷 Ahorro como gasto (que no se toca)

Apartar ahorro se registra como un gasto: sale de tu disponible del mes, porque es dinero que no debes tocar. Pero GodMoney lo trata distinto:

- Si eliges una **cuenta destino**, el monto se suma a su saldo en la misma operación. Si editas o borras el gasto, el saldo se corrige solo (lo hace un trigger en la base de datos).
- Los reportes separan **gasto real** (consumo) de **ahorrado** y muestran tu **tasa de ahorro** del mes.
- Insights, alertas y el asistente IA no lo tratan como consumo: ahorrar más no dispara "gasto inusual" ni la sugerencia de recortar.

---

## 🤖 Asistente Financiero con IA

Un chat con Gemini que responde a partir de **tus propios datos**:

> *"¿Cómo voy este mes?"*
> *"¿En qué puedo recortar?"*
> *"¿Llego a mis objetivos?"*
> *"¿Quién me debe dinero?"*

Conoce los ingresos y el consumo del mes y del mes anterior, tu ahorro, tus presupuestos (gastado vs límite), el avance real de tus objetivos, los saldos de tus cuentas y tus préstamos pendientes.

**Pensado para gastar pocos tokens** (funciona con el plan gratuito de Gemini):
- Contexto financiero en formato compacto, reutilizado entre mensajes y regenerado solo cuando cambian tus datos.
- Solo se envían los últimos turnos de la conversación.
- Pensamiento mínimo y respuestas cortas.

En el celular el chat ocupa toda la pantalla y se ajusta al teclado.

Para activarlo, ingresa tu API key de Gemini (gratis en [Google AI Studio](https://aistudio.google.com/apikey)) en **Ajustes**.

---

## 🔔 Alertas de pagos recurrentes

Pensado para pagos que no son automáticos pero sí obligatorios (seguro de vida, internet, servicios): defines si vencen en un **día fijo del mes** o con **fecha manual**, y GodMoney se encarga del resto.

- **Recordatorios multicanal**: alerta dentro de la app, **notificación push** (funciona como PWA instalada en el celular) y **mensaje de Telegram**, con aviso configurable de días de anticipación.
- **Funciona aunque no abras la app**: un job programado (Supabase Cron) revisa los vencimientos todos los días y dispara los avisos por su cuenta — no depende de que entres a mirar.
- **Marcar como pagado** con un botón, o vinculando directamente el gasto ya registrado.

---

## 🛠️ Stack Tecnológico

<div align="center">

![React](https://img.shields.io/badge/React_+_Vite-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Mantine](https://img.shields.io/badge/Mantine_UI-339AF0?style=flat-square&logo=mantine&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-FF6B35?style=flat-square)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=flat-square&logo=express&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-FF4B4B?style=flat-square)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=flat-square&logo=pwa&logoColor=white)
![Deno Edge Functions](https://img.shields.io/badge/Supabase_Edge_Functions-000000?style=flat-square&logo=deno&logoColor=white)
![Telegram Bot API](https://img.shields.io/badge/Telegram_Bot-26A5E4?style=flat-square&logo=telegram&logoColor=white)

</div>

GodMoney es una **PWA instalable**: funciona offline (cache de assets) y envía notificaciones push reales usando el protocolo Web Push (VAPID), firmadas desde una Edge Function de Supabase — sin backend propio corriendo procesos.

---

## 🚀 Instalación y uso

```bash
# Clona el repositorio
git clone https://github.com/Abelstick/GodMoney.git
cd GodMoney

# Instala dependencias
npm install

# Inicia en modo desarrollo
npm run dev
```

### Variables de entorno

Crea un archivo `.env` en la raíz:

```bash
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<tu-anon-key>
VITE_TELEGRAM_BOT_USERNAME=<usuario-de-tu-bot>   # opcional, para alertas por Telegram
```

La API key de Gemini no va en el `.env`: cada usuario la guarda en **Ajustes**.

### Base de datos (Supabase)

Ejecuta en el SQL Editor de Supabase, **en este orden**:

1. `supabase/schema.sql`: tablas base (categorías, ingresos, gastos, objetivos, presupuestos)
2. `supabase/migrations/002_loans_and_accounts.sql`: cuentas y préstamos
3. `003_goal_account_links.sql`: vínculo objetivos ↔ cuentas
4. `004_delete_loan.sql`: eliminar préstamos revirtiendo sus movimientos
5. `005_credit_score.sql`: score crediticio
6. `006_recurring_payments.sql`: pagos recurrentes y alertas
7. `007_goal_link_modes.sql`: modos "toda la cuenta" / "monto fijo"
8. `008_savings_expenses.sql`: categorías de ahorro y gastos ligados a cuentas

Las Edge Functions (`supabase/functions/`) solo hacen falta para los recordatorios push y por Telegram.

### Producción

```bash
npm run build   # genera dist/
npm start       # sirve dist/ con Express (server.js)
```

---

## 🏗️ Estructura del proyecto

Organizado por **features** para mantener el código limpio y escalable:

```
src/
├── features/            # Una carpeta por módulo (UI + componentes propios)
│   ├── dashboard/
│   ├── income/  expenses/  categories/
│   ├── accounts/  goals/  loans/  budgets/
│   ├── insights/  predictions/  creditScore/
│   ├── recurringPayments/
│   ├── chat/            # Asistente IA
│   └── settings/  auth/
├── services/            # Acceso a Supabase y Gemini
├── store/               # Estado global (Zustand, un slice por dominio)
├── hooks/               # Lógica desacoplada de la UI
├── lib/                 # Cálculos puros (progreso de objetivos, ahorro, préstamos…)
└── components/          # Componentes reutilizables

supabase/
├── schema.sql           # Esquema base
├── migrations/          # Migraciones numeradas (ejecutar en orden)
└── functions/           # Edge Functions (recordatorios, webhook de Telegram)
```

---

## 🗺️ Roadmap

- [x] 🔔 Alertas de pagos recurrentes (push + Telegram)
- [x] 🎯 Objetivos vinculados a cuentas (toda la cuenta / monto fijo)
- [x] 🐷 Ahorro separado del consumo, con tasa de ahorro
- [x] 🔔 Alertas de presupuesto por categoría
- [x] 📄 Exportación de movimientos a Excel (CSV)
- [ ] 🔁 Transferencias entre cuentas
- [ ] 💬 Registrar gastos desde Telegram
- [ ] 📈 Historial de patrimonio neto
- [ ] 📈 Mejorar las predicciones financieras
- [ ] 📄 Reportes en PDF

---

## 👨‍💻 Autor

<div align="center">

**Abel Leonardo Panta Chira**

[![GitHub](https://img.shields.io/badge/GitHub-Abelstick-181717?style=flat-square&logo=github)](https://github.com/Abelstick)

*Proyecto personal en constante crecimiento 🚀*

</div>
