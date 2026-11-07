'use client'

import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from 'react'
import { ArrowLeft, ArrowUp, ArrowUpRight, Check, Trash2 } from 'lucide-react'
import { AxisBadge, AxisSymbol } from '@/components/axis-symbol'
import { EmptyNote } from '@/components/section-header'
import type { AxisActionProposal } from '@/lib/domain/axis/actions'
import { useAxtlhetics } from '@/lib/state/store'
import { cn } from '@/lib/utils'

/**
 * Conversación con AXIS.
 *
 * Pantalla interna, no una pestaña. AXIS responde desde el mismo briefing que
 * alimenta Inicio, así que aquí no puede decir nada distinto de lo que muestra la
 * recomendación del día.
 */
export function AxisChatScreen({ onClose }: { onClose: () => void }) {
  const {
    axisMessages,
    axisStatus,
    axisError,
    axisFallback,
    axisSuggestions,
    askAxis,
    briefing,
    axisNote,
    clearAxisConversation,
  } = useAxtlhetics()

  const [draft, setDraft] = useState('')
  // Borrar pide un segundo toque, como en Mentax (D-094): sin diálogos del sistema.
  const [confirmClear, setConfirmClear] = useState(false)
  const endRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  const thinking = axisStatus === 'thinking'
  const isEmpty = axisMessages.length === 0
  const lastMessage = axisMessages[axisMessages.length - 1]
  const lastFollowUps = lastMessage?.role === 'axis' && !lastMessage.action ? (lastMessage.followUps ?? []) : []

  // Al llegar un mensaje, la conversación se desplaza a lo último escrito.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [axisMessages.length, thinking])

  const send = async (question: string) => {
    if (thinking || question.trim().length === 0) return
    setDraft('')
    await askAxis(question)
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    void send(draft)
  }

  // Intro envía; Mayús+Intro, salto de línea (D-094).
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void send(draft)
    }
  }

  // El campo crece con lo escrito, hasta unas cinco líneas.
  useEffect(() => {
    const input = inputRef.current
    if (!input) return
    input.style.height = 'auto'
    input.style.height = `${Math.min(input.scrollHeight, 128)}px`
  }, [draft])

  const clear = () => {
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }
    clearAxisConversation()
    setConfirmClear(false)
  }

  return (
    <div className="flex flex-1 flex-col px-5">
      {/* Header */}
      <header className="flex items-center justify-between pt-2 pb-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="Volver"
          className="ax-press -ml-2 flex h-11 w-11 items-center justify-center"
        >
          <ArrowLeft className="h-[22px] w-[22px] text-foreground" strokeWidth={1.75} />
        </button>
        <div className="flex flex-1 flex-col items-center">
          <div className="flex items-center gap-2">
            <AxisBadge size="sm" />
            <h1 className="text-callout font-extrabold tracking-[0.08em]">AXIS</h1>
          </div>
          <p className="text-overline text-muted-foreground">
            Tu guía de entrenamiento y recuperación
          </p>
        </div>
        {/* Borrar la conversación (D-094): un toque lo pregunta, el segundo borra. Lo decidido hoy se conserva. */}
        {isEmpty ? (
          <span className="h-11 w-11" aria-hidden="true" />
        ) : (
          <button
            type="button"
            onClick={clear}
            onBlur={() => setConfirmClear(false)}
            aria-label={confirmClear ? 'Pulsa otra vez para borrar la conversación' : 'Borrar conversación'}
            className={cn(
              'ax-press -mr-2 flex h-11 min-w-11 items-center justify-center rounded-full px-2',
              confirmClear ? 'text-footnote font-semibold text-error' : 'text-muted-foreground',
            )}
          >
            {confirmClear ? '¿Borrar?' : <Trash2 className="h-[18px] w-[18px]" strokeWidth={1.75} />}
          </button>
        )}
      </header>

      {/* Conversación vacía: quién es AXIS y qué se le puede preguntar */}
      {isEmpty && (
        <div className="ax-enter flex flex-1 flex-col justify-center py-6">
          {/* El símbolo de AXIS sobre su recuadro de tinta (D-077), la misma firma que en Inicio. */}
          <AxisBadge size="lg" />
          <h2 className="mt-6 text-title-lg font-extrabold text-balance">Pregúntame por tu día.</h2>
          <p className="mt-3 text-callout text-muted-foreground text-pretty">
            Respondo con tus datos: tu recuperación, tu historial, tu calendario y la
            sesión que te he propuesto. Si no tengo un dato, te lo digo.
          </p>

          {/* Lo que AXIS quería decirte (D-038): el punto de partida de la conversación. */}
          {axisNote && (
            <p className="mt-5 flex items-start gap-3 rounded-2xl border border-border bg-axis-soft p-4 text-subhead text-foreground/85 text-pretty">
              <AxisBadge size="sm" />
              <span>{axisNote.text}</span>
            </p>
          )}

          {axisSuggestions.length > 0 && (
            <ul className="mt-7 overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
              {axisSuggestions.map((suggestion, index) => (
                <li
                  key={suggestion.question}
                  className="ax-stagger border-b border-border last:border-b-0"
                  style={{ '--ax-index': index } as CSSProperties}
                >
                  <button
                    type="button"
                    onClick={() => void send(suggestion.question)}
                    className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left text-callout font-medium transition-colors duration-150 active:bg-fill"
                  >
                    <span className="flex-1">{suggestion.label}</span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-nontext" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!briefing && (
            <EmptyNote className="mt-7">Todavía estoy cargando tus datos.</EmptyNote>
          )}
        </div>
      )}

      {/*
        Mensajes, como en el resto del ecosistema AXIS (D-094): lo tuyo, en una
        burbuja a la derecha; lo de AXIS, con su símbolo y en párrafos, sin burbuja,
        y debajo quién lo escribió.
      */}
      {!isEmpty && (
        <div className="flex-1 space-y-5 py-2">
          {axisMessages.map((message) =>
            message.role === 'user' ? (
              <div key={message.id} className="ax-enter flex justify-end">
                <p className="max-w-[85%] whitespace-pre-line rounded-3xl rounded-br-lg bg-surface px-4 py-3 text-callout text-foreground text-pretty">
                  {message.text}
                </p>
              </div>
            ) : (
              <div key={message.id} className="ax-enter flex gap-3">
                <AxisBadge size="md" className="shrink-0" />
                <div className="min-w-0 flex-1 pt-0.5">
                  <Paragraphs text={message.text} />
                  {message.source && (
                    <p className="mt-2">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-caption font-semibold',
                          message.source === 'ia' ? 'bg-axis-soft text-primary' : 'bg-surface text-muted-foreground',
                        )}
                      >
                        {message.source === 'ia' ? 'IA' : 'Directa'}
                      </span>
                    </p>
                  )}
                  {message.action && <ActionCard action={message.action} />}
                </div>
              </div>
            ),
          )}

          {/* Lo que podría preguntar a continuación (D-070): solo bajo la última respuesta de AXIS. */}
          {!thinking && lastFollowUps.length > 0 && (
            <div className="ax-enter flex flex-wrap gap-2 pl-10">
              {lastFollowUps.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => void send(question)}
                  className="ax-press min-h-10 rounded-full border border-secondary bg-background px-4 text-left text-footnote font-medium text-primary"
                >
                  {question}
                </button>
              ))}
            </div>
          )}

          {thinking && <ThinkingBubble />}

          {axisError && (
            <div className="ax-enter rounded-2xl bg-surface shadow-card p-4">
              <p className="text-subhead font-medium">AXIS no ha podido responder.</p>
              <p className="mt-1 text-footnote text-muted-foreground">{axisError}</p>
            </div>
          )}

          <div ref={endRef} />
        </div>
      )}

      {/* Sin conexión se dice; si no, ya lo dice cada respuesta («IA» o «Directa», D-094). */}
      {axisFallback === 'offline' && (
        <p className="pb-2 text-center text-caption text-muted-foreground">
          Sin conexión: respondo con tus datos locales.
        </p>
      )}

      {/*
        Input. Pegado abajo aunque la conversación sea corta o larga; el campo y
        el botón de enviar van dentro de la misma pastilla.
      */}
      <form onSubmit={onSubmit} className="sticky bottom-0 -mx-5 bg-background px-5 pt-2 pb-4">
        {/* Varias líneas si hace falta (D-094), como en Finax y Mentax. */}
        <div className="flex items-end gap-2 rounded-3xl border border-transparent bg-surface py-1.5 pr-1.5 pl-5 transition-colors focus-within:border-primary/40">
          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Escribe a AXIS…"
            aria-label="Escribe tu mensaje"
            enterKeyHint="send"
            className="max-h-32 min-h-11 min-w-0 flex-1 resize-none bg-transparent py-2.5 text-callout leading-snug outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={thinking || draft.trim().length === 0}
            aria-label="Enviar"
            className="ax-press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity duration-200 disabled:opacity-30"
          >
            <ArrowUp className="h-5 w-5" strokeWidth={2.25} />
          </button>
        </div>
        <p className="mt-2 text-center text-caption text-muted-foreground">
          AXIS es una IA de apoyo: puede equivocarse y no sustituye a un médico.
        </p>
      </form>
    </div>
  )
}

