import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Box, 
  Layers, 
  BarChart3, 
  AlertTriangle, 
  Sparkles, 
  Sliders, 
  Database, 
  Settings, 
  Store, 
  User, 
  ShieldCheck, 
  ChevronDown,
  Activity,
  LogOut,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export default function Navbar() {
  const location = useLocation();
  const { user, activeStore, changeStore, availableStores, logout } = useAuth();
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState('checking');

  useEffect(() => {
    api.getHealth()
      .then((res) => {
        if (res.database?.status === 'connected') {
          if (res.database?.is_empty) {
            setDbStatus('empty');
          } else {
            setDbStatus('connected');
          }
        } else {
          setDbStatus('error');
        }
      })
      .catch(() => setDbStatus('error'));
  }, []);

  const isLanding = location.pathname === '/';

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: Layers },
    { name: 'Inventory', path: '/inventory', icon: Box },
    { name: 'Sales Analytics', path: '/sales', icon: BarChart3 },
    { name: 'Alerts & Priorities', path: '/alerts', icon: AlertTriangle },
    { name: 'AI Copilot', path: '/copilot', icon: Sparkles, badge: 'Gemini' },
    { name: 'What-If Simulator', path: '/simulator', icon: Sliders, badge: 'Core' },
    { name: 'Data Management', path: '/data-management', icon: Database },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center text-emerald-400 group-hover:border-emerald-500/50 transition-colors shadow-sm">
                <Box className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-neutral-100 group-hover:text-white flex items-center gap-1.5">
                  StockSense <span className="text-emerald-400 font-mono text-xs px-1.5 py-0.2 rounded bg-emerald-950/60 border border-emerald-800/60">AI</span>
                </span>
                <span className="text-[10px] text-neutral-400 font-mono tracking-wider">PS03 COPILOT</span>
              </div>
            </Link>

            {/* Main Navigation (Desktop) */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                const Icon = link.icon;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isActive 
                        ? 'bg-neutral-800 text-neutral-100 border border-neutral-700 shadow-sm' 
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-neutral-500'}`} />
                    <span>{link.name}</span>
                    {link.badge && (
                      <span className={`text-[9px] font-semibold px-1 py-0.2 rounded ${
                        link.badge === 'Gemini' 
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40' 
                          : 'bg-neutral-800 text-neutral-400'
                      }`}>
                        {link.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            
            {/* Store Switcher */}
            <div className="relative">
              <button
                onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
                className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-xs font-medium text-neutral-300 transition-colors"
              >
                <Store className="w-3.5 h-3.5 text-neutral-400" />
                <span className="truncate max-w-[120px]">{activeStore}</span>
                <ChevronDown className="w-3 h-3 text-neutral-500" />
              </button>

              {storeDropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-48 rounded-xl bg-neutral-900 border border-neutral-800 py-1 shadow-2xl z-50 animate-fadeIn"
                  onMouseLeave={() => setStoreDropdownOpen(false)}
                >
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider border-b border-neutral-800">
                    Switch Store Location
                  </div>
                  {availableStores.map((str) => (
                    <button
                      key={str}
                      onClick={() => {
                        changeStore(str);
                        setStoreDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-neutral-800 transition-colors ${
                        activeStore === str ? 'text-emerald-400 font-semibold bg-neutral-800/50' : 'text-neutral-300'
                      }`}
                    >
                      <span>{str}</span>
                      {activeStore === str && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* DB Health Indicator */}
            <div 
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-[11px] font-mono text-neutral-400"
              title={`Database Connection: ${dbStatus}`}
            >
              <span className={`w-2 h-2 rounded-full ${
                dbStatus === 'connected' ? 'bg-emerald-500' :
                dbStatus === 'empty' ? 'bg-amber-400' : 'bg-rose-500'
              } animate-pulse-subtle`} />
              <span className="hidden md:inline">
                {dbStatus === 'connected' ? 'Connected' :
                 dbStatus === 'empty' ? 'Empty DB' : 'Disconnected'}
              </span>
            </div>

            {/* User / Role Menu */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="inline-flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-xs font-medium text-neutral-200 transition-colors"
              >
                <div className="w-5 h-5 rounded bg-neutral-800 flex items-center justify-center text-neutral-300 font-mono text-[10px] font-bold">
                  {user.name.charAt(0)}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-medium leading-none">{user.name}</span>
                  <span className="text-[10px] text-neutral-400 mt-0.5 leading-none">{user.role}</span>
                </div>
                <ChevronDown className="w-3 h-3 text-neutral-500 hidden sm:inline" />
              </button>

              {userDropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-52 rounded-xl bg-neutral-900 border border-neutral-800 py-1 shadow-2xl z-50 animate-fadeIn"
                  onMouseLeave={() => setUserDropdownOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-neutral-800">
                    <p className="text-xs font-medium text-neutral-200">{user.name}</p>
                    <p className="text-[11px] text-neutral-400 font-mono truncate">{user.email}</p>
                    <span className="inline-block mt-1.5 px-2 py-0.5 rounded bg-neutral-800 text-[10px] font-semibold text-neutral-300 border border-neutral-700">
                      Role: {user.role}
                    </span>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/login"
                      onClick={() => setUserDropdownOpen(false)}
                      className="w-full text-left px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800 flex items-center gap-2 transition-colors"
                    >
                      <User className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Switch Role / Account</span>
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setUserDropdownOpen(false)}
                      className="w-full text-left px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800 flex items-center gap-2 transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Settings & API Keys</span>
                    </Link>
                  </div>

                  <div className="border-t border-neutral-800 py-1">
                    <button
                      onClick={() => {
                        logout();
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:bg-neutral-800 flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Reset Profile</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Launch App Button for Landing */}
            {isLanding && (
              <Link
                to="/dashboard"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-xs shadow-sm transition-all"
              >
                <span>Launch App</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}

          </div>
        </div>
      </div>
    </header>
  );
}
