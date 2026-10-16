import { lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell }    from '@/layout/AppShell/AppShell'
const Dashboard = lazy(() => import('@/features/dashboard/Dashboard').then((m) => ({ default: m.Dashboard })))
const Income = lazy(() => import('@/features/income/Income').then((m) => ({ default: m.Income })))
const Expenses = lazy(() => import('@/features/expenses/Expenses').then((m) => ({ default: m.Expenses })))
const Goals = lazy(() => import('@/features/goals/Goals').then((m) => ({ default: m.Goals })))
const Budgets = lazy(() => import('@/features/budgets/Budgets').then((m) => ({ default: m.Budgets })))
const Loans = lazy(() => import('@/features/loans/Loans').then((m) => ({ default: m.Loans })))
const RecurringPayments = lazy(() => import('@/features/recurringPayments/RecurringPayments').then((m) => ({ default: m.RecurringPayments })))
const Accounts = lazy(() => import('@/features/accounts/Accounts').then((m) => ({ default: m.Accounts })))
const Predictions = lazy(() => import('@/features/predictions/Predictions').then((m) => ({ default: m.Predictions })))
const Insights = lazy(() => import('@/features/insights/Insights').then((m) => ({ default: m.Insights })))
const CreditScore = lazy(() => import('@/features/creditScore/CreditScore').then((m) => ({ default: m.CreditScore })))
const Categories = lazy(() => import('@/features/categories/Categories').then((m) => ({ default: m.Categories })))
const Settings = lazy(() => import('@/features/settings/Settings').then((m) => ({ default: m.Settings })))
import { LoginPage }   from '@/features/auth/LoginPage'
import { ProtectedRoute } from './ProtectedRoute'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index                   element={<Dashboard />} />
        <Route path="ingresos"         element={<Income />} />
        <Route path="gastos"           element={<Expenses />} />
        <Route path="objetivos"        element={<Goals />} />
        <Route path="presupuestos"     element={<Budgets />} />
        <Route path="prestamos"        element={<Loans />} />
        <Route path="pagos-recurrentes" element={<RecurringPayments />} />
        <Route path="cuentas"          element={<Accounts />} />
        <Route path="predicciones"     element={<Predictions />} />
        <Route path="inteligencia"     element={<Insights />} />
        <Route path="score-crediticio" element={<CreditScore />} />
        <Route path="categorias"       element={<Categories />} />
        <Route path="configuracion"    element={<Settings />} />
        <Route path="*"                element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
