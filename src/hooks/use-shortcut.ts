import { useEffect } from 'react'

export const clamp = (val: number, [min, max]: [number, number]) => 
  Math.min(Math.max(val, min), max)

export function useShortcuts(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (shortcuts[e.key]) {
        shortcuts[e.key]()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}