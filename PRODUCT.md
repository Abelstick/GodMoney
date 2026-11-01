# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Uso personal: el propio autor (dev solo, hispanohablante, Perú) registra a diario gastos e ingresos desde el celular con la PWA instalada, y revisa el estado de sus finanzas de forma ocasional en escritorio.

## Product Purpose
GodMoney es una herramienta práctica de finanzas personales para uso diario, sin hojas de cálculo: ingresos, gastos, categorías, cuentas, objetivos de ahorro, préstamos y deudas, presupuestos, pagos recurrentes, score crediticio, predicciones, insights y asistente IA. Éxito = registrar un movimiento en segundos y entender de un vistazo cuánto queda disponible este mes.

## Operating Context
- Registro rápido en móvil (quick-add sheet, FAB, atajos del manifest), muchas veces con una sola mano.
- Modo offline: los altas de gastos/ingresos se encolan y sincronizan al volver la conexión.
- Notificaciones push y Telegram para pagos recurrentes y alertas de presupuesto.
- Exportación CSV y reporte imprimible (Guardar como PDF) desde Movimientos.

## Capabilities and Constraints
- Stack existente: React 18, Vite 5, Mantine 7, CSS Modules, Recharts, Zustand, Supabase, vite-plugin-pwa (injectManifest, `src/sw.js`). Framer Motion autorizado para motion.
- Moneda y formato es-PE. Infra gratuita (Render, Supabase free tier).
- No se alteran cálculos financieros, reglas de negocio, esquema de BD, contratos de API ni autenticación.
- No cachear datos financieros en el service worker.

## Brand Commitments
- Nombre GodMoney y su logo (LogoMark). La identidad índigo existente se evoluciona, no se reemplaza (decisión del usuario, 2026-10-31).

## Evidence on Hand
Datos reales del usuario en Supabase. No hay testimonios, métricas ni capturas de marketing; no inventarlos.

## Product Principles
1. Registrar primero: la acción de añadir un movimiento está siempre a un toque.
2. Lo disponible manda: el saldo del periodo es el dato con más peso en cada vista.
3. Calma y confianza: cifras legibles y estables, color semántico con apoyo textual, sin ruido decorativo.
4. Móvil nativo: diseñado para el pulgar y la PWA instalada, escritorio aprovecha el espacio sin cambiar el modelo mental.

## Accessibility & Inclusion
Objetivo WCAG 2.2 AA en ambos temas: contraste, teclado, foco gestionado en modales, objetivos táctiles de 44px, prefers-reduced-motion, zoom 200%.
