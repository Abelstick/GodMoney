<div align="center">

# 💰 GodMoney

### Tu finanzas personales, bajo control real

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
| 📥 **Registro de transacciones** | Registra ingresos y gastos rápidamente |
| 🗂️ **Categorías** | Organiza todo por categorías personalizables |
| 📊 **Dashboard** | Visualiza gráficos y resumen financiero |
| 🔍 **Análisis** | Descubre en qué se va tu dinero |
| 🤖 **Asistente IA** | Consulta tus finanzas con lenguaje natural |
| 🔔 **Pagos recurrentes** | Registra pagos obligatorios (seguro, internet, servicios) con vencimiento fijo o manual, y recibe recordatorios automáticos en la app, por notificación push y por Telegram antes de que venzan — incluso sin abrir la app |

---

## 🤖 Asistente Financiero con IA

Incluye un asistente de chat que te permite hacer preguntas como:

> *"¿En qué gasté más este mes?"*
> *"¿Cuánto gasté en comida?"*
> *"Dame un resumen de mis gastos"*

La idea es evitar navegar por toda la interfaz y obtener **respuestas rápidas** a partir de tus propios datos.

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

---

## 🏗️ Estructura del proyecto

El proyecto está organizado por **features** para mantener el código limpio y escalable:

```
src/
├── modules/
│   ├── transactions/    # Ingresos y gastos
│   ├── analysis/        # Visualización de datos
│   ├── planning/        # Organización financiera
│   ├── predictions/     # Proyecciones
│   └── settings/        # Categorías
├── hooks/               # Lógica desacoplada de la UI
└── components/          # Componentes reutilizables
```

---

## 🗺️ Roadmap

- [x] 🔔 Alertas de pagos recurrentes (push + Telegram)
- [ ] 📈 Mejorar las predicciones financieras
- [ ] 📄 Exportación de reportes (PDF / Excel)
- [ ] 🔔 Alertas de gasto por categoría
- [ ] ✨ Pulir la experiencia de usuario

---

## 👨‍💻 Autor

<div align="center">

**Abel Leonardo Panta Chira**

[![GitHub](https://img.shields.io/badge/GitHub-Abelstick-181717?style=flat-square&logo=github)](https://github.com/Abelstick)

*Proyecto personal en constante crecimiento 🚀*

</div>
