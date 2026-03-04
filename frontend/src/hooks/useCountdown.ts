import { useState, useEffect } from 'react'

export function useCountdown(deadline: number) {
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, deadline - Date.now()))

  useEffect(() => {
    if (timeLeft <= 0) return

    const interval = setInterval(() => {
      const remaining = Math.max(0, deadline - Date.now())
      setTimeLeft(remaining)
      if (remaining <= 0) clearInterval(interval)
    }, 1000)

    return () => clearInterval(interval)
  }, [deadline, timeLeft <= 0])

  if (timeLeft <= 0) return { formatted: 'EXPIRED', isUrgent: false, totalSeconds: 0 }

  const totalSeconds = Math.floor(timeLeft / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const pad = (n: number) => n.toString().padStart(2, '0')

  let formatted: string
  if (days > 0) {
    formatted = `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  } else {
    formatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  }

  return { formatted, isUrgent: totalSeconds < 10, totalSeconds }
}
