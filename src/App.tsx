import { SkipToContent } from '@/components/SkipToContent'

function App() {
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

export default App
