'use client'

import { useEffect } from 'react'

/**
 * Que el entrenamiento se pueda seguir sin mirar el móvil (D-089): la pantalla no
 * se apaga mientras dura y, al acabar un descanso, vibra y suena.
 *
 * Todo es lo que el navegador permita: sin Wake Lock, vibración o sonido la app
 * sigue funcionando igual, sin avisar de que falta nada.
 */

let audio: AudioContext | null = null

/** El navegador solo deja sonar si el audio se abrió con un toque del usuario. */
function unlockAudio(): void {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') void audio.resume()
  } catch {
    audio = null
  }
}

/** Mantiene la pantalla encendida mientras `active`, y prepara el sonido del descanso. */
export function useKeepScreenOn(active: boolean): void {
  useEffect(() => {
    if (!active) return
    let lock: WakeLockSentinel | null = null
    let released = false

    const request = async () => {
      if (document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return
      try {
        const next = await navigator.wakeLock.request('screen')
        if (released) void next.release()
        else lock = next
      } catch {
        // Sin permiso o con poca batería: la pantalla se apagará como siempre.
      }
    }
    // El navegador suelta el bloqueo al salir de la app: se pide otra vez al volver.
    const onVisible = () => void request()

    void request()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pointerdown', unlockAudio, { once: true })
    return () => {
      released = true
      void lock?.release().catch(() => {})
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pointerdown', unlockAudio)
    }
  }, [active])
}

/** El aviso de que se acaba el descanso. */
export function alertRestEnding(): void {
  if ('vibrate' in navigator) navigator.vibrate([200, 100, 200])
  if (!audio || audio.state !== 'running') return
  try {
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    const now = audio.currentTime
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
    oscillator.connect(gain).connect(audio.destination)
    oscillator.start(now)
    oscillator.stop(now + 0.25)
  } catch {
    // Sin sonido queda la vibración.
  }
}
