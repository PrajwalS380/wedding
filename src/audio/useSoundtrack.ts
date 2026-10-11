import { useContext } from 'react'
import { SoundtrackContext, type SoundtrackValue } from './context'

export function useSoundtrack(): SoundtrackValue {
  const value = useContext(SoundtrackContext)
  if (!value) throw new Error('useSoundtrack must be used inside <SoundtrackProvider>')
  return value
}
