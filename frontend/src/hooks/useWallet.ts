import { useState, useCallback } from 'react'

const FAKE_ADDRESS = '0x7a3F8b2C1d4E5f6A9B0c3D8E7F2a1B4C5d6E9b2F'

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null)

  const connect = useCallback(() => {
    setAddress(FAKE_ADDRESS)
  }, [])

  const disconnect = useCallback(() => {
    setAddress(null)
  }, [])

  const truncated = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null

  return { address, truncated, connect, disconnect, isConnected: !!address }
}
