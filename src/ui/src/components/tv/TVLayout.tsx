import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useAuth } from '../../hooks/useAuth'
import { Focusable } from './Focusable'
import { FocusableRow } from './FocusableRow'

const NAV_FOCUS_KEY = 'tv-nav'

const navItems = [
  { to: '/',          label: 'Home',     icon: '⌂' },
  { to: '/channels',  label: 'Channels', icon: '▶' },
  { to: '/guide',     label: 'TV Guide', icon: '≡' },
  { to: '/favorites', label: 'Favorites', icon: '★' },
  { to: '/profile',  label: 'Profile',  icon: '◉' },
]

const adminItems = [
  { to: '/admin', label: 'Admin', icon: '⚙' },
]

export function TVLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { isAdmin, logout } = useAuth()

  function navTo(to: string) {
    setMenuOpen(false)
    navigate(to)
  }

  // Focus the nav panel whenever it opens (external system call, not setState)
  useEffect(() => {
    if (menuOpen) requestAnimationFrame(() => setFocus(NAV_FOCUS_KEY))
  }, [menuOpen])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setMenuOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const allItems = isAdmin ? [...navItems, ...adminItems] : navItems

  return (
    <div className="relative h-svh w-full overflow-hidden bg-gray-950">
      <Outlet />

      {menuOpen && (
        <div className="absolute inset-0 z-50 flex">
          {/* Nav panel */}
          <div className="w-80 h-full bg-gray-900/98 border-r border-gray-800 flex flex-col py-10 px-6 gap-2">
            <p className="text-white font-bold text-4xl mb-8 px-2">CableJack</p>

            <FocusableRow focusKey={NAV_FOCUS_KEY} className="flex flex-col gap-1">
              {allItems.map(item => (
                <Focusable
                  key={item.to}
                  onEnterPress={() => navTo(item.to)}
                  focusClassName="ring-2 ring-violet-400 rounded-xl"
                >
                  <button
                    onClick={() => navTo(item.to)}
                    className={`w-full flex items-center gap-5 px-4 py-4 rounded-xl text-left transition-colors ${
                      location.pathname === item.to
                        ? 'bg-violet-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    <span className="text-2xl w-8 text-center">{item.icon}</span>
                    <span className="text-xl font-medium">{item.label}</span>
                  </button>
                </Focusable>
              ))}
            </FocusableRow>

            <div className="mt-auto pt-4 border-t border-gray-800">
              <Focusable onEnterPress={logout} focusClassName="ring-2 ring-violet-400 rounded-xl">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-5 px-4 py-4 rounded-xl text-gray-500 hover:bg-gray-800 hover:text-white transition-colors text-left"
                >
                  <span className="text-2xl w-8 text-center">↩</span>
                  <span className="text-xl font-medium">Sign out</span>
                </button>
              </Focusable>
            </div>
          </div>

          {/* Dimmed backdrop — click or D-pad right to close */}
          <div className="flex-1 bg-black/60" onClick={closeMenu} />
        </div>
      )}
    </div>
  )
}