/**
 * La acción propuesta, dentro del propio mensaje.
 *
 * Es el único punto desde el que la conversación puede cambiar el estado real de
 * la aplicación, y hace falta pulsarlo: hasta entonces no se ha tocado nada, por
 * mucho que la conversación haya llegado a un acuerdo.
 *
 * Una vez aplicada queda deshabilitada, para que la misma acción no pueda
 * ejecutarse dos veces.
 */
function ActionCard({ action }: { action: AxisActionProposal }) {
  const { axisActionStatuses, confirmAxisAction, cancelAxisAction, canUndoAxisAction, undoAxisAction } =
    useAxtlhetics()
  const [working, setWorking] = useState(false)
  const [undoError, setUndoError] = useState<string | null>(null)

  const status = axisActionStatuses[action.id] ?? { state: 'pending' as const }

  if (status.state === 'applied') {
    // Solo la última acción del día, y solo antes de empezar a entrenar (D-022).
    const undoable = canUndoAxisAction(action.id)
    return (
      <div className="ax-enter mt-2">
        <p className="flex min-h-11 items-center gap-2 rounded-full bg-success/10 px-4 text-subhead font-semibold text-success">
          <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} />
          Cambio aplicado
        </p>
        {undoable && (
          <button
            type="button"
            disabled={working}
            onClick={async () => {
              setWorking(true)
              setUndoError(await undoAxisAction(action))
              setWorking(false)
            }}
            className="ax-press mt-1 min-h-11 px-1 text-footnote font-semibold text-muted-foreground disabled:opacity-50"
          >
            {working ? 'Deshaciendo…' : 'Deshacer cambio'}
          </button>
        )}
        {undoError && <p className="ax-enter px-1 text-footnote text-error">{undoError}</p>}
      </div>
    )
  }

  if (status.state === 'undone') {
    return (
      <p className="mt-2 px-1 text-footnote text-muted-foreground">
        Cambio deshecho: todo vuelve a como estaba.
      </p>
    )
  }

  if (status.state === 'cancelled') {
    return (
      <p className="mt-2 px-1 text-footnote text-muted-foreground">
        No se ha cambiado nada.
      </p>
    )
  }

  // Otra propuesta se aplicó después: esta partía de una sesión que ya no es la que hay.
  if (status.state === 'superseded') {
    return (
      <p className="mt-2 px-1 text-footnote text-muted-foreground">
        Ya aplicaste otro cambio después de esta propuesta.
      </p>
    )
  }

  return (
    <div className="mt-2">
      <p className="px-1 text-footnote text-muted-foreground">{action.summary}</p>

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={working}
          onClick={async () => {
            setWorking(true)
            await confirmAxisAction(action)
            setWorking(false)
          }}
          className="ax-press flex h-12 flex-1 items-center justify-center rounded-full bg-primary px-4 text-subhead font-semibold text-primary-foreground disabled:opacity-50"
        >
          {working ? 'Aplicando…' : action.label}
        </button>
        <button
          type="button"
          onClick={() => cancelAxisAction(action)}
          disabled={working}
          className="ax-press h-12 rounded-full bg-surface px-5 text-subhead font-medium text-muted-foreground disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>

      {status.state === 'error' && (
        <p className="ax-enter mt-2 px-1 text-footnote text-error">{status.message}</p>
      )}
    </div>
  )
}

/** Estado de espera: el símbolo de AXIS gira despacio, como en la app AXIS (D-080), donde iría su respuesta. */
function ThinkingBubble() {
  return (
    <div className="ax-enter flex items-center gap-3 text-subhead text-muted-foreground" role="status">
      <AxisSymbol className="ax-spin h-7 w-7" />
      Pensando…
    </div>
  )
}

/** Lo que escribe AXIS, en párrafos (D-094): la IA los separa con una línea en blanco. */
function Paragraphs({ text }: { text: string }) {
  return (
    <div className="space-y-2.5">
      {text.split(/\n{2,}/).map((paragraph, index) => (
        <p key={index} className="whitespace-pre-line text-callout leading-relaxed text-foreground text-pretty">
          {paragraph}
        </p>
      ))}
    </div>
  )
}
