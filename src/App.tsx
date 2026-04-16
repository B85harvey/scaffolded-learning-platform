import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { SkipToContent } from '@/components/SkipToContent'
import { AdminRoute } from '@/components/auth/AdminRoute'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AuthProvider } from '@/contexts/AuthContext'
import { Callback } from '@/pages/auth/Callback'
import { SignIn } from '@/pages/auth/SignIn'
import { Home } from '@/pages/Home'
import { WelcomeScreen } from '@/pages/WelcomeScreen'
import { AdminClassForm } from '@/pages/admin/AdminClassForm'
import { LessonPage } from '@/pages/lesson/LessonPage'
import { ScaffoldPlayground } from '@/routes/_playground/scaffold'
import { useReducedMotion } from '@/hooks/useReducedMotion'

function App() {
  // Sets data-reduced-motion on <html> so CSS variables and selectors can gate
  // animation durations without per-component checks.
  useReducedMotion()

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/auth/signin" element={<SignIn />} />
          <Route path="/auth/callback" element={<Callback />} />

          {/* Student */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/welcome"
            element={
              <ProtectedRoute>
                <WelcomeScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lesson/:id"
            element={
              <ProtectedRoute>
                <LessonPage />
              </ProtectedRoute>
            }
          />

          {/* Admin */}
          <Route
            path="/admin/class"
            element={
              <AdminRoute>
                <AdminClassForm />
              </AdminRoute>
            }
          />

          {/* Dev tools */}
          <Route
            path="/_playground/scaffold"
            element={
              <>
                <SkipToContent />
                <ScaffoldPlayground />
              </>
            }
          />

          {/* Root — redirect authenticated users to /home, others to sign-in */}
          <Route path="/" element={<Navigate to="/home" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
