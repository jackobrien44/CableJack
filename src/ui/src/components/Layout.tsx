import { NavLink, Outlet } from 'react-router-dom'
import { Home, Tv2, LayoutList, Star, CircleUser, Settings, LogOut } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useBilling } from '../hooks/useBilling'
import { usePlatform } from '../hooks/usePlatform'
import { TVLayout } from './tv'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { to: '/',          label: 'Home',      icon: Home },
  { to: '/channels',  label: 'Channels',  icon: Tv2 },
  { to: '/guide',     label: 'TV Guide',  icon: LayoutList },
  { to: '/favorites', label: 'Favorites', icon: Star },
  { to: '/profile',   label: 'Profile',   icon: CircleUser },
]

const adminItems: NavItem[] = [
  { to: '/admin', label: 'Admin', icon: Settings },
]

interface NavLinkItemProps {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

function SidebarLink({ to, label, icon: Icon, end }: NavLinkItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive
            ? 'bg-violet-600 text-white'
            : 'text-gray-400 hover:text-white hover:bg-gray-800'
        }`
      }
    >
      <Icon className="w-4 h-4 shrink-0" />
      {label}
    </NavLink>
  )
}

function TabLink({ to, label, icon: Icon, end }: NavLinkItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs transition-colors ${
          isActive ? 'text-violet-400' : 'text-gray-500'
        }`
      }
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </NavLink>
  )
}

function SubscriptionBanner() {
  const { access, canWatch, startCheckout } = useBilling()

  if (canWatch || !access?.enforcementActive) return null

  const isTrialExpired = access.isOnTrial && !access.hasAccess
  const message = isTrialExpired
    ? 'Your trial has expired.'
    : 'Your subscription is inactive.'

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
      <p className="text-amber-300 text-sm">{message} Subscribe to continue watching.</p>
      <button
        onClick={startCheckout}
        className="shrink-0 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold rounded-md transition-colors"
      >
        Subscribe
      </button>
    </div>
  )
}

export default function Layout() {
  const { isTV } = usePlatform()
  const { user, logout, isAdmin } = useAuth()

  if (isTV) return <TVLayout />

  return (
    <div className="flex h-svh">
      <aside className="hidden md:flex md:flex-col w-56 bg-gray-900 border-r border-gray-800 shrink-0">
        <div className="px-5 py-5 border-b border-gray-800 flex items-center justify-center">
          <span className="text-white font-semibold text-2xl">CableJack</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => (
            <SidebarLink
              key={item.to}
              to={item.to}
              label={item.label}
              icon={item.icon}
              end={item.to === '/' || item.to === '/channels'}
            />
          ))}

          {isAdmin && (
            <div className="pt-3 mt-3 border-t border-gray-800 space-y-1">
              {adminItems.map(item => (
                <SidebarLink key={item.to} to={item.to} label={item.label} icon={item.icon} />
              ))}
            </div>
          )}
        </nav>

        {import.meta.env.VITE_APP_VERSION && (
          <div className="px-4 pb-2">
            <p className="text-gray-700 text-xs">{import.meta.env.VITE_APP_VERSION}</p>
          </div>
        )}

        <div className="px-4 py-4 border-t border-gray-800 flex items-center justify-between gap-2">
          <p className="text-gray-300 text-sm font-medium truncate">{user?.username}</p>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 hover:bg-gray-800 px-3 py-1.5 rounded-lg transition-colors shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-h-0 flex flex-col overflow-hidden pb-16 md:pb-0">
        <SubscriptionBanner />
        <Outlet />
      </main>

      {/* Bottom tab bar — mobile only */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-gray-900 border-t border-gray-800 flex">
        {navItems.map(item => (
          <TabLink
            key={item.to}
            to={item.to}
            label={item.label}
            icon={item.icon}
            end={item.to === '/' || item.to === '/channels'}
          />
        ))}
        {isAdmin && adminItems.map(item => (
          <TabLink key={item.to} to={item.to} label={item.label} icon={item.icon} />
        ))}
      </nav>
    </div>
  )
}
