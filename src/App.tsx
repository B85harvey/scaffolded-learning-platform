import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { SkipToContent } from '@/components/SkipToContent'
import { Callback } from '@/pages/auth/Callback'
import { SignIn } from '@/pages/auth/SignIn'
import { LessonPage } from '@/pages/lesson/LessonPage'
import { ScaffoldPlayground } from '@/routes/_playground/scaffold'

function Home() {
  return (
    <>
      <SkipToContent />
      <main id="main" className="flex min-h-screen items-center justify-center">
        <div className="rounded-lg bg-ga-card p-10 shadow-card">
          <h1 className="font-sans text-4xl font-semibold tracking-tight text-ga-text">
            Scaffolded Learning Platform
          </h1>
        </div>
      </main>
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth/signin" element={<SignIn />} />
        <Route path="/auth/callback" element={<Callback />} />
        <Route path="/lesson/:id" element={<LessonPage />} />
        <Route path="/_playground/scaffold" element={<ScaffoldPlayground />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
