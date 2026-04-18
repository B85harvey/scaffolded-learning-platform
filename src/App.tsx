import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { SkipToContent } from '@/components/SkipToContent'
import { AdminRoute } from '@/components/auth/AdminRoute'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AuthProvider } from '@/contexts/AuthContext'
import { Callback } from '@/pages/auth/Callback'
import { SignIn } from '@/pages/auth/SignIn'
import { StudentHome } from '@/pages/StudentHome'
import { UnitView } from '@/pages/UnitView'
import { WelcomeScreen } from '@/pages/WelcomeScreen'
import { AdminClassForm } from '@/pages/admin/AdminClassForm'
import { AdminGroupForm } from '@/pages/admin/AdminGroupForm'
import { AdminUnitManager } from '@/pages/admin/AdminUnitManager'
import { LessonPage } from '@/pages/lesson/LessonPage'
import { SessionSummary } from '@/pages/SessionSummary'
import { ScaffoldPlayground } from '@/routes/_playground/scaffold'
import { ConnectionBanner } from '@/components/ui/ConnectionBanner'
import { TeacherLayout } from '@/components/teacher/TeacherLayout'
import { TeacherLessonsPage } from '@/pages/teacher/TeacherLessonsPage'
import { LessonEditor } from '@/pages/teacher/LessonEditor'
import { NewLessonPage } from '@/pages/teacher/NewLessonPage'
import { LiveWall } from '@/pages/teacher/LiveWall'
import { TeacherDashboard } from '@/pages/teacher/TeacherDashboard'
import { useReducedMotion } from '@/hooks/useReducedMotion'

function App() {
  // Sets data-reduced-motion on <html> so CSS variables and selectors can gate
  // animation durations without per-component checks.
  useReducedMotion()

  return (
    <BrowserRouter>
      <AuthProvider>
        <ConnectionBanner />
        <Routes>
          {/* Public */}
          <Route path="/auth/signin" element={<SignIn />} />
          <Route path="/auth/callback" element={<Callback />} />

          {/* Student */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <StudentHome />
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
            path="/unit/:unitId"
            element={
              <ProtectedRoute>
                <UnitView />
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
          <Route
            path="/session/:lessonId/:studentId"
            element={
              <ProtectedRoute>
                <SessionSummary />
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
          <Route
            path="/admin/units"
            element={
              <AdminRoute>
                <AdminUnitManager />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/groups/:lessonId"
            element={
              <AdminRoute>
                <AdminGroupForm />
              </AdminRoute>
            }
          />
          <Route path="/admin/groups" element={<Navigate to="/teacher/lessons" replace />} />

          {/* Teacher */}
          <Route
            path="/teacher/lessons"
            element={
              <TeacherLayout>
                <TeacherLessonsPage />
              </TeacherLayout>
            }
          />
          <Route path="/teacher/lessons/new" element={<NewLessonPage />} />
          <Route path="/teacher/lessons/:lessonId/edit" element={<LessonEditor />} />
          <Route path="/teacher/livewall/:lessonId" element={<LiveWall />} />
          <Route path="/teacher/dashboard/:lessonId" element={<TeacherDashboard />} />
          {/* Legacy links without a lessonId land back on the library so
              teachers can pick which lesson's dashboard or live wall to open. */}
          <Route path="/teacher/dashboard" element={<Navigate to="/teacher/lessons" replace />} />
          <Route path="/teacher/live-wall" element={<Navigate to="/teacher/lessons" replace />} />
          <Route path="/teacher/livewall" element={<Navigate to="/teacher/lessons" replace />} />

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

          {/* Root → /home */}
          <Route path="/" element={<Navigate to="/home" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
