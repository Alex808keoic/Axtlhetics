/**
 * Lo que AXIS sabe de cada deporte (D-093).
 *
 * Cuando el usuario apunta «Baloncesto», AXIS sabe de qué va: qué músculos
 * carga, si tiene saltos y cambios de dirección, y qué le conviene trabajar en
 * casa para rendir más y lesionarse menos. Son datos, como el catálogo: añadir
 * un deporte es añadir una ficha, sin tocar el motor.
 *
 * Nunca diagnostica ni promete: describe el deporte en general.
 */

import type { MuscleGroup } from '../../workouts/types'
import { MUSCLE_GROUP_LABELS } from '../../workouts/types'
import { listNames } from '../../shared/text'

export type SportProfile = {
  id: string
  /** Cómo se nombra en una frase: «el baloncesto». */
  name: string
  /**
   * Cómo lo escribe la gente, sin tildes ni mayúsculas. Cada término se busca
   * como principio de palabra: «futbol» encuentra «Fútbol sala».
   */
  terms: readonly string[]
  /** Los grupos que carga de forma notable: lo que AXIS evita alrededor del deporte. */
  muscleGroups: readonly MuscleGroup[]
  /** Saltos, sprints o cambios de dirección (D-033): pliometría y equilibrio en el gimnasio. */
  jumps: boolean
  /** De qué va, en una frase. */
  summary: string
  /** Qué conviene trabajar en casa, en una frase. */
  gymFocus: string
  /**
   * Movilidad del catálogo que prepara para este deporte: entra en el
   * calentamiento de las sesiones de fuerza (como mucho una, D-093).
   */
  warmup: readonly string[]
}

