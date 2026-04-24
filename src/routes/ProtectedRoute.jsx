import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { LoadingSpinner } from '@/components/common/LoadingSpinner/LoadingSpinner'

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <LoadingSpinner />
  if (!user)   return <Navigate to="/login" replace />
  return children
}
