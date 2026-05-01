import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell }    from '@/layout/AppShell/AppShell'
import { Dashboard }   from '@/features/dashboard/Dashboard'
import { Income }      from '@/features/income/Income'
import { Expenses }    from '@/features/expenses/Expenses'
import { Goals }       from '@/features/goals/Goals'
import { Budgets }     from '@/features/budgets/Budgets'
import { Predictions } from '@/features/predictions/Predictions'
import { Categories }  from '@/features/categories/Categories'
import { Settings }    from '@/features/settings/Settings'
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
        <Route path="predicciones"     element={<Predictions />} />
        <Route path="categorias"       element={<Categories />} />
        <Route path="configuracion"    element={<Settings />} />
        <Route path="*"                element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
