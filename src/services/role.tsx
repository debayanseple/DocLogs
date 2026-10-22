import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useData } from './repository'

type Role = 'Assistant' | 'Surgeon'

interface RoleCtx {
  role: Role
  setRole: (r: Role) => void
  canFinalise: boolean
}

const Ctx = createContext<RoleCtx | null>(null)

/**
 * The role is derived from the signed-in user's membership in the workspace
 * (workspace_members.role), not from a local toggle. It used to be a hardcoded
 * 'Surgeon' for every user, which meant every account could finalise records
 * — including an invited assistant, who had their own unrelated workspace.
 */
export function RoleProvider({ children }: { children: ReactNode }) {
  const { memberRole, isDoctor } = useData()
  const value = useMemo<RoleCtx>(() => {
    const surgeon = isDoctor && memberRole === 'owner'
    return {
      role: surgeon ? 'Surgeon' : 'Assistant',
      setRole: () => {},
      canFinalise: surgeon,
    }
  }, [isDoctor, memberRole])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useRole() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useRole missing')
  return c
}
