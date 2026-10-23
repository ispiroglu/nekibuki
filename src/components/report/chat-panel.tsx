import type { Analysis, ChatMessage } from '@shared/types'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowUp, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { askGuide, askGuideForAnalysis, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useRepository } from '@/hooks/use-history'
import { haptic } from '@/lib/haptics'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/app'
import { usePreferences } from '@/store/preferences'
import { useT } from '@/lib/ui-language'

export function ChatPanel({
  analysis,
  onUpdate,
}: {
  analysis: Analysis
  onUpdate?: (analysis: Analysis) => void
}) {
  const repository = useRepository()
  const { mode, signIn } = useAuth()
  const bumpHistory = useAppStore((state) => state.bumpHistory)
  const hapticsEnabled = usePreferences((state) => state.haptics)
  const t = useT()
  const reduceMotion = useReducedMotion()
  const [messages, setMessages] = useState<ChatMessage[]>(analysis.messages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState<{
    id: string
    question: string
    message: string
    expiredSession: boolean
  } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setMessages(analysis.messages)
    setFailed(null)
  }, [analysis.id, analysis.messages])

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: reduceMotion ? 'auto' : 'smooth',
    })
  }, [messages, sending, reduceMotion])

  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus(), 350)
    return () => window.clearTimeout(timer)
  }, [analysis.id])

  const send = async (text: string, retryId?: string) => {
    const question = text.trim()
    if (!question || sending) return

    haptic('light', hapticsEnabled)
    setFailed(null)
    const retried = retryId ? messages.find((message) => message.id === retryId) : undefined
    const previous = retried
      ? messages.filter((message) => message.id !== retried.id)
      : messages
    const userMessage: ChatMessage = {
      id: retried?.id ?? crypto.randomUUID(),
      role: 'user',
      content: question,
      createdAt: retried?.createdAt ?? Date.now(),
    }
    const withUser = [...previous, userMessage]
    setMessages(withUser)
    setInput('')
    setSending(true)

    try {
      if (mode === 'google') {
        // The Worker owns the photo, the report and the transcript; it appends
        // both messages and returns the whole analysis.
        const updated = await askGuideForAnalysis({
          analysisId: analysis.id,
          question,
        })
        setMessages(updated.messages)
        setFailed(null)
        onUpdate?.(updated)
        bumpHistory()
      } else {
        const answer = await askGuide({
          report: analysis.report,
          messages: previous,
          question,
          language: analysis.language,
        })
        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: answer,
          createdAt: Date.now(),
        }
        const final = [...withUser, assistantMessage]
        setMessages(final)
        setFailed(null)
        try {
          await repository?.updateMessages(analysis.id, final)
          bumpHistory()
        } catch {
          toast.error(t('The answer could not be saved.', 'Cevap kaydedilemedi.'))
        }
      }
    } catch (error) {
      setMessages(withUser)
      const failure = error instanceof ApiError ? error : null
      // The server names the cause; the bubble repeats it instead of guessing.
      setFailed({
        id: userMessage.id,
        question,
        message: failure?.message ?? t('The guide could not answer.', 'Rehber cevap veremedi.'),
        expiredSession: failure?.isAuthFailure ?? false,
      })
      toast.error(failure?.message ?? t('The guide could not answer.', 'Rehber cevap veremedi.'))
    } finally {
      setSending(false)
    }
  }

  /** Signs the traveller back in and asks the same question again. */
  const signInAndRetry = async () => {
    if (!failed) return
    try {
      await signIn()
    } catch {
      toast.error(t('Signing in did not work. Please try again.', 'Giriş yapılamadı. Lütfen tekrar dene.'))
      return
    }
    await send(failed.question, failed.id)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        className="min-h-0 flex-1 select-text overflow-y-auto px-5 py-4"
      >
        <div className="mx-auto w-full max-w-2xl space-y-4">
          {messages.length === 0 && (
            <div className="space-y-4 py-2 text-center">
              <div className="mx-auto grid size-12 place-items-center rounded-full bg-secondary text-brand-ink">
                <Sparkles className="size-5" />
              </div>
              <p className="mx-auto max-w-[19rem] text-body leading-relaxed text-muted-foreground">
                {t(
                  `Ask anything about ${analysis.report.title}. I know the details in your photo.`,
                  `${analysis.report.title} hakkında ne istersen sor. Fotoğrafındaki ayrıntıları biliyorum.`,
                )}
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                {analysis.report.suggestedQuestions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => void send(question)}
                    className="rounded-full bg-secondary px-3.5 py-2 text-list text-foreground transition-transform duration-150 ease-out active:scale-[0.97]"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduceMotion ? { duration: 0 } : { type: 'spring', bounce: 0, duration: 0.4 }
              }
              className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <span className="sr-only">
                {message.role === 'user' ? t('You asked', 'Sen sordun') : t('Nekibuki answered', 'Nekibuki cevapladı')}
              </span>
              {message.role === 'user' ? (
                <div className="ml-auto w-fit max-w-[80%] rounded-3xl rounded-br-lg bg-primary px-4 py-2.5 text-body leading-relaxed break-words text-primary-foreground">
                  {message.content}
                </div>
              ) : (
                <p className="max-w-[88%] font-serif text-reading leading-relaxed">
                  {message.content}
                </p>
              )}
            </motion.div>
          ))}

          {failed && (
            <div className="flex justify-end">
              <div className="flex w-fit max-w-[80%] flex-col items-end gap-1 rounded-2xl bg-secondary px-3.5 py-2 text-body text-foreground/70">
                <span>{failed.message}</span>
                {failed.expiredSession ? (
                  <button
                    type="button"
                    onClick={() => void signInAndRetry()}
                    className="font-medium text-ui text-brand-ink underline-offset-2 active:underline"
                  >
                    {t('Sign in again', 'Tekrar giriş yap')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void send(failed.question, failed.id)}
                    className="font-medium text-ui text-brand-ink underline-offset-2 active:underline"
                  >
                    {t('Try again', 'Tekrar dene')}
                  </button>
                )}
              </div>
            </div>
          )}

          {sending && (
            <div role="status" aria-atomic="true" className="flex justify-start">
              <span className="sr-only">{t('Thinking…', 'Düşünüyor…')}</span>
              <div aria-hidden className="flex items-center gap-1 py-2">
                {[0, 1, 2].map((dot) => (
                  <motion.span
                    key={dot}
                    className="size-1.5 rounded-full bg-brand"
                    animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
                    transition={{ duration: 1, repeat: Infinity, delay: dot * 0.16 }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="glass scroll-fade-b px-3 pt-3 safe-bottom">
        <div className="mx-auto flex w-full max-w-2xl items-end gap-2 rounded-3xl bg-card p-1 shadow-sm">
          <textarea
            ref={inputRef}
            value={input}
            data-no-swipe
            rows={1}
            onChange={(event) => {
              setInput(event.target.value)
              setFailed(null)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void send(input)
              }
            }}
            placeholder={t(`Ask about ${analysis.report.title}…`, `${analysis.report.title} hakkında sor…`)}
            aria-label={t('Ask about this place', 'Bu yer hakkında sor')}
            className="field-sizing-content max-h-32 min-h-10 flex-1 resize-none bg-transparent py-2.5 pl-3 text-[16px] leading-snug outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={() => void send(input)}
            disabled={!input.trim() || sending}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-brand-fg transition-transform duration-150 ease-out active:scale-95 disabled:opacity-40"
            aria-label={t('Send', 'Gönder')}
          >
            <ArrowUp className="size-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
