import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { Home, Tv2, LayoutList, Star, CircleUser, Settings, LogOut } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { Focusable } from './Focusable'
import { FocusableRow } from './FocusableRow'

const NAV_FOCUS_KEY = 'tv-nav'

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

export function TVLayout() {
  const [navFocused, setNavFocused] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { isAdmin, logout } = useAuth()

  // Seed initial focus so arrow keys work immediately on load
  useEffect(() => {
    setFocus(NAV_FOCUS_KEY)
  }, [])

  // Escape/Back key moves focus back to the sidebar
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setFocus(NAV_FOCUS_KEY)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const allItems = isAdmin ? [...navItems, ...adminItems] : navItems

  return (
    <div className="flex h-svh w-full overflow-hidden bg-gray-950">

      {/* Persistent sidebar — collapsed to icons by default, expands when focused */}
      <div
        className={`relative flex-shrink-0 h-full bg-gray-900 border-r border-gray-800 flex flex-col py-8 overflow-hidden transition-all duration-200 ${navFocused ? 'w-64 px-4' : 'w-20 px-3'}`}
        onFocus={() => setNavFocused(true)}
        onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setNavFocused(false) }}
      >
        {navFocused && (
          <div className="mb-8 px-2">
            <p className="text-white font-bold text-2xl whitespace-nowrap">CableJack</p>
          </div>
        )}

        <FocusableRow focusKey={NAV_FOCUS_KEY} className="flex flex-col gap-1 flex-1">
          {allItems.map(item => (
            <Focusable
              key={item.to}
              onEnterPress={() => navigate(item.to)}
              focusClassName="ring-2 ring-violet-400 rounded-xl"
            >
              <button
                onClick={() => navigate(item.to)}
                className={`w-full flex items-center rounded-xl transition-colors outline-none ${
                  navFocused ? 'gap-4 px-3 py-4' : 'justify-center py-4'
                } ${
                  location.pathname === item.to
                    ? 'bg-violet-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <item.icon className="w-6 h-6 flex-shrink-0" />
                {navFocused && <span className="text-lg font-medium whitespace-nowrap">{item.label}</span>}
              </button>
            </Focusable>
          ))}
        </FocusableRow>

        <div className="border-t border-gray-800 pt-4">
          <Focusable onEnterPress={logout} focusClassName="ring-2 ring-violet-400 rounded-xl">
            <button
              onClick={logout}
              className={`w-full flex items-center rounded-xl text-gray-500 hover:bg-gray-800 hover:text-white transition-colors outline-none ${
                navFocused ? 'gap-4 px-3 py-4' : 'justify-center py-4'
              }`}
            >
              <LogOut className="w-6 h-6 flex-shrink-0" />
              {navFocused && <span className="text-lg font-medium whitespace-nowrap">Sign out</span>}
            </button>
          </Focusable>
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <Outlet />
      </div>

    </div>
  )
}
