import '@fontsource/poppins/400.css'
import '@fontsource/poppins/500.css'
import '@fontsource/poppins/600.css'
import '@fontsource/poppins/700.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Wire axe-core in dev to surface accessibility violations in the console.
// Loaded dynamically so it is never included in production bundles.
if (import.meta.env.DEV) {
  Promise.all([import('react'), import('react-dom'), import('@axe-core/react')]).then(
    ([React, ReactDOM, { default: axe }]) => {
      axe(React, ReactDOM, 1000)
    }
  )
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
)