export const SPORT_PROFILES: readonly SportProfile[] = [
  {
    id: 'baloncesto',
    name: 'el baloncesto',
    terms: ['baloncesto', 'basquet', 'basket', 'basquetbol'],
    muscleGroups: ['piernas', 'gluteos', 'core'],
    jumps: true,
    summary: 'Saltos, sprints cortos y cambios de dirección constantes: carga sobre todo piernas y glúteos, y el core estabiliza cada aterrizaje.',
    gymFocus: 'fuerza de piernas a una pierna, saltos con buen aterrizaje y tobillos estables',
    warmup: ['tobillo-pared', 'equilibrio-una-pierna'],
  },
  {
    id: 'futbol',
    name: 'el fútbol',
    terms: ['futbol', 'futsal', 'soccer'],
    muscleGroups: ['piernas', 'gluteos', 'core'],
    jumps: true,
    summary: 'Carrera intermitente con sprints, golpeo y cambios de dirección: carga piernas y glúteos, con mucho trabajo de isquios y de cadera.',
    gymFocus: 'isquios fuertes (el nórdico es el clásico), glúteos y estabilidad de rodilla',
    warmup: ['estiramiento-flexor-cadera', 'equilibrio-una-pierna'],
  },
  {
    id: 'voleibol',
    name: 'el voleibol',
    terms: ['voley', 'voleibol', 'volleyball', 'voleyplaya'],
    muscleGroups: ['piernas', 'gluteos', 'hombros'],
    jumps: true,
    summary: 'Saltos repetidos y golpes por encima de la cabeza: carga piernas, glúteos y hombros.',
    gymFocus: 'potencia de piernas, aterrizajes controlados y hombros fuertes y estables',
    warmup: ['angeles-pared', 'tobillo-pared'],
  },
  {
    id: 'balonmano',
    name: 'el balonmano',
    terms: ['balonmano', 'handball'],
    muscleGroups: ['piernas', 'gluteos', 'hombros', 'core'],
    jumps: true,
    summary: 'Sprints, saltos, contacto y lanzamientos: carga piernas, glúteos y hombros, con el core en cada choque.',
    gymFocus: 'fuerza de piernas, hombros estables para lanzar y un core que aguante el contacto',
    warmup: ['angeles-pared', 'equilibrio-una-pierna'],
  },
  {
    id: 'tenis',
    name: 'el tenis',
    terms: ['tenis', 'tennis'],
    muscleGroups: ['piernas', 'hombros', 'core'],
    jumps: true,
    summary: 'Desplazamientos laterales explosivos y golpes con rotación: carga piernas, hombro y core.',
    gymFocus: 'piernas para frenar y arrancar, rotación de tronco y hombro bien protegido',
    warmup: ['rotacion-toracica', 'angeles-pared'],
  },
  {
    id: 'padel',
    name: 'el pádel',
    terms: ['padel'],
    muscleGroups: ['piernas', 'hombros', 'core'],
    jumps: true,
    summary: 'Desplazamientos cortos, frenadas y golpes con rotación: carga piernas, hombro y core.',
    gymFocus: 'piernas para frenar y arrancar, rotación de tronco y hombro bien protegido',
    warmup: ['rotacion-toracica', 'angeles-pared'],
  },
  {
    id: 'natacion',
    name: 'la natación',
    terms: ['natacion', 'nadar', 'piscina', 'swim'],
    muscleGroups: ['espalda', 'hombros', 'core'],
    jumps: false,
    summary: 'Sin impacto y muy de tren superior: carga espalda y hombros, y el core mantiene el cuerpo alineado.',
    gymFocus: 'hombros estables (manguito y escápulas), algo de empuje para equilibrar y piernas, que en el agua trabajan poco',
    warmup: ['angeles-pared', 'rotacion-toracica'],
  },
  {
    id: 'waterpolo',
    name: 'el waterpolo',
    terms: ['waterpolo'],
    muscleGroups: ['espalda', 'hombros', 'piernas', 'core'],
    jumps: false,
    summary: 'Nadar, mantenerse a flote y lanzar con contacto: carga espalda, hombros, piernas y core.',
    gymFocus: 'hombros estables para lanzar y un core fuerte',
    warmup: ['angeles-pared', 'rotacion-toracica'],
  },
  {
    id: 'correr',
    name: 'correr',
    terms: ['correr', 'running', 'carrera', 'atletismo', 'maraton', 'trail', 'footing', 'jogging', 'trote'],
    muscleGroups: ['piernas', 'gluteos'],
    jumps: false,
    summary: 'Miles de impactos repetidos: carga piernas y glúteos, sobre todo gemelos, cuádriceps y cadera.',
    gymFocus: 'fuerza de piernas a una pierna, gemelos y glúteo medio: es lo que más protege de lesiones',
    warmup: ['tobillo-pared', 'estiramiento-flexor-cadera'],
  },
  {
    id: 'ciclismo',
    name: 'el ciclismo',
    terms: ['ciclismo', 'bici', 'bicicleta', 'spinning', 'mtb', 'btt', 'ciclo'],
    muscleGroups: ['piernas', 'gluteos'],
    jumps: false,
    summary: 'Pedaleo continuo sin impacto: carga cuádriceps y glúteos, con la cadera siempre doblada.',
    gymFocus: 'tren superior y core, que la bici no trabaja, y algo de fuerza de piernas para los huesos',
    warmup: ['estiramiento-flexor-cadera', 'estiramiento-isquiotibiales'],
  },
  {
    id: 'escalada',
    name: 'la escalada',
    terms: ['escalada', 'escalar', 'boulder', 'bulder', 'rocodromo'],
    muscleGroups: ['espalda', 'brazos', 'hombros'],
    jumps: false,
    summary: 'Mucho tirón y agarre: carga espalda, brazos (sobre todo antebrazos) y hombros.',
    gymFocus: 'empuje para equilibrar tanto tirón, hombros estables y piernas',
    warmup: ['angeles-pared', 'rotacion-toracica'],
  },
  {
    id: 'lucha',
    name: 'las artes marciales de agarre',
    terms: ['judo', 'jiu', 'bjj', 'grappling', 'lucha', 'sambo'],
    muscleGroups: ['espalda', 'brazos', 'piernas', 'core'],
    jumps: false,
    summary: 'Agarres, tirones y empujes contra un rival: carga espalda, brazos, piernas y core.',
    gymFocus: 'fuerza general, sobre todo tirón y bisagra de cadera, y un cuello y core resistentes',
    warmup: ['gato-camello', 'rotacion-toracica'],
  },
  {
    id: 'boxeo',
    name: 'los deportes de golpeo',
    terms: ['boxeo', 'box', 'kickboxing', 'kick', 'muay', 'mma', 'thai'],
    muscleGroups: ['hombros', 'core', 'piernas'],
    jumps: false,
    summary: 'Golpes que nacen en las piernas y giran en el core: carga hombros, core y piernas.',
    gymFocus: 'potencia de piernas y cadera, rotación de tronco y hombros resistentes',
    warmup: ['rotacion-toracica', 'angeles-pared'],
  },
  {
    id: 'karate',
    name: 'las artes marciales de patada',
    terms: ['karate', 'taekwondo', 'kung', 'capoeira'],
    muscleGroups: ['piernas', 'gluteos', 'core'],
    jumps: false,
    summary: 'Patadas, desplazamientos y equilibrio a una pierna: carga piernas, glúteos y core.',
    gymFocus: 'fuerza a una pierna, cadera móvil y equilibrio',
    warmup: ['estiramiento-flexor-cadera', 'estiramiento-isquiotibiales'],
  },
  {
    id: 'rugby',
    name: 'el rugby',
    terms: ['rugby'],
    muscleGroups: ['piernas', 'gluteos', 'espalda', 'hombros', 'core'],
    jumps: true,
    summary: 'Sprints y choques: carga casi todo el cuerpo, sobre todo piernas, espalda y hombros.',
    gymFocus: 'fuerza general y un core y cuello que aguanten el contacto',
    warmup: ['equilibrio-una-pierna', 'angeles-pared'],
  },
  {
    id: 'remo',
    name: 'el remo',
    terms: ['remo', 'piraguismo', 'kayak', 'canoa'],
    muscleGroups: ['espalda', 'brazos', 'piernas', 'core'],
    jumps: false,
    summary: 'Tirón repetido que empieza en las piernas: carga espalda, brazos, piernas y core.',
    gymFocus: 'empuje para equilibrar el tirón y una espalda baja fuerte',
    warmup: ['gato-camello', 'rotacion-toracica'],
  },
  {
    id: 'gimnasia',
    name: 'la gimnasia',
    terms: ['gimnasia', 'calistenia', 'acrobacia', 'parkour'],
    muscleGroups: ['hombros', 'brazos', 'core', 'espalda'],
    jumps: true,
    summary: 'Tu peso en todas las posiciones: carga hombros, brazos, espalda y core, con saltos y aterrizajes.',
    gymFocus: 'fuerza de piernas y muñecas y hombros bien preparados',
    warmup: ['angeles-pared', 'gato-camello'],
  },
  {
    id: 'baile',
    name: 'el baile',
    terms: ['baile', 'bailar', 'danza', 'ballet', 'zumba', 'salsa', 'hip hop', 'breakdance'],
    muscleGroups: ['piernas', 'gluteos', 'core'],
    jumps: false,
    summary: 'Coordinación, saltos suaves y equilibrio: carga piernas, glúteos y core.',
    gymFocus: 'fuerza de piernas y tobillos estables',
    warmup: ['tobillo-pared', 'equilibrio-una-pierna'],
  },
  {
    id: 'yoga',
    name: 'el yoga o el pilates',
    terms: ['yoga', 'pilates', 'estiramientos'],
    muscleGroups: ['core'],
    jumps: false,
    summary: 'Movilidad, control y core: apenas fatiga los músculos para el entrenamiento.',
    gymFocus: 'carga externa: el yoga y el pilates dan movilidad pero poca fuerza máxima',
    warmup: [],
  },
  {
    id: 'senderismo',
    name: 'el senderismo',
    terms: ['senderismo', 'montana', 'caminar', 'andar', 'excursion', 'hiking'],
    muscleGroups: ['piernas', 'gluteos'],
    jumps: false,
    summary: 'Caminar horas con desnivel: carga piernas y glúteos, sobre todo bajando.',
    gymFocus: 'fuerza de piernas (las bajadas piden cuádriceps) y tobillos estables',
    warmup: ['tobillo-pared', 'estiramiento-flexor-cadera'],
  },
  {
    id: 'esqui',
    name: 'el esquí',
    terms: ['esqui', 'snowboard', 'snow'],
    muscleGroups: ['piernas', 'gluteos', 'core'],
    jumps: false,
    summary: 'Horas en flexión de piernas con giros: carga cuádriceps, glúteos y core.',
    gymFocus: 'fuerza y resistencia de piernas y rodillas estables',
    warmup: ['equilibrio-una-pierna', 'rotacion-toracica'],
  },
  {
    id: 'surf',
    name: 'el surf',
    terms: ['surf', 'bodyboard', 'paddle'],
    muscleGroups: ['espalda', 'hombros', 'core'],
    jumps: false,
    summary: 'Remar tumbado y levantarse en la tabla: carga espalda, hombros y core.',
    gymFocus: 'hombros estables, empuje para equilibrar el remado y piernas para la tabla',
    warmup: ['angeles-pared', 'rotacion-toracica'],
  },
  {
    id: 'patinaje',
    name: 'el patinaje',
    terms: ['patinaje', 'patinar', 'patines', 'hockey', 'skate'],
    muscleGroups: ['piernas', 'gluteos', 'core'],
    jumps: false,
    summary: 'Empujes laterales en flexión: carga piernas, glúteos (sobre todo el lateral) y core.',
    gymFocus: 'fuerza a una pierna, glúteo medio y equilibrio',
    warmup: ['equilibrio-una-pierna', 'estiramiento-flexor-cadera'],
  },
  {
    id: 'crossfit',
    name: 'el CrossFit',
    terms: ['crossfit', 'hyrox', 'funcional'],
    muscleGroups: ['piernas', 'gluteos', 'espalda', 'hombros', 'brazos', 'core'],
    jumps: true,
    summary: 'Fuerza y resistencia mezcladas: carga todo el cuerpo.',
    gymFocus: 'técnica y lo que el box trabaje menos; ojo con sumar mucho volumen encima',
    warmup: ['angeles-pared', 'tobillo-pared'],
  },
  {
    id: 'golf',
    name: 'el golf',
    terms: ['golf'],
    muscleGroups: ['core'],
    jumps: false,
    summary: 'Rotación explosiva del tronco y mucho caminar: carga sobre todo core y espalda baja.',
    gymFocus: 'rotación de tronco, cadera móvil y glúteos fuertes',
    warmup: ['rotacion-toracica', 'estiramiento-flexor-cadera'],
  },
]

/** Sin tildes ni mayúsculas, con espacios simples. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * El deporte que nombra una actividad («Fútbol sala», «Partido de baloncesto»,
 * «Natación los martes»), o `null` si AXIS no lo conoce. Gana el primer término
 * que empieza una palabra del nombre, en el orden de la lista.
 */
export function sportProfileFor(name: string): SportProfile | null {
  const words = ` ${normalize(name)}`
  for (const profile of SPORT_PROFILES) {
    if (profile.terms.some((term) => words.includes(` ${term}`))) return profile
  }
  return null
}

/** «piernas, glúteos y core», en minúsculas. */
export function describeSportMuscles(groups: readonly string[]): string {
  return listNames(
    groups.map((group) => (group in MUSCLE_GROUP_LABELS ? MUSCLE_GROUP_LABELS[group as MuscleGroup] : group).toLowerCase()),
  )
}
