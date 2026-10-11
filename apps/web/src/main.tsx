import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'

// Separate chunks: the page a client opens from the link never downloads the
// dashboard or its charting library.
const App = lazy(() => import('./App.tsx'))
const SubmitPage = lazy(() => import('./SubmitPage.tsx'))

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 10_000, retry: 2 } },
})

/* Two pages, so no router: the public collection link is
   <base>/s/<workspace>/<space>, everything else is the dashboard. */
const path = window.location.pathname.slice(import.meta.env.BASE_URL.length)
const collect = /^s\/([^/]+)\/([^/]+)\/?$/.exec(path)

const root = document.getElementById('root')
if (!root) throw new Error('#root missing from index.html')

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>
        {collect?.[1] && collect[2] ? <SubmitPage ws={collect[1]} space={collect[2]} /> : <App />}
      </Suspense>
    </QueryClientProvider>
  </StrictMode>,
)
