import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Navbar } from '@/components/Navbar'
import { ToastProvider } from '@/components/Toast'
import { WalletProvider } from '@/context/WalletContext'
import { Home } from '@/pages/Home'
import { MarketDetail } from '@/pages/MarketDetail'
import { MyBets } from '@/pages/MyBets'
import { initialUserBets, type UserBet } from '@/data/markets'

function App() {
  const [bets, setBets] = useState<UserBet[]>(initialUserBets)

  const handlePlaceBet = (bet: UserBet) => {
    setBets(prev => [bet, ...prev])
  }

  return (
    <BrowserRouter>
      <WalletProvider>
        <ToastProvider>
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/market/:id" element={<MarketDetail onPlaceBet={handlePlaceBet} />} />
            <Route path="/bets" element={<MyBets bets={bets} />} />
          </Routes>
        </ToastProvider>
      </WalletProvider>
    </BrowserRouter>
  )
}

export default App
