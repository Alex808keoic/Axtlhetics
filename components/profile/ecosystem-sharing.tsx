'use client'

import { useEffect, useState } from 'react'
import { ArrowUpRight, Cloud, CloudOff, LogOut, RefreshCw, Share2, Unlink } from 'lucide-react'
import { AXIS_URL } from '@/lib/ecosystem/ecosystem-client'
import { MultiChoiceGroup, SectionTitle } from '@/components/profile/controls'
import { AXTHLETICS_METRICS, DEFAULT_METRICS, METRIC_LABELS, type AxthleticsMetric } from '@/lib/domain/ecosystem/sharing'
import { useEcosystem } from '@/lib/ecosystem/use-ecosystem'
import { useAxtlhetics } from '@/lib/state/store'

const METRIC_OPTIONS = AXTHLETICS_METRICS.map((value) => ({ value, label: METRIC_LABELS[value] }))

const time = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' })

const pill =
  'ax-press flex min-h-11 items-center justify-center gap-2 rounded-full bg-surface px-4 text-subhead font-semibold disabled:opacity-40'

/**
 * Ecosistema AXIS (D-076): iniciar sesión con Google, la copia en la nube (D-081:
 * tus datos en cualquier móvil con la misma cuenta) y qué resumen semanal se
 * comparte con la app AXIS. Sin entrar, nada sale del dispositivo, y AXTHLETICS
 * funciona igual.
 */
