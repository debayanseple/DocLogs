import { createContext, useContext, useState, type ReactNode } from 'react'

type Role = 'Assistant' | 'Surgeon'

interface RoleCtx {
  role: Role
  setRole: (r: Role) => void
  canFinalise: boolean
}

const Ctx = createContext<RoleCtx | null>(null)

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>('Surgeon')
  return <Ctx.Provider value={{ role, setRole, canFinalise: role === 'Surgeon' }}>{children}</Ctx.Provider>
}

export function useRole() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useRole missing')
  return c
}
