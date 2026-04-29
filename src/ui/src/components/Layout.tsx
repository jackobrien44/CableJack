import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const navItems = [
  { to: '/', label: 'Channels', icon: '📺' },
  { to: '/guide', label: 'TV Guide', icon: '📋' },
  { to: '/favorites', label: 'Favorites', icon: '⭐' },
  { to: '/history', label: 'History', icon: '🕐' },
  { to: '/profile', label: 'Profile', icon: '👤' },
]

const adminItems = [
  { to: '/admin', label: 'Admin', icon: '⚙️' },
]

export default function Layout() {
  const { user, logout, isAdmin } = useAuth()

  return (
    <div className="flex min-h-svh">
      <aside className="hidden md:flex md:flex-col w-56 bg-gray-900 border-r border-gray-800 shrink-0">
        <div className="px-5 py-5 border-b border-gray-800">
          <span className="text-white font-semibold text-lg">CableJack</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-violet-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          {isAdmin && (
            <div className="pt-3 mt-3 border-t border-gray-800 space-y-1">
              {adminItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-violet-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`
                  }
                >
                  <span>{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}
        </nav>

        <div className="px-4 py-4 border-t border-gray-800">
          <p className="text-gray-500 text-xs mb-2 truncate">{user?.username}</p>
          <button
            onClick={logout}
            className="text-xs text-gray-500 hover:text-red-400 transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        <Outlet />
      </main>

      {/* Bottom tab bar — mobile only */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-gray-900 border-t border-gray-800 flex">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs transition-colors ${
                isActive ? 'text-violet-400' : 'text-gray-500'
              }`
            }
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
        {isAdmin && adminItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs transition-colors ${
                isActive ? 'text-violet-400' : 'text-gray-500'
              }`
            }
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
