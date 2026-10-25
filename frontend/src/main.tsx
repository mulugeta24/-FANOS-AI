import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { WorkspaceProvider } from './context/WorkspaceContext'
import { SecOpsAlertProvider } from './context/SecOpsAlertContext'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {/* WorkspaceProvider must be inside BrowserRouter so it can read the URL */}
          <WorkspaceProvider>
            <SecOpsAlertProvider>
              <App />
            </SecOpsAlertProvider>
          </WorkspaceProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
