# GodMoney

GodMoney es una aplicación web para gestionar finanzas personales de forma simple pero clara. La idea es tener control real de ingresos, gastos y hábitos financieros sin depender de hojas de cálculo.

---

## Demo

https://godmoney-hxs3.onrender.com/

---

## ¿Qué hace?

* Registrar ingresos y gastos
* Organizar todo por categorías
* Ver un dashboard con gráficos y resumen financiero
* Analizar en qué se está yendo el dinero
* Consultar información usando un asistente (chat)

No intenta ser un sistema contable complejo, sino una herramienta práctica para uso diario.

---

## Asistente financiero

Incluye un asistente que permite hacer consultas como:

* “¿En qué gasté más este mes?”
* “¿Cuánto gasté en comida?”
* “Dame un resumen de mis gastos”

La idea es evitar tener que navegar por toda la interfaz y obtener respuestas rápidas a partir de los datos registrados.

---

## Tecnologías

* React + Vite
* Mantine (UI)
* Zustand (estado)
* Supabase (base de datos y autenticación)
* Express (servidor)
* Recharts (gráficos)

---

## Estructura

El proyecto está organizado por features para mantener el código ordenado y escalable:

* módulos por dominio (transacciones, análisis, etc.)
* hooks separados
* lógica desacoplada de la UI

---

## Módulos principales

* Principal: resumen general
* Transacciones: ingresos y gastos
* Planificación: organización financiera
* Análisis: visualización de datos
* Predicciones: base para proyecciones
* Mantenimiento: categorías
* Configuración

---

## Instalación

```bash
git clone <repo-url>
cd godmoney
npm install
npm run dev
```

---

## Cosas por mejorar

* mejorar las predicciones
* exportación de reportes
* alertas de gasto
* pulir la experiencia de usuario

---

## Notas

Este proyecto nace como una herramienta personal. Está pensado para ser práctico y seguir creciendo poco a poco, incorporando mejoras reales en base al uso.

---

## Autor

Abelstick
