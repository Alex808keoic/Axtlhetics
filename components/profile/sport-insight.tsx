'use client'

import { describeSportMuscles, type SportProfile } from '@/lib/domain/axis/knowledge/sport-profiles'

/**
 * Lo que AXIS sabe de un deporte (D-093), en una tarjeta: de qué va, qué
 * carga y qué le conviene trabajar en casa. Para lo que no conoce, lo dice.
 */
export function SportInsight({ sport, name }: { sport: SportProfile | null; name: string }) {
  if (name.trim().length === 0) return null
  if (!sport) {
    return (
      <p className="mt-2 rounded-2xl bg-background px-4 py-3 text-footnote leading-relaxed text-muted-foreground text-pretty">
        No conozco esta actividad. Marca qué músculos trabaja y lo tendré en cuenta.
      </p>
    )
  }
  return (
    <div className="ax-enter mt-2 rounded-2xl bg-background px-4 py-3">
      <p className="text-footnote font-semibold">
        AXIS conoce {sport.name}: carga {describeSportMuscles(sport.muscleGroups)}.
      </p>
      <p className="mt-1 text-footnote leading-relaxed text-muted-foreground text-pretty">{sport.summary}</p>
      <p className="mt-1 text-footnote leading-relaxed text-muted-foreground text-pretty">
        En casa te viene bien: {sport.gymFocus}.
      </p>
    </div>
  )
}
