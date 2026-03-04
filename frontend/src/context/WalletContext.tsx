import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { BrowserProvider, type JsonRpcSigner } from 'ethers'
import { TENDERLY_NETWORK, TENDERLY_CHAIN_ID } from '@/config/contract'

interface WalletState {
  address: string | null
  truncated: string | null
  isConnected: boolean
  signer: JsonRpcSigner | null
  provider: BrowserProvider | null
  connect: () => Promise<void>
  disconnect: () => void
}

const WalletContext = createContext<WalletState | null>(null)

async function switchToTenderly() {
  const ethereum = (window as any).ethereum
  if (!ethereum) return

  const chainIdHex = `0x${TENDERLY_CHAIN_ID.toString(16)}`
  try {
    await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainIdHex }] })
  } catch (err: any) {
    // Chain not added yet — add it
    if (err.code === 4902) {
      await ethereum.request({ method: 'wallet_addEthereumChain', params: [TENDERLY_NETWORK] })
    } else {
      throw err
    }
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null)
  const [provider, setProvider] = useState<BrowserProvider | null>(null)

  const connect = useCallback(async () => {
    const ethereum = (window as any).ethereum
    if (!ethereum) {
      alert('MetaMask not found. Please install MetaMask.')
      return
    }

    await switchToTenderly()

    const browserProvider = new BrowserProvider(ethereum)
    const userSigner = await browserProvider.getSigner()
    const userAddress = await userSigner.getAddress()

    setProvider(browserProvider)
    setSigner(userSigner)
    setAddress(userAddress)
  }, [])

  const disconnect = useCallback(() => {
    setAddress(null)
    setSigner(null)
    setProvider(null)
  }, [])

  // Listen for account/chain changes
  useEffect(() => {
    const ethereum = (window as any).ethereum
    if (!ethereum) return

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect()
      } else if (address) {
        // Re-connect with new account
        connect()
      }
    }

    const handleChainChanged = () => {
      if (address) connect()
    }

    ethereum.on('accountsChanged', handleAccountsChanged)
    ethereum.on('chainChanged', handleChainChanged)
    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged)
      ethereum.removeListener('chainChanged', handleChainChanged)
    }
  }, [address, connect, disconnect])

  const truncated = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null

  return (
    <WalletContext.Provider value={{ address, truncated, isConnected: !!address, signer, provider, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
}
