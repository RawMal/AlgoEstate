import { Link, useLocation } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { WalletButton } from '@txnlab/use-wallet-ui-react'
import { Building2, Moon, Sun, Menu, X, User, ChevronDown, BarChart3, Briefcase, LogOut } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { useState, useEffect, useRef } from 'react'
import { supabase, createLogoutHandler } from '../lib/supabase'

export function Header() {
  const { activeAddress, wallets } = useWallet()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false)
      }
    }

    if (userDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userDropdownOpen])

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Properties', href: '/properties' },
  ]

  const isActive = (path: string) => location.pathname === path

  const disconnectWallet = async () => {
    try {
      // Find and disconnect the active wallet
      const activeWallet = wallets.find(wallet => wallet.isConnected)
      if (activeWallet) {
        console.log('Disconnecting wallet:', activeWallet.name)
        console.log('Available methods:', Object.getOwnPropertyNames(activeWallet))
        
        // Try different possible disconnect methods
        if (typeof activeWallet.disconnect === 'function') {
          await activeWallet.disconnect()
        } else if (typeof activeWallet.close === 'function') {
          await activeWallet.close()
        } else if (typeof activeWallet.logout === 'function') {
          await activeWallet.logout()
        } else {
          console.warn('No disconnect method found on wallet')
        }
      } else {
        console.log('No active wallet found to disconnect')
      }
    } catch (error) {
      console.error('Error disconnecting wallet:', error)
    }
  }

  const handleLogout = createLogoutHandler(disconnectWallet)

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-secondary-900/80 backdrop-blur-md border-b border-secondary-200 dark:border-secondary-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="p-2 bg-primary-500 rounded-lg group-hover:bg-primary-600 transition-colors">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-display font-bold text-secondary-900 dark:text-white">
              AlgoEstate
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                    : 'text-secondary-600 dark:text-secondary-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-secondary-50 dark:hover:bg-secondary-800'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-secondary-100 dark:bg-secondary-800 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5 text-secondary-600 dark:text-secondary-300" />
              ) : (
                <Sun className="h-5 w-5 text-secondary-600 dark:text-secondary-300" />
              )}
            </button>
            
            {/* User Dropdown */}
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-800"
                >
                  <User className="h-4 w-4" />
                  <span>{user.email?.split('@')[0]}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-secondary-800 rounded-lg shadow-lg border border-secondary-200 dark:border-secondary-700 py-1 z-50">
                    <Link
                      to="/dashboard"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center px-4 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors"
                    >
                      <BarChart3 className="h-4 w-4 mr-3" />
                      Dashboard
                    </Link>
                    <Link
                      to="/portfolio"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center px-4 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors"
                    >
                      <Briefcase className="h-4 w-4 mr-3" />
                      Portfolio
                    </Link>
                    <hr className="my-1 border-secondary-200 dark:border-secondary-600" />
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false)
                        handleLogout()
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/auth"
                className="flex items-center px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <User className="h-4 w-4 mr-2" />
                Sign In
              </Link>
            )}

            {/* Wallet Button - Only visible when user is signed in */}
            {user && <WalletButton />}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-secondary-100 dark:bg-secondary-800 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5 text-secondary-600 dark:text-secondary-300" />
              ) : (
                <Menu className="h-5 w-5 text-secondary-600 dark:text-secondary-300" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-secondary-200 dark:border-secondary-700">
            <nav className="flex flex-col space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                      : 'text-secondary-600 dark:text-secondary-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-secondary-50 dark:hover:bg-secondary-800'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              
              {/* Mobile User Menu Items - Only show when signed in */}
              {user && (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                      isActive('/dashboard')
                        ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                        : 'text-secondary-600 dark:text-secondary-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-secondary-50 dark:hover:bg-secondary-800'
                    }`}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Dashboard
                  </Link>
                  <Link
                    to="/portfolio"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                      isActive('/portfolio')
                        ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                        : 'text-secondary-600 dark:text-secondary-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-secondary-50 dark:hover:bg-secondary-800'
                    }`}
                  >
                    <Briefcase className="h-4 w-4 mr-2" />
                    Portfolio
                  </Link>
                  
                  <hr className="my-2 border-secondary-200 dark:border-secondary-600" />
                  
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      handleLogout()
                    }}
                    className="px-3 py-2 rounded-md text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center w-full text-left"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </button>
                </>
              )}
              
              {/* Mobile Auth Button - Only show when not signed in */}
              {!user && (
                <Link
                  to="/auth"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center w-fit"
                >
                  <User className="h-4 w-4 mr-2" />
                  Sign In
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}