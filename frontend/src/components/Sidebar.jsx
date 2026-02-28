import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  {
    group: 'General',
    items: [
      { to: '/', label: 'Dashboard', icon: '\u{1F4CA}' },
    ],
  },
  {
    group: 'Financial',
    items: [
      { to: '/loans', label: 'Loans', icon: '\u{1F3E0}' },
      { to: '/credit-cards', label: 'Credit Cards', icon: '\u{1F4B3}' },
      { to: '/strategy', label: 'Debt Strategy', icon: '\u{1F3AF}' },
    ],
  },
  {
    group: 'Household',
    items: [
      { to: '/bills', label: 'Utilities', icon: '\u{1F4A1}' },
      { to: '/insurance', label: 'Insurance', icon: '\u{1F6E1}\uFE0F' },
      { to: '/maintenance', label: 'Maintenance', icon: '\u{1F527}' },
    ],
  },
  {
    group: 'Tools',
    items: [
      { to: '/documents', label: 'Documents', icon: '\u{1F4C4}' },
      { to: '/calendar', label: 'Calendar', icon: '\u{1F4C5}' },
    ],
  },
  {
    group: 'Account',
    items: [
      { to: '/settings', label: 'Settings', icon: '\u2699\uFE0F' },
    ],
  },
];

export default function Sidebar({ isOpen, onClose }) {
  const { username, logout } = useAuth();

  return (
    <aside
      className={`
        fixed top-0 left-0 z-50 h-full w-60
        bg-sidebar-bg text-sidebar-text
        flex flex-col
        transition-transform duration-200
        lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      {/* Logo */}
      <div className="p-5 pb-3">
        <h1 className="font-serif text-xl font-bold tracking-wide">
          <span className="mr-2">{'\u{1F4B0}'}</span>PayoffIQ
        </h1>
        {username && (
          <p className="text-xs mt-1 opacity-60">Logged in as {username}</p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {navItems.map(group => (
          <div key={group.group} className="mb-4">
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-40 px-3 mb-1.5">
              {group.group}
            </div>
            {group.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-gold/20 text-gold font-semibold border-l-2 border-gold'
                      : 'hover:bg-white/5 opacity-75 hover:opacity-100'
                  }`
                }
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 space-y-2">
        <a
          href="https://github.com/JonGaydos/payoffiq"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs opacity-50 hover:opacity-80 transition-opacity"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          GitHub
        </a>
        <button
          onClick={logout}
          className="w-full text-left text-xs opacity-50 hover:opacity-80 transition-opacity"
        >
          {'\u{1F6AA}'} Log out
        </button>
      </div>
    </aside>
  );
}
