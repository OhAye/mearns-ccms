import React from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Session } from '@supabase/supabase-js'
import { useAuth } from './hooks/useAuth'
import { Layout } from './components/layout/Layout'
import { ToastProvider } from './components/ui/Toast'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CoachesList from './pages/CoachesList'
import CoachProfile from './pages/CoachProfile'
import CoachEdit from './pages/CoachEdit'
import Register from './pages/Register'
import Invite from './pages/Invite'
import NotFound from './pages/NotFound'

interface ProtectedRouteProps {
  session: Session | null
  loading: boolean
  children: React.ReactNode
}

function ProtectedRoute({ session, loading, children }: ProtectedRouteProps) {
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1B2B4B]" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }
  if (!session) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

export default function App() {
  const { session, loading } = useAuth()

  return (
    <ToastProvider>
      <HashRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register/:token" element={<Register />} />

          {/* Protected routes */}
          <Route
            element={
              <ProtectedRoute session={session} loading={loading}>
                <Layout session={session!} />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/coaches" element={<CoachesList />} />
            <Route path="/coaches/:id" element={<CoachProfile />} />
            <Route path="/coaches/:id/edit" element={<CoachEdit />} />
            <Route path="/invite" element={<Invite />} />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </ToastProvider>
  )
}
