import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App.tsx'
import { DataProvider } from './services/repository.tsx'
import { RoleProvider } from './services/role.tsx'
import { AuthProvider } from './services/auth.tsx'
import { AuthGate } from './components/AuthGate.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AuthGate>
        <DataProvider>
          <RoleProvider>
            <App />
          </RoleProvider>
        </DataProvider>
      </AuthGate>
    </AuthProvider>
  </StrictMode>,
)