export function EcosystemSharing() {
  const { profile } = useAxtlhetics()
  const { account, lastSentAt, failed, signIn, share, stopSharing, signOut, cloud } = useEcosystem()
  const [confirmRemove, setConfirmRemove] = useState(false)
  const sharing = profile?.ecosystem ?? null
  const [metrics, setMetrics] = useState<AxthleticsMetric[]>(sharing?.metrics ?? [...DEFAULT_METRICS])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const sharingKey = sharing?.metrics.join(',')
  useEffect(() => {
    if (sharing) setMetrics(sharing.metrics)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharingKey])

  const run = async (action: () => Promise<string | null>) => {
    setBusy(true)
    setMessage(null)
    const result = await action()
    setBusy(false)
    if (result) setMessage(result)
  }

  const toggle = (metric: AxthleticsMetric) =>
    setMetrics((current) => (current.includes(metric) ? current.filter((m) => m !== metric) : AXTHLETICS_METRICS.filter((m) => m === metric || current.includes(m))))

  const cloudStatus = cloud.failed
    ? 'No he podido sincronizar ahora. Lo intento otra vez en un momento.'
    : cloud.syncing
      ? 'Sincronizando…'
      : cloud.lastSyncAt
        ? `Al día. Última vez a las ${time.format(new Date(cloud.lastSyncAt))}.`
        : 'Tus datos se guardan en tu cuenta y aparecen en cualquier móvil donde entres con ella. Las fotos de los escáneres se quedan en este móvil.'

  const changed = sharing !== null && sharing.metrics.join(',') !== metrics.join(',')

  return (
    <>
      <SectionTitle>Ecosistema AXIS</SectionTitle>
      <p className="mt-1 text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">AXTHLETICS es parte del ecosistema AXIS</p>
      <p className="mt-1 text-footnote leading-relaxed text-muted-foreground text-pretty">
        AXIS es también la app que une AXTHLETICS con Finax y Mentax. Si quieres, le mandas un resumen de cada semana: solo
        números por semana, nunca tus series, notas, fotos ni lo que hablas aquí con AXIS.
      </p>

      {account.status === 'checking' && <p className="mt-3 text-footnote text-muted-foreground">Comprobando la conexión…</p>}

      {account.status === 'signedOut' && (
        <>
          {sharing && (
            <p className="mt-3 text-footnote leading-relaxed text-muted-foreground text-pretty">
              Compartías con AXIS, pero has cerrado la sesión. Vuelve a entrar con la misma cuenta para seguir enviando.
            </p>
          )}
          <button type="button" onClick={() => void run(signIn)} disabled={busy} className={`${pill} mt-3 w-full text-primary`}>
            Entrar con Google
          </button>
          <p className="mt-2 text-caption leading-relaxed text-muted-foreground text-pretty">
            Al entrar, tus datos se guardan también en tu cuenta para tenerlos en cualquier móvil. Usa la misma cuenta de Google en todas las apps: así se conectan solas.
          </p>
        </>
      )}

      {account.status === 'signedIn' && (
        <>
          <p className="mt-3 text-footnote text-muted-foreground">
            Conectado como <span className="font-medium text-foreground">{account.email ?? 'tu cuenta de Google'}</span>
          </p>

          {cloud.enabled ? (
            <>
              <p className="mt-3 text-footnote leading-relaxed text-muted-foreground text-pretty">
                <span className="font-semibold text-foreground">Copia en la nube activada.</span> {cloudStatus}
              </p>
              {!confirmRemove ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => void cloud.syncNow()} disabled={busy || cloud.syncing} className={`${pill} text-primary`}>
                    <RefreshCw className="h-4 w-4" strokeWidth={2} />
                    Sincronizar
                  </button>
                  <button type="button" onClick={() => setConfirmRemove(true)} disabled={busy} className={`${pill} text-muted-foreground`}>
                    <CloudOff className="h-4 w-4" strokeWidth={2} />
                    Borrar copia
                  </button>
                </div>
              ) : (
                <div className="ax-enter mt-3">
                  <p className="text-footnote leading-relaxed text-pretty">
                    Se borran tus datos de AXTHLETICS de la nube y este móvil deja de sincronizar. En este móvil no se toca nada.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setConfirmRemove(false)} disabled={busy} className={`${pill} text-muted-foreground`}>
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void run(async () => {
                          setConfirmRemove(false)
                          return (await cloud.removeCloudCopy()) ? 'Copia de la nube borrada. Este móvil ya no sincroniza.' : 'No he podido borrarla. Inténtalo con conexión.'
                        })
                      }
                      disabled={busy}
                      className={`${pill} text-error`}
                    >
                      <CloudOff className="h-4 w-4" strokeWidth={2} />
                      Borrar
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <button type="button" onClick={() => void cloud.enable()} disabled={busy} className={`${pill} mt-3 w-full text-primary`}>
              <Cloud className="h-4 w-4" strokeWidth={2} />
              Activar copia en la nube
            </button>
          )}

          <MultiChoiceGroup
            label="Qué compartes cada semana"
            hint="El peso no va salvo que lo actives."
            options={METRIC_OPTIONS}
            value={metrics}
            onToggle={toggle}
          />

          {sharing && !changed && (
            <p className="text-footnote leading-relaxed text-muted-foreground text-pretty">
              {failed
                ? 'No he podido enviar el último resumen. Lo vuelvo a intentar yo solo.'
                : lastSentAt
                  ? `Compartiendo. Último envío a las ${time.format(new Date(lastSentAt))}.`
                  : 'Compartiendo. El resumen se envía solo mientras usas la app.'}
            </p>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            {(!sharing || changed) && (
              <button
                type="button"
                onClick={() => void run(async () => ((await share(metrics)) ? null : 'Guardado, pero no he podido enviarlo ahora. Lo intento al volver a abrir.'))}
                disabled={busy || metrics.length === 0}
                className={`${pill} col-span-2 text-primary`}
              >
                <Share2 className="h-4 w-4" strokeWidth={2} />
                {sharing ? 'Guardar cambios' : 'Compartir con AXIS'}
              </button>
            )}
            {sharing && (
              <button
                type="button"
                onClick={() => void run(async () => ((await stopSharing()) ? 'Has dejado de compartir. AXIS ha borrado lo que recibió.' : 'No he podido dejar de compartir. Inténtalo con conexión.'))}
                disabled={busy}
                className={`${pill} text-muted-foreground`}
              >
                <Unlink className="h-4 w-4" strokeWidth={2} />
                Dejar de compartir
              </button>
            )}
            <button
              type="button"
              onClick={() => void run(async () => (await signOut(), null))}
              disabled={busy}
              className={`${pill} text-muted-foreground ${sharing ? '' : 'col-span-2'}`}
            >
              <LogOut className="h-4 w-4" strokeWidth={2} />
              Cerrar sesión
            </button>
          </div>
        </>
      )}

      {message && <p className="mt-3 text-footnote leading-relaxed text-muted-foreground text-pretty">{message}</p>}

      {/* De vuelta al centro del ecosistema (D-078). */}
      <a href={AXIS_URL} target="_blank" rel="noopener noreferrer" className={`${pill} mt-3 w-full text-foreground`}>
        Abrir AXIS
        <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
      </a>
    </>
  )
}
