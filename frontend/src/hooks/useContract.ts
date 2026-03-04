import { useState, useEffect, useCallback } from 'react'
import { Contract, parseEther, formatEther, JsonRpcProvider } from 'ethers'
import { useWallet } from '@/context/WalletContext'
import {
  PREDICTION_MARKET_ADDRESS,
  PREDICTION_MARKET_ABI,
  TENDERLY_RPC,
} from '@/config/contract'

// Read-only provider for view calls (works without wallet)
const readProvider = new JsonRpcProvider(TENDERLY_RPC)
const readContract = new Contract(PREDICTION_MARKET_ADDRESS, PREDICTION_MARKET_ABI, readProvider)

export interface RoundInfo {
  resolved: boolean
  bettingClosed: boolean
  winningChoice: number
  totalPool: string
  choicePools: string[]
  currentRound: number
}

export interface MyBet {
  choice: number
  amount: string
  claimed: boolean
  exists: boolean
}

export interface PastRound {
  roundNum: number
  resolved: boolean
  winningChoice: number
  totalPool: string
  choicePools: string[]
  myBet: MyBet | null
}

export function useContract() {
  const { signer } = useWallet()

  const getWriteContract = useCallback(() => {
    if (!signer) throw new Error('Wallet not connected')
    return new Contract(PREDICTION_MARKET_ADDRESS, PREDICTION_MARKET_ABI, signer)
  }, [signer])

  const placeBet = useCallback(async (marketId: string, choice: number, amountEth: string) => {
    const contract = getWriteContract()
    const tx = await contract.placeBet(marketId, choice, { value: parseEther(amountEth) })
    const receipt = await tx.wait()
    return receipt
  }, [getWriteContract])

  const claimWinnings = useCallback(async (marketId: string, roundNum: number) => {
    const contract = getWriteContract()
    const tx = await contract.claimWinnings(marketId, roundNum)
    const receipt = await tx.wait()
    return receipt
  }, [getWriteContract])

  return { placeBet, claimWinnings }
}

// Separate hook for reading round info (no wallet needed)
export function useRoundInfo(marketId: string) {
  const [roundInfo, setRoundInfo] = useState<RoundInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const currentRound = await readContract.getCurrentRound(marketId)
      const roundNum = Number(currentRound)
      const [resolved, bettingClosed, winningChoice, totalPool, choicePools] =
        await readContract.getRoundInfo(marketId, roundNum)

      setRoundInfo({
        resolved,
        bettingClosed,
        winningChoice: Number(winningChoice),
        totalPool: formatEther(totalPool),
        choicePools: choicePools.map((p: bigint) => formatEther(p)),
        currentRound: roundNum,
      })
    } catch {
      // Contract might not be reachable
      setRoundInfo(null)
    } finally {
      setLoading(false)
    }
  }, [marketId])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 10_000) // poll every 10s
    return () => clearInterval(interval)
  }, [refresh])

  return { roundInfo, loading, refresh }
}

export function useMyBet(marketId: string, roundNum: number | null) {
  const { address } = useWallet()
  const [myBet, setMyBet] = useState<MyBet | null>(null)

  const refresh = useCallback(async () => {
    if (!address || roundNum === null) return
    try {
      const [choice, amount, claimed, exists] = await readContract.getMyBet(marketId, roundNum, address)
      setMyBet({
        choice: Number(choice),
        amount: formatEther(amount),
        claimed,
        exists,
      })
    } catch {
      setMyBet(null)
    }
  }, [marketId, roundNum, address])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { myBet, refresh }
}

// Fetch past resolved rounds (scans backwards from currentRound - 1)
export function usePastRounds(marketId: string, currentRound: number | null) {
  const { address } = useWallet()
  const [pastRounds, setPastRounds] = useState<PastRound[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (currentRound === null || currentRound <= 1) {
      setPastRounds([])
      setLoading(false)
      return
    }

    const rounds: PastRound[] = []
    // Scan last 10 rounds (or fewer if early)
    const start = Math.max(1, currentRound - 10)

    for (let r = currentRound - 1; r >= start; r--) {
      try {
        const [resolved, , winningChoice, totalPool, choicePools] =
          await readContract.getRoundInfo(marketId, r)

        let myBet: MyBet | null = null
        if (address) {
          const [choice, amount, claimed, exists] = await readContract.getMyBet(marketId, r, address)
          if (exists) {
            myBet = { choice: Number(choice), amount: formatEther(amount), claimed, exists }
          }
        }

        rounds.push({
          roundNum: r,
          resolved,
          winningChoice: Number(winningChoice),
          totalPool: formatEther(totalPool),
          choicePools: choicePools.map((p: bigint) => formatEther(p)),
          myBet,
        })
      } catch {
        // Round might not exist
      }
    }

    setPastRounds(rounds)
    setLoading(false)
  }, [marketId, currentRound, address])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 15_000)
    return () => clearInterval(interval)
  }, [refresh])

  return { pastRounds, loading, refresh }
}
