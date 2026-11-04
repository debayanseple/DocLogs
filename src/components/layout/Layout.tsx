import { NavLink, Outlet } from 'react-router-dom'
import { Activity, AlertTriangle, X } from 'lucide-react'
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  User,
} from 'lucide-react'
import { useAuth } from '../../services/auth'
import { useData } from '../../services/repository'

const navItems = [
  { to: '/', label: 'Home', icon: LayoutDashboard },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/follow-ups', label: 'Follow-ups', icon: CalendarCheck },
  { to: '/profile', label: 'Profile', icon: User },
]

export function Layout() {
  const { user, profileName } = useAuth()
  const { saveError, clearSaveError } = useData()

  const wsName = profileName || user?.email?.split('@')[0] || 'Workspace'

  return (
    <div className="min-h-screen">
      {/* Ambient gradient mesh — glass needs colour behind it */}
      <div className="app-bg" aria-hidden="true" />

      {/* Save failures are surfaced here — writes are optimistic, so without
          this a failed save is indistinguishable from a successful one. */}
      {saveError && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-md" role="alert">
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/95 backdrop-blur-md px-3.5 py-3 shadow-lg">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 flex-1">{saveError}</p>
            <button
              type="button"
              onClick={clearSaveError}
              aria-label="Dismiss"
              className="p-1 rounded-lg hover:bg-red-100 text-red-500 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 glass-dark flex-col z-40 rounded-r-3xl">
        <SidebarBrand />
        <SidebarNav />
        <SidebarFooter
          name={wsName}
          sub="Private workspace"
        />
      </aside>

      {/* Main column */}
      <div className="lg:pl-64 flex flex-col min-h-screen">

        <main className="flex-1 p-3 sm:p-4 lg:p-6 pb-24 lg:pb-6">
          <Outlet />
        </main>

        <footer className="hidden lg:block px-6 py-4 text-xs text-slate-500">
          ClinicaLog OMFS — Private workspace. Your data stays private to your account.
        </footer>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 glass-strong rounded-t-3xl border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 py-1.5 min-h-[50px] text-[10px] font-medium transition-colors ${
                  isActive
                    ? 'text-[#162a4d]'
                    : 'text-slate-500 active:text-slate-700'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex items-center justify-center w-8 h-6 rounded-lg transition-all ${
                      isActive
                        ? 'bg-[#162a4d] text-white shadow-[0_6px_14px_-6px_rgba(22,42,77,0.6)]'
                        : 'text-slate-500'
                    }`}
                  >
                    <item.icon
                      className="w-[18px] h-[18px]"
                      strokeWidth={isActive ? 2.2 : 2}
                    />
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

function SidebarBrand() {
  return (
    <div className="px-5 py-5 flex items-center gap-3 border-b border-white/10 text-white">
      <div className="w-9 h-9 rounded-xl bg-teal-300 flex items-center justify-center shrink-0 shadow-sm shadow-black/10">
        <Activity className="w-5 h-5 text-[#0f1e3a]" />
      </div>
      <div className="min-w-0">
        <div className="font-bold text-[15px] leading-none">ClinicaLog</div>
        <div className="text-[11px] tracking-[0.12em] text-white/75 font-semibold">
          OMFS
        </div>
      </div>
    </div>
  )
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="px-3 py-3 flex-1 overflow-y-auto">
      <div className="text-[11px] font-semibold tracking-widest text-white/40 px-3 mb-2">
        WORKSPACE
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
                isActive
                  ? 'bg-white/90 text-[#0f1e3a] shadow-[0_6px_16px_-8px_rgba(0,0,0,0.5)]'
                  : 'text-white/70 hover:bg-white/10 active:bg-white/20'
              }`
            }
          >
            <item.icon className="w-[18px] h-[18px] shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function SidebarFooter({ name, sub }: { name: string; sub: string }) {
  return (
    <div className="p-4 border-t border-white/10">
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
        <div className="text-xs font-medium text-white truncate">{name} Workspace</div>
        <div className="text-xs text-white/60 mt-1">{sub}</div>
      </div>
    </div>
  )
}
