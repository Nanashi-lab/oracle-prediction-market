import { Link, useLocation } from 'react-router-dom'
import { Activity, Wallet, LogOut } from 'lucide-react'
import { useWallet } from '@/context/WalletContext'

export function Navbar() {
  const { isConnected, truncated, connect, disconnect } = useWallet()
  const location = useLocation()

  const navLinks = [
    { to: '/', label: 'Markets' },
    { to: '/bets', label: 'My Bets' },
  ]

  return (
    <nav className="sticky top-0 z-50 border-b border-oracle-border bg-oracle-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <Activity className="h-6 w-6 text-oracle-cyan" />
            <span className="font-mono text-xl font-bold tracking-tight text-oracle-text">
              Oracle
            </span>
          </Link>

          <div className="flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium no-underline transition-colors ${
                  location.pathname === link.to
                    ? 'bg-oracle-surface text-oracle-text'
                    : 'text-oracle-muted hover:text-oracle-text'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {isConnected ? (
          <button
            onClick={disconnect}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-oracle-border bg-oracle-surface px-4 py-2 font-mono text-sm text-oracle-text transition-all hover:border-oracle-cyan"
          >
            <div className="h-2 w-2 rounded-full bg-oracle-green" />
            {truncated}
            <LogOut className="ml-1 h-3.5 w-3.5 text-oracle-muted" />
          </button>
        ) : (
          <button
            onClick={connect}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-oracle-cyan/30 bg-oracle-cyan/10 px-4 py-2 text-sm font-medium text-oracle-cyan transition-all hover:bg-oracle-cyan/20"
          >
            <Wallet className="h-4 w-4" />
            Connect Wallet
          </button>
        )}
      </div>
    </nav>
  )
}
